import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MarkerRole } from '@/lib/fieldSetupRules';

export type FieldRoleOption = {
  value: MarkerRole;
  label: string;
  disabled?: boolean;
};

type FieldRolePickerModalProps = {
  visible: boolean;
  selectedRole: MarkerRole | null;
  options: FieldRoleOption[];
  onClose: () => void;
  onSelect: (role: MarkerRole) => void;
};

export function FieldRolePickerModal({
  visible,
  selectedRole,
  options,
  onClose,
  onSelect,
}: FieldRolePickerModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>Select Role</Text>
          <Text style={styles.subtitle}>Choose how this marker should behave on the field.</Text>

          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                disabled={option.disabled}
                onPress={() => onSelect(option.value)}
                style={[
                  styles.option,
                  selectedRole === option.value && styles.optionSelected,
                  option.disabled && styles.optionDisabled,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    selectedRole === option.value && styles.optionTextSelected,
                    option.disabled && styles.optionTextDisabled,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.helperText}>
            Bowler and keeper markers stay unique, so fielders can swap into those roles.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: '#1F1D19',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6F6B62',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  options: {
    gap: 10,
    marginTop: 16,
  },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: '#1E6E31',
    backgroundColor: '#EEF6F0',
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionText: {
    color: '#1F1D19',
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#1E6E31',
  },
  optionTextDisabled: {
    color: '#6F6B62',
  },
  helperText: {
    marginTop: 14,
    color: '#6F6B62',
    fontSize: 12,
    lineHeight: 18,
  },
});
