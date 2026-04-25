create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  date_of_birth text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles
add column if not exists avatar_url text;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  players jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  linked_note_id uuid null references public.notes(id) on delete set null,
  team_id uuid null references public.teams(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.teams enable row level security;
alter table public.fields enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
on public.notes
for select
using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes
for insert
with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes
for update
using (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes
for delete
using (auth.uid() = user_id);

drop policy if exists "teams_select_own" on public.teams;
create policy "teams_select_own"
on public.teams
for select
using (auth.uid() = user_id);

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own"
on public.teams
for insert
with check (auth.uid() = user_id);

drop policy if exists "teams_update_own" on public.teams;
create policy "teams_update_own"
on public.teams
for update
using (auth.uid() = user_id);

drop policy if exists "teams_delete_own" on public.teams;
create policy "teams_delete_own"
on public.teams
for delete
using (auth.uid() = user_id);

drop policy if exists "fields_select_own" on public.fields;
create policy "fields_select_own"
on public.fields
for select
using (auth.uid() = user_id);

drop policy if exists "fields_insert_own" on public.fields;
create policy "fields_insert_own"
on public.fields
for insert
with check (auth.uid() = user_id);

drop policy if exists "fields_update_own" on public.fields;
create policy "fields_update_own"
on public.fields
for update
using (auth.uid() = user_id);

drop policy if exists "fields_delete_own" on public.fields;
create policy "fields_delete_own"
on public.fields
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- The app uploads avatar images to paths like:
--   {auth.uid()}/avatar-<timestamp>.jpg
-- Keep this bucket name aligned with the app code.

drop policy if exists "profile_images_select" on storage.objects;
create policy "profile_images_select"
on storage.objects
for select
using (bucket_id = 'profile-images');

drop policy if exists "profile_images_insert_own" on storage.objects;
create policy "profile_images_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "profile_images_update_own" on storage.objects;
create policy "profile_images_update_own"
on storage.objects
for update
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "profile_images_delete_own" on storage.objects;
create policy "profile_images_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
