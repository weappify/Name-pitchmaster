import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldSetupPreviewModal } from '@/components/FieldSetupPreviewModal';
import { useFieldMarkers } from '@/context/FieldMarkersContext';
import { useTeams } from '@/context/TeamsContext';
import { ADMIN_EMAIL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  DATABASE_SETUP_INCOMPLETE_MESSAGE,
  getFriendlySupabaseErrorMessage,
} from '@/lib/supabaseErrors';
import {
  deleteFieldSetup,
  duplicateFieldSetup,
  getAllFieldSetups,
} from '@/storage/fieldStorage';
import { getAllNotes } from '@/storage/noteStorage';
import type { FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';

type DashboardItem = {
  setup: FieldSetup;
  linkedNote: NoteItem | null;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { loadFieldSetup } = useFieldMarkers();
  const { getPlayersForTeam, getTeamName } = useTeams();
  const isWide = width >= 980;
  const isMedium = width >= 760;
  const contentGap = isWide ? 22 : 16;
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewSetupId, setPreviewSetupId] = useState<string | null>(null);
  const [isAllFieldsVisible, setIsAllFieldsVisible] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setIsLoadingDashboard(true);
      const [setups, notes] = await Promise.all([getAllFieldSetups(), getAllNotes()]);
      const nextDashboardItems = setups.map((setup) => ({
        setup,
        linkedNote: notes.find((note) => note.linkedFieldSetupId === setup.id) ?? null,
      }));

      setDashboardItems(nextDashboardItems);
      setSelectedFieldId((currentId) => {
        if (currentId && nextDashboardItems.some((item) => item.setup.id === currentId)) {
          return currentId;
        }

        return null;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? getFriendlySupabaseErrorMessage(error, 'Unable to load your field plans right now.')
          : 'Unable to load your field plans right now.';

      Alert.alert(
        message === DATABASE_SETUP_INCOMPLETE_MESSAGE ? 'Database setup incomplete' : 'Fields unavailable',
        message
      );
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard])
  );

  const selectedItem = useMemo(
    () => dashboardItems.find((item) => item.setup.id === selectedFieldId) ?? null,
    [dashboardItems, selectedFieldId]
  );
  const previewItem = useMemo(
    () => dashboardItems.find((item) => item.setup.id === previewSetupId) ?? null,
    [dashboardItems, previewSetupId]
  );
  const selectedTeamName = getTeamName(selectedItem?.setup.teamId ?? null);
  const selectedPlayers = getPlayersForTeam(selectedItem?.setup.teamId ?? null);
  const recentItems = dashboardItems;
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const handleOpenPreview = (setupId: string) => {
    setPreviewSetupId(setupId);
  };

  const handleOpenPreviewFromAllFields = (setupId: string) => {
    setIsAllFieldsVisible(false);
    handleOpenPreview(setupId);
  };

  const handleLoadPreviewSetup = () => {
    if (!previewItem) {
      return;
    }

    loadFieldSetup(previewItem.setup);
    setPreviewSetupId(null);
    router.push('/field');
  };

  const handleDuplicatePreviewSetup = async () => {
    if (!previewItem) {
      return;
    }

    try {
      await duplicateFieldSetup(previewItem.setup.id);
      await refreshDashboard();
    } catch (error) {
      Alert.alert(
        'Duplicate failed',
        error instanceof Error ? error.message : 'Unable to duplicate this field right now.'
      );
    }
  };

  const handleDeletePreviewSetup = async () => {
    if (!previewItem) {
      return;
    }

    Alert.alert('Delete Field', 'Are you sure you want to delete this field?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteFieldSetup(previewItem.setup.id);
              setPreviewSetupId(null);
              await refreshDashboard();
            } catch (error) {
              Alert.alert(
                'Delete failed',
                error instanceof Error ? error.message : 'Unable to delete this field right now.'
              );
            }
          })();
        },
      },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={() => setSelectedFieldId(null)} accessible={false}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}>
        <View
          style={[
            styles.contentShell,
            {
              paddingHorizontal: isWide ? 22 : 14,
              gap: contentGap,
            },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBlock}>
              {isAdmin ? <Text style={styles.adminModeLabel}>ADMIN MODE</Text> : null}
              <Text style={styles.headerTitle}>Tactical Command</Text>
              <View style={styles.headerTabs}>
                <HeaderTab label="Match Analysis" active />
                <HeaderTab label="Live Tracking" />
              </View>
            </View>
          </View>

          <View style={styles.dashboardBody}>
            <View style={[styles.mainColumn, { gap: contentGap }]}>
              <View style={styles.heroCard}>
                <View style={styles.heroGlow} />
                <View style={styles.heroPitchStripe} />
                <View style={styles.heroContent}>
                  <View style={styles.phasePill}>
                    <Text style={styles.phasePillText}>ORGANIZE YOUR PLANS</Text>
                  </View>
                  <Text style={styles.heroTitle}>Field Planning Hub</Text>
                  <Text style={styles.heroDescription}>
                    Create, organize, and review field setups, linked notes, and team plans in
                    one place.
                  </Text>
                  <Pressable
                    style={styles.heroButton}
                    onPress={() => router.push('/field?createField=1')}>
                    <Text style={styles.heroButtonText}>Create New Field</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.recentFieldsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Fields</Text>
                  <Pressable onPress={() => setIsAllFieldsVisible(true)}>
                    <Text style={styles.sectionLink}>View All Fields</Text>
                  </Pressable>
                </View>

                <View style={styles.recentFieldsScrollArea}>
                  <ScrollView
                    style={styles.recentFieldsScroll}
                    contentContainerStyle={styles.recentFieldsScrollContent}
                    showsVerticalScrollIndicator>
                    <View style={[styles.setupRow, !isMedium && styles.setupRowStacked]}>
                      {recentItems.length === 0 ? (
                        <View style={[styles.setupCard, styles.emptySetupCard]}>
                          <Text style={styles.setupCardTitle}>
                            {isLoadingDashboard ? 'Loading fields...' : 'No saved setups yet'}
                          </Text>
                          <Text style={styles.emptyPanelText}>
                            {isLoadingDashboard
                              ? 'Fetching your saved field plans.'
                              : 'Save a field setup to see it appear here.'}
                          </Text>
                        </View>
                      ) : (
                        recentItems.map((item, index) => (
                          <SetupCard
                            key={item.setup.id}
                            item={item}
                            teamName={getTeamName(item.setup.teamId ?? null)}
                            selected={item.setup.id === selectedFieldId}
                            isStacked={!isMedium}
                            variant={SETUP_CARD_VARIANTS[index % SETUP_CARD_VARIANTS.length]}
                            expandedNoteId={expandedNoteId}
                            onToggleNote={(noteId) =>
                              setExpandedNoteId((currentId) =>
                                currentId === noteId ? null : noteId
                              )
                            }
                            onLongPress={() => setSelectedFieldId(item.setup.id)}
                            onPress={() => handleOpenPreview(item.setup.id)}
                          />
                        ))
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={[styles.sideColumn, { gap: contentGap }]}>
              <View style={styles.metricCard}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Selected Setup</Text>
                </View>
                {selectedItem ? (
                  <View style={styles.selectionDetails}>
                    <Text style={styles.selectedSetupName}>{selectedItem.setup.name}</Text>
                    {selectedTeamName ? (
                      <Text style={styles.selectedSetupTeam}>Team: {selectedTeamName}</Text>
                    ) : null}
                    <Text style={styles.selectedSetupMeta}>
                      Updated {formatTimestamp(selectedItem.setup.updatedAt)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyPanelText}>
                    Long press a field card to keep its details pinned here.
                  </Text>
                )}
              </View>

              <View style={styles.insightsCard}>
                <Text style={styles.panelTitle}>Linked Note</Text>
                {selectedItem?.linkedNote ? (
                  <View style={styles.notePanelCard}>
                    <Text style={styles.notePanelTitle}>{selectedItem.linkedNote.title}</Text>
                    <Text style={styles.notePanelContent}>
                      {selectedItem.linkedNote.content.trim() || 'No note details yet.'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyPanelText}>
                    {selectedItem
                      ? 'No note is linked to this setup yet.'
                      : 'Select a field to view its linked note.'}
                  </Text>
                )}
              </View>

              <View style={styles.rosterCard}>
                <Text style={styles.panelTitle}>Team Roster</Text>
                {selectedTeamName ? (
                  <Text style={styles.rosterTeamName}>{selectedTeamName}</Text>
                ) : null}
                {selectedPlayers.length > 0 ? (
                  <View style={styles.rosterList}>
                    {selectedPlayers.slice(0, 8).map((player, index) => (
                      <RosterRow key={player.id} name={`${index + 1}. ${player.name}`} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyPanelText}>
                    {selectedItem
                      ? 'No team players are assigned to this setup.'
                      : 'Select a field to view its team players.'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <FieldSetupPreviewModal
          visible={Boolean(previewItem)}
          setup={previewItem?.setup ?? null}
          linkedNote={previewItem?.linkedNote ?? null}
          onClose={() => setPreviewSetupId(null)}
          onLoad={handleLoadPreviewSetup}
          onDuplicate={handleDuplicatePreviewSetup}
          onDelete={handleDeletePreviewSetup}
        />

        <AllFieldsModal
          visible={isAllFieldsVisible}
          items={dashboardItems}
          isWide={isWide}
          getTeamName={getTeamName}
          onClose={() => setIsAllFieldsVisible(false)}
          onOpenField={handleOpenPreviewFromAllFields}
          expandedNoteId={expandedNoteId}
          onToggleNote={(noteId) =>
            setExpandedNoteId((currentId) => (currentId === noteId ? null : noteId))
          }
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const SETUP_CARD_VARIANTS = ['pitch', 'rings', 'dots'] as const;

function HeaderTab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={styles.headerTab}>
      <Text style={[styles.headerTabText, active && styles.headerTabTextActive]}>{label}</Text>
      {active ? <View style={styles.headerTabUnderline} /> : null}
    </View>
  );
}

function SetupCard({
  item,
  teamName,
  selected,
  isStacked,
  variant,
  expandedNoteId,
  onToggleNote,
  onLongPress,
  onPress,
}: {
  item: DashboardItem;
  teamName: string | null;
  selected: boolean;
  isStacked: boolean;
  variant: (typeof SETUP_CARD_VARIANTS)[number];
  expandedNoteId: string | null;
  onToggleNote: (noteId: string) => void;
  onLongPress: () => void;
  onPress: () => void;
}) {
  const linkedNote = item.linkedNote;
  const isExpanded = linkedNote ? expandedNoteId === linkedNote.id : false;
  const longPressTriggeredRef = useRef(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      delayLongPress={250}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onLongPress();
      }}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }

        onPress();
      }}
      style={[
        styles.setupCard,
        !isStacked && styles.setupCardWrapped,
        selected && styles.setupCardSelected,
      ]}>
      <View style={styles.setupThumbnail}>
        {variant === 'pitch' ? (
          <View style={styles.pitchPreview}>
            <View style={styles.pitchPreviewLabel}>
              <Text style={styles.pitchPreviewLabelText}>SETUP</Text>
            </View>
          </View>
        ) : null}
        {variant === 'rings' ? (
          <>
            <View style={[styles.ringPreview, styles.ringPreviewTop]} />
            <View style={[styles.ringPreview, styles.ringPreviewBottom]} />
            <View style={styles.ringDot} />
            <View style={[styles.ringDot, styles.ringDotBottom]} />
          </>
        ) : null}
        {variant === 'dots' ? (
          <View style={styles.dotPreviewRow}>
            <View style={styles.dotPreview} />
            <View style={styles.dotPreview} />
            <View style={styles.dotPreview} />
          </View>
        ) : null}
      </View>
      <Text style={styles.setupCardTitle}>{item.setup.name}</Text>
      {teamName ? <Text style={styles.setupTeamName}>{teamName}</Text> : null}
      <Text style={styles.setupUpdatedText}>Updated {formatTimestamp(item.setup.updatedAt)}</Text>
      {linkedNote ? (
        <LinkedNotePreview
          note={linkedNote}
          isExpanded={isExpanded}
          onPress={() => onToggleNote(linkedNote.id)}
        />
      ) : (
        <Text numberOfLines={2} style={styles.setupNotePreviewMuted}>
          No linked note yet.
        </Text>
      )}
    </TouchableOpacity>
  );
}

function AllFieldsModal({
  visible,
  items,
  isWide,
  getTeamName,
  onClose,
  onOpenField,
  expandedNoteId,
  onToggleNote,
}: {
  visible: boolean;
  items: DashboardItem[];
  isWide: boolean;
  getTeamName: (teamId: string | null) => string | null;
  onClose: () => void;
  onOpenField: (setupId: string) => void;
  expandedNoteId: string | null;
  onToggleNote: (noteId: string) => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.allFieldsOverlay}>
        <View style={styles.allFieldsCard}>
          <View style={styles.allFieldsHeader}>
            <View style={styles.allFieldsTitleBlock}>
              <Text style={styles.allFieldsTitle}>All Saved Fields</Text>
              <Text style={styles.allFieldsSubtitle}>
                Browse every saved field setup in a larger grid and open any one for preview.
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.allFieldsCloseButton}>
              <Text style={styles.allFieldsCloseText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.allFieldsScrollContent}>
            {items.length === 0 ? (
              <View style={styles.allFieldsEmptyCard}>
                <Text style={styles.setupCardTitle}>No saved fields yet</Text>
                <Text style={styles.emptyPanelText}>
                  Save a field setup to browse it here.
                </Text>
              </View>
            ) : (
              <View style={styles.allFieldsGrid}>
                {items.map((item, index) => (
                  <CompactFieldCard
                    key={item.setup.id}
                    item={item}
                    teamName={getTeamName(item.setup.teamId ?? null)}
                    variant={SETUP_CARD_VARIANTS[index % SETUP_CARD_VARIANTS.length]}
                    isWide={isWide}
                    expandedNoteId={expandedNoteId}
                    onToggleNote={onToggleNote}
                    onPress={() => onOpenField(item.setup.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CompactFieldCard({
  item,
  teamName,
  variant,
  isWide,
  expandedNoteId,
  onToggleNote,
  onPress,
}: {
  item: DashboardItem;
  teamName: string | null;
  variant: (typeof SETUP_CARD_VARIANTS)[number];
  isWide: boolean;
  expandedNoteId: string | null;
  onToggleNote: (noteId: string) => void;
  onPress: () => void;
}) {
  const linkedNote = item.linkedNote;
  const isExpanded = linkedNote ? expandedNoteId === linkedNote.id : false;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.compactCard, isWide ? styles.compactCardWide : styles.compactCardNarrow]}>
      <View style={[styles.setupThumbnail, styles.compactThumbnail]}>
        {variant === 'pitch' ? (
          <View style={styles.pitchPreview}>
            <View style={styles.pitchPreviewLabel}>
              <Text style={styles.pitchPreviewLabelText}>FIELD</Text>
            </View>
          </View>
        ) : null}
        {variant === 'rings' ? (
          <>
            <View style={[styles.ringPreview, styles.ringPreviewTop]} />
            <View style={[styles.ringPreview, styles.ringPreviewBottom]} />
            <View style={styles.ringDot} />
            <View style={[styles.ringDot, styles.ringDotBottom]} />
          </>
        ) : null}
        {variant === 'dots' ? (
          <View style={styles.dotPreviewRow}>
            <View style={styles.dotPreview} />
            <View style={styles.dotPreview} />
            <View style={styles.dotPreview} />
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} style={styles.compactCardTitle}>
        {item.setup.name}
      </Text>
      {teamName ? (
        <Text numberOfLines={1} style={styles.setupTeamName}>
          {teamName}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={styles.setupUpdatedText}>
        Updated {formatTimestamp(item.setup.updatedAt)}
      </Text>
      {linkedNote ? (
        <LinkedNotePreview
          note={linkedNote}
          isExpanded={isExpanded}
          compact
          onPress={() => onToggleNote(linkedNote.id)}
        />
      ) : (
        <Text numberOfLines={2} style={styles.setupNotePreviewMuted}>
          No linked note yet.
        </Text>
      )}
    </Pressable>
  );
}

function LinkedNotePreview({
  note,
  isExpanded,
  compact = false,
  onPress,
}: {
  note: NoteItem;
  isExpanded: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const previewText = note.content.trim() || note.title;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={[styles.notePreviewButton, isExpanded && styles.notePreviewButtonExpanded]}>
      <Text numberOfLines={1} style={styles.notePreviewLabel}>
        Linked Note
      </Text>
      <Text numberOfLines={isExpanded ? undefined : 1} style={styles.notePreviewTitle}>
        {note.title}
      </Text>
      <Text
        numberOfLines={isExpanded ? undefined : compact ? 2 : 3}
        style={isExpanded ? styles.notePreviewContentExpanded : styles.setupNotePreview}>
        {previewText}
      </Text>
      <Text style={styles.notePreviewHint}>{isExpanded ? 'Tap to collapse' : 'Tap to expand'}</Text>
    </TouchableOpacity>
  );
}

function RosterRow({ name }: { name: string }) {
  return (
    <View style={styles.rosterRow}>
      <View style={styles.rosterStatusDot} />
      <Text style={styles.rosterName}>{name}</Text>
      <Text style={styles.rosterStatus}>READY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EB',
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#F7F5F1',
    borderRightWidth: 1,
    borderRightColor: '#E4DDD2',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  brand: {
    color: '#1D6C2F',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubhead: {
    marginTop: 4,
    color: '#8B8479',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
  },
  sidebarNav: {
    marginTop: 18,
    gap: 10,
  },
  sidebarItem: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sidebarIcon: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#8C8A82',
  },
  sidebarIconActive: {
    borderColor: '#1E6E31',
  },
  sidebarItemText: {
    color: '#6A665E',
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#1E6E31',
  },
  sidebarProfile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2BA6B0',
  },
  sidebarProfileText: {
    gap: 2,
  },
  profileName: {
    color: '#24221E',
    fontSize: 12,
    fontWeight: '700',
  },
  profileRole: {
    color: '#8C877E',
    fontSize: 10,
    fontWeight: '600',
  },
  newSessionButton: {
    borderRadius: 8,
    backgroundColor: '#1E6E31',
    paddingVertical: 10,
    alignItems: 'center',
  },
  newSessionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  contentShell: {
    flex: 1,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 8,
  },
  headerTitleBlock: {
    gap: 10,
    flex: 1,
  },
  adminModeLabel: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#1F1D19',
    fontSize: 28,
    fontWeight: '700',
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  headerTab: {
    gap: 6,
  },
  headerTabText: {
    color: '#6F6B62',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTabTextActive: {
    color: '#1F1D19',
    fontWeight: '700',
  },
  headerTabUnderline: {
    height: 3,
    borderRadius: 999,
    backgroundColor: '#2B8A3E',
  },
  dashboardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 22,
    minHeight: 0,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  sideColumn: {
    width: 320,
    flexShrink: 0,
    maxWidth: '100%',
  },
  recentFieldsSection: {
    flex: 1,
    minHeight: 0,
    gap: 16,
  },
  recentFieldsScrollArea: {
    flex: 1,
    minHeight: 0,
  },
  recentFieldsScroll: {
    flex: 1,
  },
  recentFieldsScrollContent: {
    paddingBottom: 20,
  },
  heroCard: {
    minHeight: 192,
    borderRadius: 20,
    backgroundColor: '#20572E',
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'flex-end',
  },
  heroGlow: {
    position: 'absolute',
    right: -20,
    top: -12,
    width: 240,
    height: 150,
    borderRadius: 120,
    backgroundColor: 'rgba(159, 201, 174, 0.18)',
  },
  heroPitchStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    backgroundColor: 'rgba(105, 171, 86, 0.55)',
  },
  heroContent: {
    gap: 10,
    maxWidth: 420,
  },
  phasePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#B07A14',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phasePillText: {
    color: '#FFF6DA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  heroDescription: {
    color: '#E1EFE2',
    fontSize: 14,
    lineHeight: 20,
  },
  heroButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F4F6F0',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroButtonText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionLink: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '700',
  },
  allFieldsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  allFieldsCard: {
    flex: 1,
    maxHeight: '92%',
    backgroundColor: '#F7F5F1',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  allFieldsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  allFieldsTitleBlock: {
    flex: 1,
    gap: 6,
  },
  allFieldsTitle: {
    color: '#1F1D19',
    fontSize: 26,
    fontWeight: '800',
  },
  allFieldsSubtitle: {
    color: '#6F6B62',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 480,
  },
  allFieldsCloseButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allFieldsCloseText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  allFieldsScrollContent: {
    paddingBottom: 10,
  },
  allFieldsEmptyCard: {
    minHeight: 220,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  allFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  setupRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  setupRowStacked: {
    flexDirection: 'column',
  },
  setupCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  setupCardWrapped: {
    width: '31%',
  },
  setupCardSelected: {
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  emptySetupCard: {
    justifyContent: 'center',
    minHeight: 180,
  },
  setupThumbnail: {
    height: 122,
    borderRadius: 8,
    backgroundColor: '#B9F5A4',
    overflow: 'hidden',
    position: 'relative',
  },
  pitchPreview: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    top: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  pitchPreviewLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: '#FFB81C',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pitchPreviewLabelText: {
    color: '#544000',
    fontSize: 8,
    fontWeight: '800',
  },
  ringPreview: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4F6452',
    borderStyle: 'dashed',
  },
  ringPreviewTop: {
    top: 20,
    left: 58,
  },
  ringPreviewBottom: {
    top: 64,
    left: 116,
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#244E2B',
    top: 36,
    left: 76,
  },
  ringDotBottom: {
    top: 80,
    left: 134,
  },
  dotPreviewRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dotPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1D5A26',
  },
  setupCardTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  compactCard: {
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  compactCardWide: {
    width: '31%',
  },
  compactCardNarrow: {
    width: '47%',
  },
  compactThumbnail: {
    height: 96,
  },
  compactCardTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
  notePreviewButton: {
    borderRadius: 10,
    backgroundColor: '#F7F5F1',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  notePreviewButtonExpanded: {
    backgroundColor: '#EEF4EE',
  },
  notePreviewLabel: {
    color: '#1E6E31',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notePreviewTitle: {
    color: '#1F1D19',
    fontSize: 13,
    fontWeight: '700',
  },
  notePreviewContentExpanded: {
    color: '#36342F',
    fontSize: 12,
    lineHeight: 18,
  },
  notePreviewHint: {
    color: '#6E685F',
    fontSize: 11,
    fontWeight: '600',
  },
  setupTeamName: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '700',
  },
  setupUpdatedText: {
    color: '#7A756B',
    fontSize: 11,
    fontWeight: '600',
  },
  setupNotePreview: {
    color: '#36342F',
    fontSize: 12,
    lineHeight: 18,
  },
  setupNotePreviewMuted: {
    color: '#9A948A',
    fontSize: 12,
    lineHeight: 18,
  },
  metricCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    color: '#5E5B54',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectionDetails: {
    gap: 8,
  },
  selectedSetupName: {
    color: '#161512',
    fontSize: 22,
    fontWeight: '800',
  },
  selectedSetupTeam: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSetupMeta: {
    color: '#7A756B',
    fontSize: 12,
    fontWeight: '600',
  },
  insightsCard: {
    borderRadius: 18,
    backgroundColor: '#E7EFE7',
    padding: 18,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1E6E31',
  },
  notePanelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  notePanelTitle: {
    color: '#1F1D19',
    fontSize: 15,
    fontWeight: '800',
  },
  notePanelContent: {
    color: '#2F302C',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyPanelText: {
    color: '#6E685F',
    fontSize: 13,
    lineHeight: 20,
  },
  rosterCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
    minHeight: 200,
  },
  rosterTeamName: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -6,
  },
  rosterList: {
    gap: 10,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rosterStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1EAE5C',
  },
  rosterName: {
    flex: 1,
    color: '#2B2925',
    fontSize: 13,
  },
  rosterStatus: {
    color: '#9B968E',
    fontSize: 10,
    fontWeight: '700',
  },
});