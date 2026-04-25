import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type QuickAddNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void> | void;
};

export function QuickAddNoteModal({
  visible,
  onClose,
  onSave,
}: QuickAddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTitle('');
    setContent('');
  }, [visible]);

  const handleSave = async () => {
    await onSave(title, content);
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add Note</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor="#8B8479"
            style={styles.titleInput}
          />

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write your note..."
            placeholderTextColor="#8B8479"
            multiline
            textAlignVertical="top"
            style={styles.contentInput}
          />

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Save</Text>
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
    padding: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F1D19',
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
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
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#F1EEE8',
  },
  secondaryButtonText: {
    color: '#1E6E31',
    fontWeight: '700',
  },
});
