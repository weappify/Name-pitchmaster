import { getCurrentSession, getCurrentUserId } from '@/lib/authSession';
import {
  DATABASE_SETUP_INCOMPLETE_MESSAGE,
  getFriendlySupabaseErrorMessage,
} from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';
import type { NoteItem } from '@/types/noteItem';

function isValidNoteItem(value: unknown): value is NoteItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    (typeof note.linkedFieldSetupId === 'string' ||
      note.linkedFieldSetupId === null ||
      typeof note.linkedFieldSetupId === 'undefined') &&
    (typeof note.teamId === 'string' ||
      note.teamId === null ||
      typeof note.teamId === 'undefined') &&
    typeof note.createdAt === 'string' &&
    typeof note.updatedAt === 'string'
  );
}

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  linked_field_setup_id?: string | null;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
};

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

type FieldNoteLinkRow = {
  id: string;
  linked_note_id?: string | null;
  team_id?: string | null;
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function isNotesTableMissingError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  return (
    normalizedMessage.includes("could not find the table 'public.notes'") ||
    (normalizedMessage.includes("relation 'public.notes'") &&
      normalizedMessage.includes('does not exist')) ||
    (normalizedMessage.includes('relation "public.notes"') &&
      normalizedMessage.includes('does not exist'))
  );
}

function isMissingOptionalNotesColumnError(error: unknown) {
  const normalizedMessage = getErrorMessage(error, '').toLowerCase();

  return (
    normalizedMessage.includes('linked_field_setup_id') ||
    normalizedMessage.includes('team_id')
  );
}

function getNoteWriteErrorMessage(error: unknown, fallbackMessage: string) {
  if (isNotesTableMissingError(error)) {
    return DATABASE_SETUP_INCOMPLETE_MESSAGE;
  }

  return getErrorMessage(error, fallbackMessage);
}

async function insertNoteRow(
  payload: Pick<NoteRow, 'user_id' | 'title' | 'content' | 'created_at' | 'updated_at'> & {
    linked_field_setup_id?: string | null;
    team_id?: string | null;
  }
) {
  if (!supabase) {
    return { data: null, error: new Error('Cloud storage is unavailable right now.') };
  }

  const result = await supabase.from('notes').insert(payload).select().single();

  if (!result.error || !isMissingOptionalNotesColumnError(result.error)) {
    return result;
  }

  return supabase
    .from('notes')
    .insert({
      user_id: payload.user_id,
      title: payload.title,
      content: payload.content,
      created_at: payload.created_at,
      updated_at: payload.updated_at,
    })
    .select()
    .single();
}

async function updateNoteRow(
  noteId: string,
  userId: string,
  payload: Pick<NoteRow, 'title' | 'content' | 'updated_at'> & {
    linked_field_setup_id?: string | null;
    team_id?: string | null;
  }
) {
  if (!supabase) {
    return { data: null, error: new Error('Cloud storage is unavailable right now.') };
  }

  const result = await supabase
    .from('notes')
    .update(payload)
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (!result.error || !isMissingOptionalNotesColumnError(result.error)) {
    return result;
  }

  return supabase
    .from('notes')
    .update({
      title: payload.title,
      content: payload.content,
      updated_at: payload.updated_at,
    })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();
}

async function syncFieldLinkedNote(fieldSetupId: string | null | undefined, noteId: string | null) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId || !fieldSetupId) {
    return;
  }

  const { error } = await supabase
    .from('fields')
    .update({
      linked_note_id: noteId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fieldSetupId)
    .eq('user_id', userId);

  if (error) {
    console.log(
      '[NoteStorage] field link sync failed',
      getFriendlySupabaseErrorMessage(error, 'Unable to sync field note link.')
    );
  }
}

function getSafeTitle(title: string) {
  const trimmedTitle = title.trim();

  return trimmedTitle || 'Untitled Note';
}

