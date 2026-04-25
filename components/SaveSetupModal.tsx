import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  FORMAT_OPTIONS,
  OVER_PHASE_OPTIONS,
  normalizeFieldConfig,
} from '@/lib/fieldSetupRules';
import type { FieldConfig } from '@/types/fieldSetup';
import type { Team } from '@/types/team';

type SaveSetupModalProps = {
  visible: boolean;
  initialName: string;
  initialTeamId?: string | null;
  teams?: Team[];
  isUpdating: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    teamId: string | null,
    fieldConfig?: FieldConfig
  ) => Promise<void> | void;
  title?: string;
  submitLabel?: string;
  placeholder?: string;
  enableFieldConfig?: boolean;
  initialFieldConfig?: FieldConfig;
};

export function SaveSetupModal({
  visible,
  initialName,
  initialTeamId = null,
  teams = [],
  isUpdating,
  onClose,
  onSave,
  title,
  submitLabel,
  placeholder,
  enableFieldConfig = false,
  initialFieldConfig,
}: SaveSetupModalProps) {
  const [name, setName] = useState(initialName);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(initialTeamId);
  const [fieldConfig, setFieldConfig] = useState(normalizeFieldConfig(initialFieldConfig));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(initialName);
    setSelectedTeamId(initialTeamId);
    setFieldConfig(normalizeFieldConfig(initialFieldConfig));
    setError('');
  }, [initialFieldConfig, initialName, initialTeamId, visible]);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Enter a setup name.');
      return;
    }

    try {
      await onSave(trimmedName, selectedTeamId, enableFieldConfig ? fieldConfig : undefined);
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Unable to save right now.'
      );
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title ?? (isUpdating ? 'Update Setup' : 'Save Setup')}</Text>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (error) {
                setError('');
              }
            }}
            placeholder={placeholder ?? 'Field setup name'}
            placeholderTextColor="#7A7A7A"
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {enableFieldConfig ? (
            <>
              <Text style={styles.sectionTitle}>Bowling Type</Text>
              <View style={styles.optionGroup}>
                {[
                  { label: 'Spin', value: 'spin' as const },
                  { label: 'Pace', value: 'pace' as const },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setFieldConfig((currentConfig) => ({
                        ...currentConfig,
                        bowlingType: option.value,
                      }))
                    }
                    style={[
                      styles.teamOption,
                      fieldConfig.bowlingType === option.value && styles.selectedTeamOption,
                    ]}>
                    <Text
                      style={[
                        styles.teamOptionText,
                        fieldConfig.bowlingType === option.value && styles.selectedTeamOptionText,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Batter Hand</Text>
              <View style={styles.optionGroup}>
                {[
                  { label: 'Right-handed', value: 'right' as const },
                  { label: 'Left-handed', value: 'left' as const },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setFieldConfig((currentConfig) => ({
                        ...currentConfig,
                        batterHand: option.value,
                      }))
                    }
                    style={[
                      styles.teamOption,
                      fieldConfig.batterHand === option.value && styles.selectedTeamOption,
                    ]}>
                    <Text
                      style={[
                        styles.teamOptionText,
                        fieldConfig.batterHand === option.value && styles.selectedTeamOptionText,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Format</Text>
              <View style={styles.optionGroup}>
                {FORMAT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setFieldConfig((currentConfig) =>
                        normalizeFieldConfig({
                          ...currentConfig,
                          format: option.value,
                        })
                      )
                    }
                    style={[
                      styles.teamOption,
                      fieldConfig.format === option.value && styles.selectedTeamOption,
                    ]}>
                    <Text
                      style={[
                        styles.teamOptionText,
                        fieldConfig.format === option.value && styles.selectedTeamOptionText,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {fieldConfig.format !== 'test' ? (
                <>
                  <Text style={styles.sectionTitle}>Over Range</Text>
                  <View style={styles.optionGroup}>
                    {OVER_PHASE_OPTIONS[fieldConfig.format].map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() =>
                          setFieldConfig((currentConfig) => ({
                            ...currentConfig,
                            overPhase: option.value,
                          }))
                        }
                        style={[
                          styles.teamOption,
                          fieldConfig.overPhase === option.value && styles.selectedTeamOption,
                        ]}>
                        <Text
                          style={[
                            styles.teamOptionText,
                            fieldConfig.overPhase === option.value &&
                              styles.selectedTeamOptionText,
                          ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Over Range</Text>
                  <Text style={styles.helperText}>No restrictions for Test / Multi-day fields.</Text>
                </>
              )}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Team</Text>
          <ScrollView style={styles.teamsList} contentContainerStyle={styles.teamsListContent}>
            <Pressable
              onPress={() => setSelectedTeamId(null)}
              style={[
                styles.teamOption,
                selectedTeamId === null && styles.selectedTeamOption,
              ]}>
              <Text
                style={[
                  styles.teamOptionText,
                  selectedTeamId === null && styles.selectedTeamOptionText,
                ]}>
                No team
              </Text>
            </Pressable>

            {teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() => setSelectedTeamId(team.id)}
                style={[
                  styles.teamOption,
                  selectedTeamId === team.id && styles.selectedTeamOption,
                ]}>
                <Text
                  style={[
                    styles.teamOptionText,
                    selectedTeamId === team.id && styles.selectedTeamOptionText,
                  ]}>
                  {team.name}
                </Text>
              </Pressable>
            ))}

            {teams.length === 0 ? (
              <Text style={styles.helperText}>No teams yet. You can still save without one.</Text>
            ) : null}
          </ScrollView>

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>
                {submitLabel ?? (isUpdating ? 'Update' : 'Save')}
              </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1D19',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F1D19',
  },
  errorText: {
    color: '#B42318',
    marginTop: 8,
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#6F6B62',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  teamsList: {
    maxHeight: 180,
  },
  teamsListContent: {
    gap: 8,
  },
  optionGroup: {
    gap: 8,
  },
  teamOption: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedTeamOption: {
    backgroundColor: '#1E6E31',
    borderColor: '#1E6E31',
  },
  teamOptionText: {
    color: '#1F1D19',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedTeamOptionText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  helperText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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
});
