import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session ?? null;
}

export async function getCurrentUserId() {
  return (await getCurrentSession())?.user.id ?? null;
}