export async function getAllNotes() {
  if (!supabase) {
    throw new Error('Cloud storage is unavailable right now.');
  }

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return [] as NoteItem[];
  }

  const [notesResult, fieldsResult] = await Promise.all([
    supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('fields')
      .select('id, linked_note_id, team_id')
      .eq('user_id', userId),
  ]);

  if (notesResult.error || !Array.isArray(notesResult.data)) {
    throw new Error(getFriendlySupabaseErrorMessage(notesResult.error, 'Unable to load notes.'));
  }

  const fieldRows = Array.isArray(fieldsResult.data)
    ? (fieldsResult.data as FieldNoteLinkRow[])
    : [];
  const fieldLinkByNoteId = new Map<string, FieldNoteLinkRow>();

  fieldRows.forEach((row) => {
    if (row.linked_note_id) {
      fieldLinkByNoteId.set(row.linked_note_id, row);
    }
  });

  return (notesResult.data as NoteRow[])
    .map((row) => {
      const mappedNote = mapNoteRow(row);
      const linkedField = fieldLinkByNoteId.get(row.id);

      return {
        ...mappedNote,
        linkedFieldSetupId: mappedNote.linkedFieldSetupId ?? linkedField?.id ?? null,
        teamId: mappedNote.teamId ?? linkedField?.team_id ?? null,
      };
    })
    .filter(isValidNoteItem);
}

export async function saveNote(
  title: string,
  content: string,
  linkedFieldSetupId?: string | null,
  teamId?: string | null
) {
  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const now = new Date().toISOString();
  const { data, error } = await insertNoteRow({
    user_id: userId,
    title: getSafeTitle(title),
    content: content.trim(),
    linked_field_setup_id: linkedFieldSetupId ?? null,
    team_id: teamId ?? null,
    created_at: now,
    updated_at: now,
  });

  if (error || !data) {
    throw new Error(getNoteWriteErrorMessage(error, 'Unable to save note'));
  }

  await syncFieldLinkedNote(linkedFieldSetupId, (data as NoteRow).id);

  return {
    ...mapNoteRow(data as NoteRow),
    linkedFieldSetupId: linkedFieldSetupId ?? null,
    teamId: teamId ?? null,
  };
}

export async function updateNote(
  id: string,
  title: string,
  content: string,
  linkedFieldSetupId?: string | null,
  teamId?: string | null
) {
  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  if (!supabase || !userId) {
    throw new Error('Auth session missing');
  }

  const existingNotes = await getAllNotes();
  const previousNote = existingNotes.find((note) => note.id === id) ?? null;

  const { data, error } = await updateNoteRow(id, userId, {
    title: getSafeTitle(title),
    content: content.trim(),
    linked_field_setup_id: linkedFieldSetupId ?? null,
    team_id: teamId ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error || !data) {
    throw new Error(getNoteWriteErrorMessage(error, 'Unable to update note'));
  }

  if (previousNote?.linkedFieldSetupId && previousNote.linkedFieldSetupId !== linkedFieldSetupId) {
    await syncFieldLinkedNote(previousNote.linkedFieldSetupId, null);
  }

  await syncFieldLinkedNote(linkedFieldSetupId, id);

  return {
    ...mapNoteRow(data as NoteRow),
    linkedFieldSetupId: linkedFieldSetupId ?? null,
    teamId: teamId ?? null,
  };
}

export async function deleteNote(id: string) {
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return;
  }

  const existingNotes = await getAllNotes();
  const existingNote = existingNotes.find((note) => note.id === id) ?? null;

  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to delete note.'));
  }

  if (existingNote?.linkedFieldSetupId) {
    await syncFieldLinkedNote(existingNote.linkedFieldSetupId, null);
  }
}

export async function getLinkedNoteForFieldSetup(fieldSetupId: string) {
  const notes = await getAllNotes();

  return notes.find((note) => note.linkedFieldSetupId === fieldSetupId) ?? null;
}
