import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FieldTemplate } from '@/types/fieldTemplate';

type FieldTemplatesModalProps = {
  visible: boolean;
  templates: FieldTemplate[];
  onClose: () => void;
  onLoad: (template: FieldTemplate) => void;
  onCustomField: () => void;
};

export function FieldTemplatesModal({
  visible,
  templates,
  onClose,
  onLoad,
  onCustomField,
}: FieldTemplatesModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Templates</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            <Pressable onPress={onCustomField} style={[styles.templateCard, styles.customTemplateCard]}>
              <Text style={styles.templateName}>Custom Field</Text>
              <Text style={styles.templateHint}>
                Create a named setup from your current field arrangement
              </Text>
            </Pressable>

            {templates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => onLoad(template)}
                style={styles.templateCard}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateHint}>Load this as a starting setup</Text>
              </Pressable>
            ))}
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
  templateCard: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    backgroundColor: '#FBF9F4',
  },
  customTemplateCard: {
    borderColor: '#1E6E31',
    backgroundColor: '#F1EEE8',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  templateHint: {
    fontSize: 13,
    color: '#6F6B62',
  },
});
