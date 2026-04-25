import type { User } from '@supabase/supabase-js';

import { ADMIN_EMAIL } from '@/lib/constants';
import { getFriendlySupabaseErrorMessage } from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';

function getMetadataValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export type ProfileRecord = {
  id: string;
  email: string | null;
  name: string | null;
  date_of_birth: string | null;
  is_admin: boolean | null;
  avatar_url: string | null;
};

export async function getProfileRecord(userId: string) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, date_of_birth, is_admin, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.log(
      '[ProfileSync] load failed',
      getFriendlySupabaseErrorMessage(error, 'Unable to load profile.')
    );
    return null;
  }

  return (data as ProfileRecord | null) ?? null;
}

export async function updateProfileAvatar(userId: string, avatarUrl: string | null) {
  if (!supabase || !userId) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      avatar_url: avatarUrl,
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw new Error(getFriendlySupabaseErrorMessage(error, 'Unable to update profile photo.'));
  }
}

export async function syncProfileFromUser(user: User | null | undefined) {
  if (!supabase || !user?.id || !user.email) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      name: getMetadataValue(user.user_metadata?.name),
      date_of_birth: getMetadataValue(user.user_metadata?.date_of_birth),
      avatar_url: getMetadataValue(user.user_metadata?.avatar_url),
      is_admin: user.email === ADMIN_EMAIL,
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    console.log('[ProfileSync] failed', getFriendlySupabaseErrorMessage(error, 'Unable to sync profile.'));
  }
}
