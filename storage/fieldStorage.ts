import { createInitialMarkers, type PlayerMarker } from '@/context/FieldMarkersContext';
import { getCurrentSession, getCurrentUserId } from '@/lib/authSession';
import { normalizeFieldConfig } from '@/lib/fieldSetupRules';
import { getFriendlySupabaseErrorMessage } from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';
import type { FieldSetup } from '@/types/fieldSetup';

function cloneMarkers(markers: PlayerMarker[]) {
  return markers.map((marker) => ({ ...marker }));
}

function isValidPlayerMarker(value: unknown): value is PlayerMarker {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const marker = value as Record<string, unknown>;

  return (
    typeof marker.id === 'string' &&
    typeof marker.label === 'string' &&
    (typeof marker.name === 'string' || typeof marker.name === 'undefined') &&
    (typeof marker.playerId === 'string' || typeof marker.playerId === 'undefined') &&
    typeof marker.x === 'number' &&
    typeof marker.y === 'number' &&
    typeof marker.size === 'number' &&
    typeof marker.draggable === 'boolean'
  );
}

function isValidFieldSetup(value: unknown): value is FieldSetup {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const setup = value as Record<string, unknown>;

  return (
    typeof setup.id === 'string' &&
    typeof setup.name === 'string' &&
    Array.isArray(setup.markers) &&
    setup.markers.every(isValidPlayerMarker) &&
    (typeof setup.teamId === 'string' ||
      setup.teamId === null ||
      typeof setup.teamId === 'undefined') &&
    !!setup.fieldConfig &&
    typeof setup.fieldConfig === 'object' &&
    typeof setup.createdAt === 'string' &&
    typeof setup.updatedAt === 'string'
  );
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type FieldRow = {
  id: string;
  user_id: string;
  name: string;
  data: {
    markers?: unknown;
    bowlingType?: unknown;
    format?: unknown;
    overPhase?: unknown;
    batterHand?: unknown;
    fieldConfig?: {
      bowlingType?: unknown;
      format?: unknown;
      overPhase?: unknown;
      batterHand?: unknown;
    } | null;
  } | null;
  linked_note_id?: string | null;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractFieldData(data: FieldRow['data']) {
  if (!isRecord(data)) {
    return null;
  }

  if (isRecord(data.data)) {
    return data.data;
  }

  return data;
}

function extractMarkersFromFieldData(data: FieldRow['data']) {
  const fieldData = extractFieldData(data);
  const markerSource = Array.isArray(fieldData?.markers) ? fieldData.markers : [];
  const markers = markerSource.filter(isValidPlayerMarker);

  if (markers.length > 0) {
    return cloneMarkers(markers);
  }

  return createInitialMarkers();
}

function extractFieldConfigFromFieldData(data: FieldRow['data']) {
  const fieldData = extractFieldData(data);
  const nestedFieldConfig = isRecord(fieldData?.fieldConfig) ? fieldData.fieldConfig : null;

  return normalizeFieldConfig({
    bowlingType: nestedFieldConfig?.bowlingType ?? fieldData?.bowlingType,
    format: nestedFieldConfig?.format ?? fieldData?.format,
    overPhase: nestedFieldConfig?.overPhase ?? fieldData?.overPhase,
    batterHand: nestedFieldConfig?.batterHand ?? fieldData?.batterHand,
  });
}

function buildFieldRowPayload(
  name: string,
  markers: PlayerMarker[],
  teamId: string | null | undefined,
  fieldConfig: FieldSetup['fieldConfig']
) {
  return {
    name: name.trim(),
    data: {
      markers: cloneMarkers(markers),
      bowlingType: fieldConfig.bowlingType,
      format: fieldConfig.format,
      overPhase: fieldConfig.overPhase,
      batterHand: fieldConfig.batterHand,
      fieldConfig: {
        bowlingType: fieldConfig.bowlingType,
        format: fieldConfig.format,
        overPhase: fieldConfig.overPhase,
        batterHand: fieldConfig.batterHand,
      },
    },
    team_id: teamId ?? null,
    updated_at: new Date().toISOString(),
  };
}

function mapFieldRow(row: FieldRow): FieldSetup {
  const markers = extractMarkersFromFieldData(row.data);
  const fieldConfig = extractFieldConfigFromFieldData(row.data);

  console.log('[Field Load] loaded record id:', row?.id);
  console.log('[Field Load] loaded data keys:', Object.keys(extractFieldData(row.data) ?? {}));
  console.log('[Field Load] marker count:', markers.length);

  return {
    id: row.id,
    name: row.name,
    markers,
    teamId: row.team_id ?? null,
    fieldConfig,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentFieldRows() {
  if (!supabase) {
    throw new Error('Cloud storage is unavailable right now.');
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [] as FieldRow[];
  }

  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to load field setups.'));
  }

  return data as FieldRow[];
}

export async function getAllFieldSetups() {
  const rows = await getCurrentFieldRows();
  return rows.map(mapFieldRow).filter(isValidFieldSetup);
}

export async function saveFieldSetup(
  name: string,
  markers: PlayerMarker[],
  teamId?: string | null,
  fieldConfig?: FieldSetup['fieldConfig']
) {
  const trimmedName = name.trim();
  const userId = await getCurrentUserId();
  const normalizedFieldConfig = normalizeFieldConfig(fieldConfig);

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const payload = {
    user_id: userId,
    ...buildFieldRowPayload(trimmedName, markers, teamId, normalizedFieldConfig),
  };

  console.log('[Field Save] activeSetupId:', null);
  console.log('[Field Save] payload:', payload);

  const { data, error } = await supabase
    .from('fields')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to save field setup'));
  }

  return mapFieldRow(data as FieldRow);
}

export async function updateFieldSetup(
  id: string,
  name: string,
  markers: PlayerMarker[],
  teamId?: string | null,
  fieldConfig?: FieldSetup['fieldConfig']
) {
  const trimmedName = name.trim();
  const userId = await getCurrentUserId();
  const normalizedFieldConfig = normalizeFieldConfig(fieldConfig);

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const payload = buildFieldRowPayload(trimmedName, markers, teamId, normalizedFieldConfig);

  console.log('[Field Save] activeSetupId:', id);
  console.log('[Field Save] payload:', payload);

  const { data, error } = await supabase
    .from('fields')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to update field setup'));
  }

  return mapFieldRow(data as FieldRow);
}

export async function deleteFieldSetup(id: string) {
  if (!supabase) {
    throw new Error('Cloud storage is unavailable right now.');
  }

  const session = await getCurrentSession();

  if (!session?.user?.id) {
    throw new Error('You must be signed in to delete a field.');
  }

  const { error } = await supabase
    .from('fields')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to delete field setup.'));
  }
}

export async function duplicateFieldSetup(id: string) {
  const setups = await getAllFieldSetups();
  const originalSetup = setups.find((setup) => setup.id === id);

  if (!originalSetup) {
    return null;
  }

  return saveFieldSetup(
    `${originalSetup.name} Copy`,
    originalSetup.markers.map((marker) => ({ ...marker })),
    originalSetup.teamId ?? null,
    originalSetup.fieldConfig
  );
}
