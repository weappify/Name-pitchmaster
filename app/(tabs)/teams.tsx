import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPageHeader } from '@/components/AppPageHeader';
import { SaveSetupModal } from '@/components/SaveSetupModal';
import { TeamEditorModal } from '@/components/TeamEditorModal';
import { useTeams } from '@/context/TeamsContext';

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    isLoading,
    loadError,
    teams,
    createPlayerForTeam,
    createTeam,
    getPlayersForTeam,
    removePlayer,
    removeTeam,
    renamePlayer,
    renameTeam,
  } = useTeams();
  const isWide = width >= 980;
  const contentGap = isWide ? 22 : 16;
  const [isCreateTeamVisible, setIsCreateTeamVisible] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams]
  );

  const selectedTeamPlayers = useMemo(
    () => getPlayersForTeam(selectedTeamId),
    [getPlayersForTeam, selectedTeamId]
  );

  const handleCreateTeam = async (name: string) => {
    const nextTeam = await createTeam(name);
    setIsCreateTeamVisible(false);
    setSelectedTeamId(nextTeam.id);
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
          title="Teams"
          subtitle="Create teams, manage player lists, and keep field assignments aligned with the same shared data."
          actionLabel="New Team"
          onActionPress={() => setIsCreateTeamVisible(true)}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team List</Text>
          <Text style={styles.sectionMeta}>
            {teams.length} {teams.length === 1 ? 'team' : 'teams'}
          </Text>
        </View>

        {loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Teams unavailable</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
          </View>
        ) : teams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isLoading ? 'Loading teams...' : 'No teams yet'}</Text>
            <Text style={styles.emptyText}>
              {isLoading
                ? 'Fetching your saved teams and player lists.'
                : 'Create a team to start assigning players to field markers.'}
            </Text>
          </View>
        ) : (
          teams.map((team) => {
            const playerCount = getPlayersForTeam(team.id).length;

            return (
              <Pressable
                key={team.id}
                onPress={() => setSelectedTeamId(team.id)}
                style={styles.teamCard}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.teamMeta}>
                  {playerCount} {playerCount === 1 ? 'player' : 'players'}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <SaveSetupModal
        visible={isCreateTeamVisible}
        initialName=""
        isUpdating={false}
        title="Create Team"
        submitLabel="Create"
        placeholder="Team name"
        onClose={() => setIsCreateTeamVisible(false)}
        onSave={handleCreateTeam}
      />

      <TeamEditorModal
        visible={Boolean(selectedTeam)}
        team={selectedTeam}
        players={selectedTeamPlayers}
        onClose={() => setSelectedTeamId(null)}
        onRenameTeam={async (name) => {
          if (!selectedTeam) {
            return;
          }

          await renameTeam(selectedTeam.id, name);
        }}
        onDeleteTeam={async () => {
          if (!selectedTeam) {
            return;
          }

          await removeTeam(selectedTeam.id);
          setSelectedTeamId(null);
        }}
        onAddPlayer={async (name) => {
          if (!selectedTeam) {
            return;
          }

          await createPlayerForTeam(selectedTeam.id, name);
        }}
        onRenamePlayer={renamePlayer}
        onDeletePlayer={removePlayer}
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
  teamCard: {
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
  teamName: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  teamMeta: {
    color: '#56534D',
    fontSize: 14,
    fontWeight: '600',
  },
});
