import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addPlayerToTeam,
  deletePlayer as deleteStoredPlayer,
  deleteTeam as deleteStoredTeam,
  getPlayers,
  getTeams,
  saveTeam as saveStoredTeam,
  updatePlayer as updateStoredPlayer,
  updateTeam as updateStoredTeam,
} from '@/storage/teamStorage';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

type TeamsContextValue = {
  isLoading: boolean;
  loadError: string | null;
  teams: Team[];
  players: Player[];
  refreshTeamsData: () => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  renameTeam: (teamId: string, name: string) => Promise<Team>;
  removeTeam: (teamId: string) => Promise<void>;
  createPlayerForTeam: (teamId: string, name: string) => Promise<Player>;
  renamePlayer: (playerId: string, name: string) => Promise<Player>;
  removePlayer: (playerId: string) => Promise<void>;
  getPlayersForTeam: (teamId: string | null | undefined) => Player[];
  getPlayerName: (playerId: string | null | undefined) => string | null;
  getPlayerNumber: (
    teamId: string | null | undefined,
    playerId: string | null | undefined
  ) => number | null;
  getTeamName: (teamId: string | null | undefined) => string | null;
};

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const refreshTeamsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [nextTeams, nextPlayers] = await Promise.all([getTeams(), getPlayers()]);
      setTeams(nextTeams);
      setPlayers(nextPlayers);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load teams.');
      setTeams([]);
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTeamsData();
  }, [refreshTeamsData]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshTeamsData();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [refreshTeamsData]);

  const value = useMemo<TeamsContextValue>(
    () => ({
      isLoading,
      loadError,
      teams,
      players,
      refreshTeamsData,
      createTeam: async (name) => {
        const nextTeam = await saveStoredTeam(name);
        await refreshTeamsData();
        return nextTeam;
      },
      renameTeam: async (teamId, name) => {
        const nextTeam = await updateStoredTeam(teamId, { name });
        await refreshTeamsData();
        return nextTeam;
      },
      removeTeam: async (teamId) => {
        const team = teams.find((item) => item.id === teamId);

        if (team) {
          await Promise.all(team.playerIds.map((playerId) => deleteStoredPlayer(playerId)));
        }

        await deleteStoredTeam(teamId);
        await refreshTeamsData();
      },
      createPlayerForTeam: async (teamId, name) => {
        const nextPlayer = await addPlayerToTeam(teamId, name);
        await refreshTeamsData();
        return nextPlayer;
      },
      renamePlayer: async (playerId, name) => {
        const nextPlayer = await updateStoredPlayer(playerId, name);
        await refreshTeamsData();
        return nextPlayer;
      },
      removePlayer: async (playerId) => {
        await deleteStoredPlayer(playerId);
        await refreshTeamsData();
      },
      getPlayersForTeam: (teamId) => {
        if (!teamId) {
          return [];
        }

        const team = teams.find((item) => item.id === teamId);

        if (!team) {
          return [];
        }

        return team.playerIds
          .map((playerId) => players.find((player) => player.id === playerId))
          .filter((player): player is Player => Boolean(player));
      },
      getPlayerName: (playerId) => {
        if (!playerId) {
          return null;
        }

        return players.find((player) => player.id === playerId)?.name ?? null;
      },
      getPlayerNumber: (teamId, playerId) => {
        if (!teamId || !playerId) {
          return null;
        }

        const team = teams.find((item) => item.id === teamId);

        if (!team) {
          return null;
        }

        const playerIndex = team.playerIds.findIndex((id) => id === playerId);

        return playerIndex >= 0 ? playerIndex + 1 : null;
      },
      getTeamName: (teamId) => {
        if (!teamId) {
          return null;
        }

        return teams.find((team) => team.id === teamId)?.name ?? null;
      },
    }),
    [isLoading, loadError, players, refreshTeamsData, teams]
  );

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const context = useContext(TeamsContext);

  if (!context) {
    throw new Error('useTeams must be used within TeamsProvider');
  }

  return context;
}
