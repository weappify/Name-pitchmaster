import { supabase } from '@/lib/supabase';
import { normalizeFieldConfig } from '@/lib/fieldSetupRules';
import { getFriendlySupabaseErrorMessage } from '@/lib/supabaseErrors';
import type { FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';
import type { Player } from '@/types/player';
import type { ProfileRecord } from '@/types/profile';
import type { Team } from '@/types/team';

type FieldRow = {
  id: string;
  name: string;
  data: {
    markers?: unknown;
    bowlingType?: unknown;
    format?: unknown;
    overPhase?: unknown;
  } | null;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
};

type NoteRow = {
  id: string;
  title: string;
  content: string;
  linked_field_setup_id?: string | null;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  players?: unknown;
  created_at: string;
  updated_at: string;
};

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const player = value as Record<string, unknown>;
  return typeof player.id === 'string' && typeof player.name === 'string';
}

function getPlayersFromRow(row: TeamRow) {
  if (!Array.isArray(row.players)) {
    return [] as Player[];
  }

  return row.players.filter(isPlayer);
}

function mapFieldRow(row: FieldRow): FieldSetup {
  const markers = Array.isArray(row.data?.markers) ? row.data.markers : [];

  return {
    id: row.id,
    name: row.name,
    markers: markers as FieldSetup['markers'],
    teamId: row.team_id ?? null,
    fieldConfig: normalizeFieldConfig({
      bowlingType: row.data?.bowlingType,
      format: row.data?.format,
      overPhase: row.data?.overPhase,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNoteRow(row: NoteRow): NoteItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    linkedFieldSetupId: row.linked_field_setup_id ?? null,
    teamId: row.team_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export type AdminUserProjects = {
  fields: FieldSetup[];
  notes: NoteItem[];
  playersByTeamId: Record<string, Player[]>;
  teams: Team[];
};

export async function getAdminProfiles() {
  if (!supabase) {
    return [] as ProfileRecord[];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) {
    console.log(
      '[AdminProjects] profiles read failed',
      getFriendlySupabaseErrorMessage(error, 'Unable to load profiles.')
    );
    return [] as ProfileRecord[];
  }

  return data as ProfileRecord[];
}

export async function getAdminUserProjects(userId: string): Promise<AdminUserProjects> {
  if (!supabase) {
    return {
      fields: [],
      notes: [],
      playersByTeamId: {},
      teams: [],
    };
  }

  const [fieldsResult, notesResult, teamsResult] = await Promise.all([
    supabase.from('fields').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('teams').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);

  if (fieldsResult.error || notesResult.error || teamsResult.error) {
    console.log(
      '[AdminProjects] user projects read failed',
      getFriendlySupabaseErrorMessage(
        fieldsResult.error ?? notesResult.error ?? teamsResult.error,
        'Unable to load user projects.'
      )
    );
  }

  const fieldRows = Array.isArray(fieldsResult.data) ? (fieldsResult.data as FieldRow[]) : [];
  const noteRows = Array.isArray(notesResult.data) ? (notesResult.data as NoteRow[]) : [];
  const teamRows = Array.isArray(teamsResult.data) ? (teamsResult.data as TeamRow[]) : [];

  return {
    fields: fieldRows.map(mapFieldRow),
    notes: noteRows.map(mapNoteRow),
    playersByTeamId: Object.fromEntries(
      teamRows.map((row) => [row.id, getPlayersFromRow(row)])
    ),
    teams: teamRows.map(mapTeamRow),
  };
}

export async function deleteAdminField(userId: string, fieldId: string) {
  if (!supabase) {
    return;
  }

  await Promise.all([
    supabase
      .from('notes')
      .update({
        linked_field_setup_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('linked_field_setup_id', fieldId),
    supabase.from('fields').delete().eq('user_id', userId).eq('id', fieldId),
  ]);
}

export async function deleteAdminNote(userId: string, noteId: string) {
  if (!supabase) {
    return;
  }

  await Promise.all([
    supabase
      .from('fields')
      .update({
        linked_note_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('linked_note_id', noteId),
    supabase.from('notes').delete().eq('user_id', userId).eq('id', noteId),
  ]);
}

export async function deleteAdminTeam(userId: string, teamId: string) {
  if (!supabase) {
    return;
  }

  await Promise.all([
    supabase
      .from('fields')
      .update({
        team_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('team_id', teamId),
    supabase
      .from('notes')
      .update({
        team_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('team_id', teamId),
    supabase.from('teams').delete().eq('user_id', userId).eq('id', teamId),
  ]);
}
