import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPageHeader } from '@/components/AppPageHeader';
import { NoteEditorModal } from '@/components/NoteEditorModal';
import { useTeams } from '@/context/TeamsContext';
import { getAllFieldSetups } from '@/storage/fieldStorage';
import {
  deleteNote,
  getAllNotes,
  saveNote,
  updateNote,
} from '@/storage/noteStorage';
import type { FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { getTeamName, teams } = useTeams();
  const isWide = width >= 980;
  const contentGap = isWide ? 22 : 16;
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [fieldSetups, setFieldSetups] = useState<FieldSetup[]>([]);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      setIsLoadingNotes(true);
      const [nextNotes, nextFieldSetups] = await Promise.all([
        getAllNotes(),
        getAllFieldSetups(),
      ]);

      setNotes(nextNotes);
      setFieldSetups(nextFieldSetups);
    } catch (error) {
      Alert.alert(
        'Notes unavailable',
        error instanceof Error ? error.message : 'Unable to load your notes right now.'
      );
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData])
  );

  const setupNameMap = useMemo(
    () => Object.fromEntries(fieldSetups.map((setup) => [setup.id, setup.name])),
    [fieldSetups]
  );

  const openNewNote = () => {
    setSelectedNote(null);
    setIsEditorVisible(true);
  };

  const openExistingNote = (note: NoteItem) => {
    setSelectedNote(note);
    setIsEditorVisible(true);
  };

  const handleSaveNote = async (draft: {
    id?: string;
    title: string;
    content: string;
    linkedFieldSetupId: string | null;
    teamId: string | null;
  }) => {
    try {
      if (draft.id) {
        await updateNote(
          draft.id,
          draft.title,
          draft.content,
          draft.linkedFieldSetupId,
          draft.teamId
        );
      } else {
        await saveNote(draft.title, draft.content, draft.linkedFieldSetupId, draft.teamId);
      }

      await refreshData();
      setIsEditorVisible(false);
      setSelectedNote(null);
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Unable to save this note right now.'
      );
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
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
              await deleteNote(noteId);
              await refreshData();
              setIsEditorVisible(false);
              setSelectedNote(null);
            } catch (error) {
              Alert.alert(
                'Delete failed',
                error instanceof Error ? error.message : 'Unable to delete this note right now.'
              );
            }
          })();
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isWide ? 22 : 14,
            gap: contentGap,
          },
        ]}>
        <AppPageHeader
          title="Notes"
          subtitle="Save strategy notes, link them to field setups, and keep match planning in one place."
          actionLabel="New Note"
          onActionPress={openNewNote}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved Notes</Text>
          <Text style={styles.sectionMeta}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </Text>
        </View>

        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isLoadingNotes ? 'Loading notes...' : 'No notes yet'}</Text>
            <Text style={styles.emptyText}>
              {isLoadingNotes
                ? 'Fetching your saved notes and linked field plans.'
                : 'Create a note to save plans, reminders, or bowling strategy.'}
            </Text>
          </View>
        ) : (
          notes.map((note) => {
            const linkedSetupName = note.linkedFieldSetupId
              ? setupNameMap[note.linkedFieldSetupId] ?? 'Linked setup removed'
              : null;

            return (
              <Pressable
                key={note.id}
                onPress={() => openExistingNote(note)}
                style={styles.noteCard}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <View style={styles.noteMetaRow}>
                  {linkedSetupName ? (
                    <Text style={styles.linkedText}>Field: {linkedSetupName}</Text>
                  ) : null}
                  {note.teamId ? (
                    <Text style={styles.teamText}>
                      Team: {getTeamName(note.teamId) ?? 'Linked team removed'}
                    </Text>
                  ) : null}
                </View>
                <Text numberOfLines={4} style={styles.notePreview}>
                  {note.content.trim() || 'No content yet.'}
                </Text>
                <Text style={styles.noteMeta}>Updated {formatTimestamp(note.updatedAt)}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <NoteEditorModal
        visible={isEditorVisible}
        note={selectedNote}
        fieldSetups={fieldSetups}
        teams={teams}
        onClose={() => {
          setIsEditorVisible(false);
          setSelectedNote(null);
        }}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  sectionMeta: {
    color: '#6F6B62',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  emptyText: {
    color: '#475467',
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  noteTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  noteMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkedText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  teamText: {
    color: '#56534D',
    fontSize: 13,
    fontWeight: '600',
  },
  notePreview: {
    color: '#344054',
    lineHeight: 20,
  },
  noteMeta: {
    color: '#7A756B',
    fontSize: 12,
    fontWeight: '600',
  },
});
