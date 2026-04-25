import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { updateNote } from '@/storage/noteStorage';
import type { NoteItem } from '@/types/noteItem';

type LinkedNoteCardProps = {
  note: NoteItem;
  onNoteUpdated: (note: NoteItem) => void;
};

export function LinkedNoteCard({ note, onNoteUpdated }: LinkedNoteCardProps) {
  const preview = note.content.trim() || 'No note details yet.';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const [contentDraft, setContentDraft] = useState(note.content);

  useEffect(() => {
    setIsExpanded(false);
    setIsEditing(false);
  }, [note.id]);

  useEffect(() => {
    setTitleDraft(note.title);
    setContentDraft(note.content);
  }, [note.content, note.title]);

  const handleBack = () => {
    if (isEditing) {
      setTitleDraft(note.title);
      setContentDraft(note.content);
      setIsEditing(false);
      return;
    }

    setIsExpanded(false);
  };

  const handleSave = async () => {
    try {
      const updated = await updateNote(
        note.id,
        titleDraft,
        contentDraft,
        note.linkedFieldSetupId ?? null,
        note.teamId ?? null
      );

      onNoteUpdated(updated);
      setTitleDraft(updated.title);
      setContentDraft(updated.content);
      setIsEditing(false);
    } catch (error) {
      Alert.alert(
        'Note update failed',
        error instanceof Error ? error.message : 'Unable to save the linked note right now.'
      );
    }
  };

  if (isExpanded) {
    return (
      <View style={[styles.card, styles.expandedCard]}>
        <View style={styles.expandedHeader}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Linked Note</Text>
          <Pressable
            onPress={isEditing ? handleSave : () => setIsEditing(true)}
            style={styles.editButton}>
            <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.expandedScroll}
          contentContainerStyle={styles.expandedScrollContent}>
          {isEditing ? (
            <>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="Note title"
                placeholderTextColor="#8B8479"
                style={styles.titleInput}
              />
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="Write your note..."
                placeholderTextColor="#8B8479"
                multiline
                textAlignVertical="top"
                style={styles.contentInput}
              />
            </>
          ) : (
            <>
              <Text style={styles.expandedTitle}>{note.title}</Text>
              <Text style={styles.expandedContent}>{preview}</Text>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setIsExpanded(true)} style={styles.previewTapArea}>
        <Text style={styles.eyebrow}>Linked Note</Text>
        <Text style={styles.title}>{note.title}</Text>
        <Text numberOfLines={4} style={styles.preview}>
          {preview}
        </Text>
      </Pressable>
      <Pressable onPress={() => setIsExpanded(true)} style={styles.button}>
        <Text style={styles.buttonText}>Open Note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  expandedCard: {
    width: 280,
    maxHeight: 340,
  },
  eyebrow: {
    color: '#6F6B62',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: '#1F1D19',
    fontSize: 16,
    fontWeight: '800',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    backgroundColor: '#F1EEE8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '800',
  },
  editButton: {
    backgroundColor: '#1E6E31',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  expandedTitle: {
    color: '#1F1D19',
    fontSize: 18,
    fontWeight: '800',
  },
  preview: {
    color: '#344054',
    fontSize: 13,
    lineHeight: 19,
  },
  previewTapArea: {
    gap: 8,
  },
  expandedScroll: {
    flexGrow: 0,
  },
  expandedScrollContent: {
    paddingBottom: 4,
  },
  expandedContent: {
    color: '#344054',
    fontSize: 14,
    lineHeight: 21,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1D19',
  },
  contentInput: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#344054',
    lineHeight: 21,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#1E6E31',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
