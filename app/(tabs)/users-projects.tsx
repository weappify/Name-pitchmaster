import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPageHeader } from '@/components/AppPageHeader';
import { FieldSetupGraphic } from '@/components/FieldSetupGraphic';
import { ADMIN_EMAIL } from '@/lib/constants';
import {
  deleteAdminField,
  deleteAdminNote,
  deleteAdminTeam,
  getAdminProfiles,
  getAdminUserProjects,
  type AdminUserProjects,
} from '@/lib/adminProjects';
import { supabase } from '@/lib/supabase';
import type { ProfileRecord } from '@/types/profile';

export default function UsersProjectsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 1080;
  const contentGap = isWide ? 22 : 16;
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<AdminUserProjects>({
    fields: [],
    notes: [],
    playersByTeamId: {},
    teams: [],
  });

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session ?? null);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!loadingSession && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, loadingSession]);

  const refreshProfiles = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const nextProfiles = await getAdminProfiles();
    setProfiles(nextProfiles);
    setSelectedProfileId((currentId) => {
      if (currentId && nextProfiles.some((profile) => profile.id === currentId)) {
        return currentId;
      }

      return nextProfiles[0]?.id ?? null;
    });
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfiles();
    }, [refreshProfiles])
  );

  const refreshProjects = useCallback(async () => {
    if (!selectedProfileId || !isAdmin) {
      setProjects({
        fields: [],
        notes: [],
        playersByTeamId: {},
        teams: [],
      });
      setLoadingProjects(false);
      return;
    }

    setLoadingProjects(true);
    const nextProjects = await getAdminUserProjects(selectedProfileId);
    setProjects(nextProjects);
    setLoadingProjects(false);
  }, [isAdmin, selectedProfileId]);

  useEffect(() => {
    if (!selectedProfileId || !isAdmin) {
      setProjects({
        fields: [],
        notes: [],
        playersByTeamId: {},
        teams: [],
      });
      setLoadingProjects(false);
      return;
    }

    let mounted = true;
    setLoadingProjects(true);

    void getAdminUserProjects(selectedProfileId).then((nextProjects) => {
      if (!mounted) {
        return;
      }

      setProjects(nextProjects);
      setLoadingProjects(false);
    });

    return () => {
      mounted = false;
    };
  }, [isAdmin, selectedProfileId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const teamNameMap = useMemo(
    () => Object.fromEntries(projects.teams.map((team) => [team.id, team.name])),
    [projects.teams]
  );
  const fieldNameMap = useMemo(
    () => Object.fromEntries(projects.fields.map((field) => [field.id, field.name])),
    [projects.fields]
  );
  const allPlayers = useMemo(
    () => Object.values(projects.playersByTeamId).flat(),
    [projects.playersByTeamId]
  );
  const countsLabel = `${projects.fields.length} field${projects.fields.length === 1 ? '' : 's'} | ${
    projects.notes.length
  } note${projects.notes.length === 1 ? '' : 's'} | ${projects.teams.length} team${
    projects.teams.length === 1 ? '' : 's'
  }`;

  const handleDeleteField = (fieldId: string) => {
    if (!selectedProfileId) {
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
          void deleteAdminField(selectedProfileId, fieldId).then(() => {
            void refreshProjects();
          });
        },
      },
    ]);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedProfileId) {
      return;
    }

    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteAdminNote(selectedProfileId, noteId).then(() => {
            void refreshProjects();
          });
        },
      },
    ]);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!selectedProfileId) {
      return;
    }

    Alert.alert('Delete Team', 'Are you sure you want to delete this team?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteAdminTeam(selectedProfileId, teamId).then(() => {
            void refreshProjects();
          });
        },
      },
    ]);
  };

  if (loadingSession || !isAdmin) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
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
        <AppPageHeader
          title="Users' Projects"
          subtitle="Admin-only view of user profiles, fields, notes, and team plans."
        />

        <View style={[styles.body, !isWide && styles.bodyStacked]}>
          <View style={[styles.userListCard, !isWide && styles.fullWidthCard]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Users</Text>
              <Text style={styles.sectionMeta}>
                {profiles.length} {profiles.length === 1 ? 'account' : 'accounts'}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.userListContent}>
              {profiles.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No profiles found</Text>
                  <Text style={styles.emptyText}>Apply the new profile sync and schema to start listing users.</Text>
                </View>
              ) : (
                profiles.map((profile) => (
                  <Pressable
                    key={profile.id}
                    onPress={() => setSelectedProfileId(profile.id)}
                    style={[
                      styles.userCard,
                      profile.id === selectedProfileId && styles.userCardSelected,
                    ]}>
                    <Text style={styles.userName}>{profile.name?.trim() || profile.email}</Text>
                    <Text style={styles.userEmail}>{profile.email}</Text>
                    <Text style={styles.userDob}>
                      DOB: {profile.date_of_birth?.trim() || 'Not set'}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          <ScrollView
            style={[styles.detailColumn, !isWide && styles.fullWidthCard]}
            contentContainerStyle={styles.detailContent}>
            <View style={styles.detailHeaderCard}>
              <Text style={styles.detailTitle}>{selectedProfile?.name?.trim() || 'Select a user'}</Text>
              <Text style={styles.detailMeta}>{selectedProfile?.email ?? 'No email available'}</Text>
              <Text style={styles.detailMeta}>
                Date of Birth: {selectedProfile?.date_of_birth?.trim() || 'Not set'}
              </Text>
              {selectedProfile ? <Text style={styles.detailCounts}>{countsLabel}</Text> : null}
            </View>

            {loadingProjects ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Loading projects...</Text>
              </View>
            ) : !selectedProfile ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No user selected</Text>
                <Text style={styles.emptyText}>Choose a user from the list to preview their saved work.</Text>
              </View>
            ) : (
              <>
                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>Fields</Text>
                  {projects.fields.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No fields saved</Text>
                    </View>
                  ) : (
                    projects.fields.map((field) => {
                      const linkedNote = projects.notes.find((note) => note.linkedFieldSetupId === field.id) ?? null;
                      return (
                        <View key={field.id} style={styles.previewCard}>
                          <View style={styles.fieldPreviewRow}>
                            <FieldSetupGraphic
                              setup={field}
                              size={190}
                              scale={0.5}
                              teamsOverride={projects.teams}
                              playersOverride={allPlayers}
                            />
                            <View style={styles.fieldPreviewMeta}>
                              <Text style={styles.previewCardTitle}>{field.name}</Text>
                              <Text style={styles.previewCardMeta}>Updated {formatTimestamp(field.updatedAt)}</Text>
                              <Text style={styles.previewCardMeta}>
                                Team: {field.teamId ? teamNameMap[field.teamId] ?? 'Linked team removed' : 'No team'}
                              </Text>
                              <Text style={styles.previewCardMeta}>
                                Linked Note: {linkedNote?.title ?? 'No linked note'}
                              </Text>
                              <Pressable
                                onPress={() => handleDeleteField(field.id)}
                                style={styles.deleteButton}>
                                <Text style={styles.deleteButtonText}>Delete</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>Notes</Text>
                  {projects.notes.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No notes saved</Text>
                    </View>
                  ) : (
                    projects.notes.map((note) => (
                      <View key={note.id} style={styles.previewCard}>
                        <Text style={styles.previewCardTitle}>{note.title}</Text>
                        <Text style={styles.previewCardMeta}>Updated {formatTimestamp(note.updatedAt)}</Text>
                        {note.linkedFieldSetupId ? (
                          <Text style={styles.previewCardMeta}>
                            Field: {fieldNameMap[note.linkedFieldSetupId] ?? 'Linked field removed'}
                          </Text>
                        ) : null}
                        {note.teamId ? (
                          <Text style={styles.previewCardMeta}>
                            Team: {teamNameMap[note.teamId] ?? 'Linked team removed'}
                          </Text>
                        ) : null}
                        <Text style={styles.notePreviewText}>{note.content.trim() || 'No content yet.'}</Text>
                        <Pressable onPress={() => handleDeleteNote(note.id)} style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>Teams</Text>
                  {projects.teams.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No teams saved</Text>
                    </View>
                  ) : (
                    projects.teams.map((team) => {
                      const players = projects.playersByTeamId[team.id] ?? [];
                      return (
                        <View key={team.id} style={styles.previewCard}>
                          <Text style={styles.previewCardTitle}>{team.name}</Text>
                          <Text style={styles.previewCardMeta}>
                            {players.length} {players.length === 1 ? 'player' : 'players'}
                          </Text>
                          {players.length === 0 ? (
                            <Text style={styles.notePreviewText}>No roster entries yet.</Text>
                          ) : (
                            <View style={styles.rosterList}>
                              {players.map((player, index) => (
                                <Text key={player.id} style={styles.rosterRow}>
                                  {index + 1}. {player.name}
                                </Text>
                              ))}
                            </View>
                          )}
                          <Pressable onPress={() => handleDeleteTeam(team.id)} style={styles.deleteButton}>
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EB',
  },
  contentShell: {
    flex: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  bodyStacked: {
    flexDirection: 'column',
  },
  fullWidthCard: {
    width: '100%',
  },
  userListCard: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  detailColumn: {
    flex: 1,
  },
  detailContent: {
    gap: 16,
    paddingBottom: 24,
  },
  userListContent: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionMeta: {
    color: '#6F6B62',
    fontSize: 12,
    fontWeight: '700',
  },
  userCard: {
    backgroundColor: '#FBF9F4',
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E4DDD2',
  },
  userCardSelected: {
    borderColor: '#1E6E31',
    backgroundColor: '#EEF6F0',
  },
  userName: {
    color: '#1F1D19',
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    color: '#475467',
    fontSize: 13,
  },
  userDob: {
    color: '#6F6B62',
    fontSize: 12,
    fontWeight: '700',
  },
  detailHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  detailTitle: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '800',
  },
  detailMeta: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
  },
  detailCounts: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  previewSection: {
    gap: 12,
  },
  previewSectionTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  previewCardTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  previewCardMeta: {
    color: '#56534D',
    fontSize: 13,
    lineHeight: 19,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: '#FEE4E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fieldPreviewMeta: {
    flex: 1,
    gap: 5,
  },
  notePreviewText: {
    color: '#344054',
    lineHeight: 20,
  },
  rosterList: {
    gap: 4,
  },
  rosterRow: {
    color: '#344054',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: '#475467',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#1F1D19',
    fontSize: 15,
    fontWeight: '600',
  },
});
