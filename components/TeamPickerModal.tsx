import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Team } from '@/types/team';

type TeamPickerModalProps = {
  visible: boolean;
  title: string;
  teams: Team[];
  selectedTeamId: string | null;
  emptyText?: string;
  onClose: () => void;
  onSelect: (teamId: string | null) => void;
};

export function TeamPickerModal({
  visible,
  title,
  teams,
  selectedTeamId,
  emptyText = 'No teams yet.',
  onClose,
  onSelect,
}: TeamPickerModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            <Pressable
              onPress={() => onSelect(null)}
              style={[
                styles.optionCard,
                selectedTeamId === null && styles.selectedOptionCard,
              ]}>
              <Text
                style={[
                  styles.optionText,
                  selectedTeamId === null && styles.selectedOptionText,
                ]}>
                No team
              </Text>
            </Pressable>

            {teams.length === 0 ? <Text style={styles.emptyText}>{emptyText}</Text> : null}

            {teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() => onSelect(team.id)}
                style={[
                  styles.optionCard,
                  selectedTeamId === team.id && styles.selectedOptionCard,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    selectedTeamId === team.id && styles.selectedOptionText,
                  ]}>
                  {team.name}
                </Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontWeight: '700',
    color: '#0B6623',
  },
  closeText: {
    color: '#0B6623',
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectedOptionCard: {
    backgroundColor: '#0B6623',
    borderColor: '#0B6623',
  },
  optionText: {
    color: '#111111',
    fontSize: 15,
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
  },
});
