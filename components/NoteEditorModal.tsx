import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FieldSetupGraphic } from '@/components/FieldSetupGraphic';
import type { FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';
import type { Team } from '@/types/team';
import { shareCapturedView } from '@/utils/shareCapturedView';

type NoteEditorModalProps = {
  visible: boolean;
  note: NoteItem | null;
  fieldSetups: FieldSetup[];
  teams: Team[];
  onClose: () => void;
  onSave: (draft: {
    id?: string;
    title: string;
    content: string;
    linkedFieldSetupId: string | null;
    teamId: string | null;
  }) => Promise<void> | void;
  onDelete: (noteId: string) => Promise<void> | void;
};

export function NoteEditorModal({
  visible,
  note,
  fieldSetups,
  teams,
  onClose,
  onSave,
  onDelete,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedFieldSetupId, setLinkedFieldSetupId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isExportOptionsVisible, setIsExportOptionsVisible] = useState(false);
  const fieldPreviewRef = useRef<View | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setLinkedFieldSetupId(note?.linkedFieldSetupId ?? null);
    setTeamId(note?.teamId ?? null);
  }, [note, visible]);

  const handleSave = async () => {
    await onSave({
      id: note?.id,
      title,
      content,
      linkedFieldSetupId,
      teamId,
    });
  };

  const linkedFieldSetup = useMemo(
    () => fieldSetups.find((setup) => setup.id === linkedFieldSetupId) ?? null,
    [fieldSetups, linkedFieldSetupId]
  );

  const shareNoteOnly = async () => {
    const safeTitle = title.trim() || 'Untitled Note';
    const safeContent = content.trim();
    const message = safeContent ? `${safeTitle}\n\n${safeContent}` : safeTitle;

    await Share.share({
      title: safeTitle,
      message,
    });
  };

  const handleExport = async () => {
    if (!linkedFieldSetup) {
      await shareNoteOnly();
      return;
    }

    setIsExportOptionsVisible(true);
  };

  const handleExportWithField = async () => {
    const safeTitle = title.trim() || 'Untitled Note';
    const safeContent = content.trim();
    const message = safeContent ? `${safeTitle}\n\n${safeContent}` : safeTitle;

    await shareCapturedView({
      viewRef: fieldPreviewRef,
      title: safeTitle,
      message,
    });

    setIsExportOptionsVisible(false);
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{note ? 'Edit Note' : 'New Note'}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor="#7A7A7A"
              style={styles.titleInput}
            />

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write your note..."
              placeholderTextColor="#7A7A7A"
              multiline
              textAlignVertical="top"
              style={styles.contentInput}
            />

            <View style={styles.linkSection}>
              <Text style={styles.linkTitle}>Team</Text>

              <Pressable
                onPress={() => setTeamId(null)}
                style={[styles.linkOption, teamId === null && styles.selectedLinkOption]}>
                <Text
                  style={[
                    styles.linkOptionText,
                    teamId === null && styles.selectedLinkOptionText,
                  ]}>
                  No team
                </Text>
              </Pressable>

              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => setTeamId(team.id)}
                  style={[styles.linkOption, teamId === team.id && styles.selectedLinkOption]}>
                  <Text
                    style={[
                      styles.linkOptionText,
                      teamId === team.id && styles.selectedLinkOptionText,
                    ]}>
                    {team.name}
                  </Text>
                </Pressable>
              ))}

              {teams.length === 0 ? (
                <Text style={styles.emptySetupText}>Create a team first if you want to link one.</Text>
              ) : null}

              <Text style={styles.linkTitle}>Linked Field Setup</Text>

              <Pressable
                onPress={() => setLinkedFieldSetupId(null)}
                style={[
                  styles.linkOption,
                  linkedFieldSetupId === null && styles.selectedLinkOption,
                ]}>
                <Text
                  style={[
                    styles.linkOptionText,
                    linkedFieldSetupId === null && styles.selectedLinkOptionText,
                  ]}>
                  No linked field
                </Text>
              </Pressable>

              {fieldSetups.map((setup) => (
                <Pressable
                  key={setup.id}
                  onPress={() => setLinkedFieldSetupId(setup.id)}
                  style={[
                    styles.linkOption,
                    linkedFieldSetupId === setup.id && styles.selectedLinkOption,
                  ]}>
                  <Text
                    style={[
                      styles.linkOptionText,
                      linkedFieldSetupId === setup.id && styles.selectedLinkOptionText,
                    ]}>
                    {setup.name}
                  </Text>
                </Pressable>
              ))}

              {fieldSetups.length === 0 ? (
                <Text style={styles.emptySetupText}>Save a field setup first to link one.</Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.actionsRow}>
            {note ? (
              <Pressable onPress={() => onDelete(note.id)} style={[styles.button, styles.deleteButton]}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={handleExport} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Export</Text>
            </Pressable>

            <Pressable onPress={handleSave} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isExportOptionsVisible}
        onRequestClose={() => setIsExportOptionsVisible(false)}>
        <View style={styles.exportOverlay}>
          <View style={styles.exportCard}>
            <Text style={styles.exportTitle}>Include field screenshot?</Text>
            <Text style={styles.exportText}>
              This note is linked to a saved field setup. Choose how you want to export it.
            </Text>

            <View style={styles.exportActions}>
              <Pressable
                onPress={() => setIsExportOptionsVisible(false)}
                style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await shareNoteOnly();
                  setIsExportOptionsVisible(false);
                }}
                style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Note Only</Text>
              </Pressable>
              <Pressable
                onPress={handleExportWithField}
                style={[styles.button, styles.primaryButton]}>
                <Text style={styles.primaryButtonText}>Note + Field</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {linkedFieldSetup ? (
        <View pointerEvents="none" style={styles.hiddenPreviewWrapper}>
          <View ref={fieldPreviewRef} collapsable={false} style={styles.hiddenPreview}>
            <FieldSetupGraphic setup={linkedFieldSetup} size={320} scale={1} />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1D19',
  },
  closeText: {
    color: '#1E6E31',
    fontWeight: '700',
  },
  contentContainer: {
    gap: 12,
    paddingBottom: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F1D19',
  },
  contentInput: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F1D19',
  },
  linkSection: {
    gap: 8,
  },
  linkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6F6B62',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  linkOption: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedLinkOption: {
    backgroundColor: '#1E6E31',
    borderColor: '#1E6E31',
  },
  linkOptionText: {
    color: '#1F1D19',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLinkOptionText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptySetupText: {
    color: '#667085',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#1E6E31',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1EEE8',
  },
  secondaryButtonText: {
    color: '#1E6E31',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEE4E2',
  },
  deleteButtonText: {
    color: '#B42318',
    fontWeight: '600',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1D19',
  },
  exportText: {
    color: '#475467',
    lineHeight: 20,
  },
  exportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  hiddenPreviewWrapper: {
    position: 'absolute',
    opacity: 0,
    left: -1000,
    top: 0,
  },
  hiddenPreview: {
    width: 280,
  },
});
