import { useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FieldSetupGraphic } from '@/components/FieldSetupGraphic';
import { useTeams } from '@/context/TeamsContext';
import type { FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';
import { shareCapturedView } from '@/utils/shareCapturedView';

type FieldSetupPreviewModalProps = {
  visible: boolean;
  setup: FieldSetup | null;
  linkedNote: NoteItem | null;
  onClose: () => void;
  onLoad: () => Promise<void> | void;
  onDuplicate: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

export function FieldSetupPreviewModal({
  visible,
  setup,
  linkedNote,
  onClose,
  onLoad,
  onDuplicate,
  onDelete,
}: FieldSetupPreviewModalProps) {
  const { getTeamName } = useTeams();
  const fieldPreviewRef = useRef<View | null>(null);

  if (!setup) {
    return null;
  }

  const teamName = getTeamName(setup.teamId ?? null);

  const handleExport = async () => {
    await shareCapturedView({
      viewRef: fieldPreviewRef,
      title: setup.name,
      message: teamName ? `${setup.name}\nTeam: ${teamName}` : setup.name,
    });
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{setup.name}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            <Text style={styles.metaText}>Updated {formatTimestamp(setup.updatedAt)}</Text>
            {teamName ? <Text style={styles.teamText}>Team: {teamName}</Text> : null}

            <View ref={fieldPreviewRef} collapsable={false} style={styles.previewFieldContainer}>
              <FieldSetupGraphic setup={setup} size={240} scale={0.58} />
            </View>

            {linkedNote ? (
              <View style={styles.noteCard}>
                <Text style={styles.sectionTitle}>Linked Note</Text>
                <Text style={styles.noteTitle}>{linkedNote.title}</Text>
                <Text style={styles.noteContent}>
                  {linkedNote.content.trim() || 'No note details yet.'}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable onPress={onLoad} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Load</Text>
            </Pressable>
            <Pressable onPress={onDuplicate} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Duplicate</Text>
            </Pressable>
            <Pressable onPress={handleExport} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Export</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={[styles.button, styles.deleteButton]}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0B6623',
  },
  closeText: {
    color: '#0B6623',
    fontWeight: '600',
  },
  contentContainer: {
    gap: 12,
    paddingBottom: 12,
  },
  metaText: {
    color: '#667085',
    fontSize: 13,
  },
  teamText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
  },
  previewFieldContainer: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
  },
  noteCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  sectionTitle: {
    color: '#0B6623',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noteTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  noteContent: {
    color: '#344054',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#0B6623',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#EEF6F0',
  },
  secondaryButtonText: {
    color: '#0B6623',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE4E2',
  },
  deleteButtonText: {
    color: '#B42318',
    fontWeight: '600',
  },
});
