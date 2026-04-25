import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FieldSetup } from '@/types/fieldSetup';

type FieldSetupsModalProps = {
  visible: boolean;
  setups: FieldSetup[];
  onClose: () => void;
  onLoad: (setup: FieldSetup) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onDuplicate: (id: string) => Promise<void> | void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

export function FieldSetupsModal({
  visible,
  setups,
  onClose,
  onLoad,
  onDelete,
  onDuplicate,
}: FieldSetupsModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Saved Setups</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {setups.length === 0 ? (
              <Text style={styles.emptyText}>No saved setups yet.</Text>
            ) : (
              setups.map((setup) => (
                <View key={setup.id} style={styles.setupCard}>
                  <Text style={styles.setupName}>{setup.name}</Text>
                  <Text style={styles.setupMeta}>
                    Updated {formatTimestamp(setup.updatedAt)}
                  </Text>

                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => onLoad(setup)}
                      style={[styles.actionButton, styles.primaryAction]}>
                      <Text style={styles.primaryActionText}>Load</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDuplicate(setup.id)}
                      style={[styles.actionButton, styles.secondaryAction]}>
                      <Text style={styles.secondaryActionText}>Duplicate</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(setup.id)}
                      style={[styles.actionButton, styles.deleteAction]}>
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1D19',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: '#1E6E31',
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingBottom: 12,
  },
  emptyText: {
    color: '#4A4A4A',
    fontSize: 15,
  },
  setupCard: {
    backgroundColor: '#FBF9F4',
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  setupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  setupMeta: {
    color: '#667085',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryAction: {
    backgroundColor: '#1E6E31',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: '#F1EEE8',
  },
  secondaryActionText: {
    color: '#1E6E31',
    fontWeight: '700',
  },
  deleteAction: {
    backgroundColor: '#FEE4E2',
  },
  deleteActionText: {
    color: '#B42318',
    fontWeight: '600',
  },
});
