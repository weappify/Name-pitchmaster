import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MarkerRole } from '@/lib/fieldSetupRules';
import type { Player } from '@/types/player';
import { FieldRolePickerModal, type FieldRoleOption } from './FieldRolePickerModal';

type AvailablePlayerOption = Player & {
  number: number;
  disabled?: boolean;
};

type MarkerInspectorPanelProps = {
  displayNumber: string;
  name: string;
  size: number;
  embedded?: boolean;
  showCloseButton?: boolean;
  role: MarkerRole;
  roleLabel: string;
  roleOptions: FieldRoleOption[];
  teamName: string | null;
  assignedPlayerId: string | null | undefined;
  assignedPlayerName: string | null;
  assignedPlayerNumber: number | null;
  availablePlayers: AvailablePlayerOption[];
  onClose: () => void;
  onNameChange: (name: string) => void;
  onRoleChange: (role: MarkerRole) => void;
  onSizeChange: (size: number) => void;
  onSyncSize: () => void;
  onAssignPlayer: (playerId: string | null) => void;
};

const MIN_MARKER_SIZE = 5;
const SIZE_STEP = 2;

export function MarkerInspectorPanel({
  displayNumber,
  name,
  size,
  embedded = false,
  showCloseButton = true,
  role,
  roleLabel,
  roleOptions,
  teamName,
  assignedPlayerId,
  assignedPlayerName,
  assignedPlayerNumber,
  availablePlayers,
  onClose,
  onNameChange,
  onRoleChange,
  onSizeChange,
  onSyncSize,
  onAssignPlayer,
}: MarkerInspectorPanelProps) {
  const [sizeInput, setSizeInput] = useState(String(size));
  const [isRolePickerVisible, setIsRolePickerVisible] = useState(false);

  useEffect(() => {
    setSizeInput(String(size));
  }, [size]);

  const commitSize = (value: string) => {
    const parsedSize = Number.parseInt(value, 10);

    if (!Number.isFinite(parsedSize)) {
      setSizeInput(String(size));
      return;
    }

    const nextSize = Math.max(MIN_MARKER_SIZE, parsedSize);

    setSizeInput(String(nextSize));
    onSizeChange(nextSize);
  };

  const handleSizeChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');

    setSizeInput(digitsOnly);

    if (digitsOnly === '') {
      return;
    }

    const parsedSize = Number.parseInt(digitsOnly, 10);

    if (!Number.isFinite(parsedSize)) {
      return;
    }

    onSizeChange(Math.max(MIN_MARKER_SIZE, parsedSize));
  };

  const decreaseSize = () => {
    const nextSize = Math.max(MIN_MARKER_SIZE, size - SIZE_STEP);

    setSizeInput(String(nextSize));
    onSizeChange(nextSize);
  };

  const increaseSize = () => {
    const nextSize = size + SIZE_STEP;

    setSizeInput(String(nextSize));
    onSizeChange(nextSize);
  };

  return (
    <View style={[styles.panel, embedded && styles.embeddedPanel]}>
      <View style={styles.header}>
        <Text style={styles.title}>Player Edit</Text>
        {showCloseButton ? (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.label}>Player Number</Text>
      <View style={styles.readOnlyValue}>
        <Text style={styles.readOnlyValueText}>{displayNumber}</Text>
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Display name"
        placeholderTextColor="#6B7280"
        style={styles.input}
      />
      <Pressable onPress={() => onNameChange('')} style={styles.clearButton}>
        <Text style={styles.clearButtonText}>Clear Name</Text>
      </Pressable>

      <Text style={styles.label}>Role</Text>
      <Pressable onPress={() => setIsRolePickerVisible(true)} style={styles.roleButton}>
        <Text style={styles.roleButtonValue}>{roleLabel}</Text>
        <Text style={styles.roleButtonChevron}>⌄</Text>
      </Pressable>

      <Text style={styles.label}>Size</Text>
      <View style={styles.sizeRow}>
        <Pressable onPress={decreaseSize} style={styles.sizeButton}>
          <Text style={styles.sizeButtonText}>-</Text>
        </Pressable>
        <TextInput
          value={sizeInput}
          onChangeText={handleSizeChange}
          onBlur={() => commitSize(sizeInput)}
          onSubmitEditing={() => commitSize(sizeInput)}
          keyboardType="number-pad"
          style={styles.sizeInput}
        />
        <Pressable onPress={increaseSize} style={styles.sizeButton}>
          <Text style={styles.sizeButtonText}>+</Text>
        </Pressable>
      </View>

      <Pressable onPress={onSyncSize} style={styles.applyButton}>
        <Text style={styles.applyButtonText}>Sync size</Text>
      </Pressable>

      <Text style={styles.label}>Assign Player</Text>
      <ScrollView style={styles.playersList} contentContainerStyle={styles.playersListContent}>
        {teamName ? (
          <Text style={styles.teamText}>Team: {teamName}</Text>
        ) : (
          <Text style={styles.helperText}>Select a team on the field screen first.</Text>
        )}

        <Pressable
          onPress={() => onAssignPlayer(null)}
          style={[
            styles.playerButton,
            !assignedPlayerId && styles.selectedPlayerButton,
          ]}>
          <Text
            style={[
              styles.playerButtonText,
              !assignedPlayerId && styles.selectedPlayerButtonText,
            ]}>
            Use marker label
          </Text>
        </Pressable>

        {assignedPlayerName ? (
          <Text style={styles.helperText}>
            Assigned: {assignedPlayerNumber ? `${assignedPlayerNumber}. ` : ''}
            {assignedPlayerName}
          </Text>
        ) : null}

        {availablePlayers.map((player) => (
          <Pressable
            key={player.id}
            disabled={player.disabled}
            onPress={() => onAssignPlayer(player.id)}
            style={[
              styles.playerButton,
              player.disabled && styles.disabledPlayerButton,
              assignedPlayerId === player.id && styles.selectedPlayerButton,
            ]}>
            <Text
              style={[
                styles.playerButtonText,
                player.disabled && styles.disabledPlayerButtonText,
                assignedPlayerId === player.id && styles.selectedPlayerButtonText,
              ]}>
              {player.number}. {player.name}
            </Text>
          </Pressable>
        ))}

        {teamName && availablePlayers.length === 0 ? (
          <Text style={styles.helperText}>Add players in the Teams tab to assign them here.</Text>
        ) : null}
      </ScrollView>

      <FieldRolePickerModal
        visible={isRolePickerVisible}
        selectedRole={role}
        options={roleOptions}
        onClose={() => setIsRolePickerVisible(false)}
        onSelect={(nextRole) => {
          onRoleChange(nextRole);
          setIsRolePickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 248,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    maxHeight: '75%',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  embeddedPanel: {
    position: 'relative',
    left: undefined,
    top: undefined,
    width: '100%',
    maxHeight: undefined,
    padding: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1D19',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1EEE8',
    borderRadius: 10,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E6E31',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6F6B62',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#FBF9F4',
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    color: '#1F1D19',
  },
  inputDisabled: {
    backgroundColor: '#F1EEE8',
    color: '#8B8479',
  },
  readOnlyValue: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  readOnlyValueText: {
    color: '#1F1D19',
    fontSize: 16,
    fontWeight: '800',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1EEE8',
  },
  clearButtonText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },
  roleButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DDD2',
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleButtonValue: {
    color: '#1F1D19',
    fontSize: 14,
    fontWeight: '700',
  },
  roleButtonChevron: {
    color: '#6F6B62',
    fontSize: 14,
    fontWeight: '700',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sizeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  sizeInput: {
    flex: 1,
    minWidth: 56,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1D19',
    backgroundColor: '#FBF9F4',
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  applyButton: {
    marginTop: 14,
    backgroundColor: '#F1EEE8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  playersList: {
    marginTop: 12,
    maxHeight: 220,
  },
  playersListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  teamText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: '#6F6B62',
    fontSize: 12,
    lineHeight: 18,
  },
  playerButton: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FBF9F4',
  },
  selectedPlayerButton: {
    backgroundColor: '#1E6E31',
    borderColor: '#1E6E31',
  },
  disabledPlayerButton: {
    backgroundColor: '#F1EEE8',
    borderColor: '#D0C9BC',
    opacity: 0.7,
  },
  playerButtonText: {
    color: '#1F1D19',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledPlayerButtonText: {
    color: '#8B8479',
  },
  selectedPlayerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
