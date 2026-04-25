import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

type TeamEditorModalProps = {
  visible: boolean;
  team: Team | null;
  players: Player[];
  onClose: () => void;
  onRenameTeam: (name: string) => Promise<void> | void;
  onDeleteTeam: () => Promise<void> | void;
  onAddPlayer: (name: string) => Promise<void> | void;
  onRenamePlayer: (playerId: string, name: string) => Promise<void> | void;
  onDeletePlayer: (playerId: string) => Promise<void> | void;
};

export function TeamEditorModal({
  visible,
  team,
  players,
  onClose,
  onRenameTeam,
  onDeleteTeam,
  onAddPlayer,
  onRenamePlayer,
  onDeletePlayer,
}: TeamEditorModalProps) {
  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTeamName(team?.name ?? '');
    setNewPlayerName('');
    setPlayerDrafts(Object.fromEntries(players.map((player) => [player.id, player.name])));
  }, [players, team, visible]);

  if (!team) {
    return null;
  }

  const handleAddPlayer = async () => {
    const trimmedName = newPlayerName.trim();

    if (!trimmedName) {
      return;
    }

    await onAddPlayer(trimmedName);
    setNewPlayerName('');
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Edit Team</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>Team Name</Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              onBlur={() => onRenameTeam(teamName)}
              onSubmitEditing={() => onRenameTeam(teamName)}
              placeholder="Team name"
              placeholderTextColor="#7A7A7A"
              style={styles.input}
            />

            <View style={styles.playerHeaderRow}>
              <Text style={styles.sectionTitle}>Players</Text>
              <Pressable onPress={onDeleteTeam} style={styles.deleteTeamButton}>
                <Text style={styles.deleteTeamButtonText}>Delete Team</Text>
              </Pressable>
            </View>

            <View style={styles.addPlayerRow}>
              <TextInput
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder="New player name"
                placeholderTextColor="#7A7A7A"
                style={[styles.input, styles.addPlayerInput]}
              />
              <Pressable onPress={handleAddPlayer} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            {players.length === 0 ? (
              <Text style={styles.emptyText}>Add players to use them in field setups.</Text>
            ) : null}

            {players.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <TextInput
                  value={playerDrafts[player.id] ?? player.name}
                  onChangeText={(value) =>
                    setPlayerDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [player.id]: value,
                    }))
                  }
                  onBlur={() => onRenamePlayer(player.id, playerDrafts[player.id] ?? player.name)}
                  onSubmitEditing={() =>
                    onRenamePlayer(player.id, playerDrafts[player.id] ?? player.name)
                  }
                  style={[styles.input, styles.playerInput]}
                />
                <Pressable
                  onPress={() => onDeletePlayer(player.id)}
                  style={styles.deletePlayerButton}>
                  <Text style={styles.deletePlayerButtonText}>Delete</Text>
                </Pressable>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  contentContainer: {
    gap: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6F6B62',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4DDD2',
    borderRadius: 12,
    backgroundColor: '#FBF9F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F1D19',
  },
  playerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteTeamButton: {
    backgroundColor: '#FEE4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteTeamButtonText: {
    color: '#B42318',
    fontWeight: '600',
    fontSize: 13,
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addPlayerInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#1E6E31',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
  },
  playerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  playerInput: {
    flex: 1,
  },
  deletePlayerButton: {
    backgroundColor: '#FEE4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deletePlayerButtonText: {
    color: '#B42318',
    fontWeight: '600',
    fontSize: 13,
  },
});
