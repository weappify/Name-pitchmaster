import { getCurrentUserId } from '@/lib/authSession';
import { getFriendlySupabaseErrorMessage } from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSafeName(name: string, fallback: string) {
  const trimmedName = name.trim();

  return trimmedName || fallback;
}

function isValidPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const player = value as Record<string, unknown>;

  return typeof player.id === 'string' && typeof player.name === 'string';
}

function isValidTeam(value: unknown): value is Team {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const team = value as Record<string, unknown>;

  return (
    typeof team.id === 'string' &&
    typeof team.name === 'string' &&
    Array.isArray(team.playerIds) &&
    team.playerIds.every((playerId) => typeof playerId === 'string') &&
    typeof team.createdAt === 'string' &&
    typeof team.updatedAt === 'string'
  );
}

type TeamRow = {
  id: string;
  user_id: string;
  name: string;
  players?: unknown;
  created_at: string;
  updated_at: string;
};

function getPlayersFromRow(row: TeamRow) {
  if (!Array.isArray(row.players)) {
    return [] as Player[];
  }

  return row.players.filter(isValidPlayer);
}

function mapTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    playerIds: getPlayersFromRow(row).map((player) => player.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTeamRows() {
  if (!supabase) {
    throw new Error('Cloud storage is unavailable right now.');
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as TeamRow[];
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to load teams.'));
  }

  return data as TeamRow[];
}

export async function getTeams() {
  const rows = await getTeamRows();
  return rows.map(mapTeamRow).filter(isValidTeam);
}

export async function saveTeam(name: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('teams')
    .insert({
      user_id: userId,
      name: getSafeName(name, 'Untitled Team'),
      players: [],
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to save team'));
  }

  return mapTeamRow(data as TeamRow);
}

export async function updateTeam(
  id: string,
  updates: Partial<Pick<Team, 'name' | 'playerIds'>>
) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const rows = await getTeamRows();
  const currentRow = rows.find((team) => team.id === id);

  if (!currentRow) {
    throw new Error('Team not found');
  }

  const currentPlayers = getPlayersFromRow(currentRow);
  const nextPlayers = updates.playerIds
    ? updates.playerIds
        .map((playerId) => currentPlayers.find((player) => player.id === playerId))
        .filter((player): player is Player => Boolean(player))
    : currentPlayers;

  const { data, error } = await supabase
    .from('teams')
    .update({
      name:
        typeof updates.name === 'string'
          ? getSafeName(updates.name, currentRow.name)
          : currentRow.name,
      players: nextPlayers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to update team'));
  }

  return mapTeamRow(data as TeamRow);
}

export async function deleteTeam(id: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return;
  }

  const [fieldsResult, notesResult, teamResult] = await Promise.all([
    supabase
      .from('fields')
      .update({
        team_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('team_id', id),
    supabase
      .from('notes')
      .update({
        team_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('team_id', id),
    supabase.from('teams').delete().eq('id', id).eq('user_id', userId),
  ]);

  if (fieldsResult.error) {
    throw new Error(getFriendlySupabaseErrorMessage(fieldsResult.error, 'Unable to clear linked fields.'));
  }

  if (notesResult.error) {
    throw new Error(getFriendlySupabaseErrorMessage(notesResult.error, 'Unable to clear linked notes.'));
  }

  if (teamResult.error) {
    throw new Error(getFriendlySupabaseErrorMessage(teamResult.error, 'Unable to delete team.'));
  }
}

export async function getPlayers() {
  const rows = await getTeamRows();
  const playersById = new Map<string, Player>();

  rows.forEach((row) => {
    getPlayersFromRow(row).forEach((player) => {
      playersById.set(player.id, player);
    });
  });

  return [...playersById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addPlayerToTeam(teamId: string, name: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const rows = await getTeamRows();
  const currentRow = rows.find((team) => team.id === teamId);

  if (!currentRow) {
    throw new Error('Team not found');
  }

  const nextPlayer: Player = {
    id: createId(),
    name: getSafeName(name, 'Unnamed Player'),
  };

  const nextPlayers = [...getPlayersFromRow(currentRow), nextPlayer];

  const { error } = await supabase
    .from('teams')
    .update({
      players: nextPlayers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to add player to team.'));
  }

  return nextPlayer;
}

export async function updatePlayer(id: string, name: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const rows = await getTeamRows();
  let updatedPlayer: Player | null = null;

  await Promise.all(
    rows.map(async (row) => {
      const nextPlayers = getPlayersFromRow(row).map((player) => {
        if (player.id !== id) {
          return player;
        }

        updatedPlayer = {
          ...player,
          name: getSafeName(name, player.name),
        };

        return updatedPlayer;
      });

      if (!nextPlayers.some((player) => player.id === id)) {
        return;
      }

      await supabase
        .from('teams')
        .update({
          players: nextPlayers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('user_id', userId)
        .throwOnError();
    })
  );

  if (!updatedPlayer) {
    updatedPlayer = {
      id,
      name: getSafeName(name, 'Unnamed Player'),
    };
  }

  return updatedPlayer;
}

export async function deletePlayer(playerId: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return;
  }

  const rows = await getTeamRows();

  await Promise.all(
    rows.map(async (row) => {
      const currentPlayers = getPlayersFromRow(row);

      if (!currentPlayers.some((player) => player.id === playerId)) {
        return;
      }

      await supabase
        .from('teams')
        .update({
          players: currentPlayers.filter((player) => player.id !== playerId),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('user_id', userId)
        .throwOnError();
    })
  );
}
