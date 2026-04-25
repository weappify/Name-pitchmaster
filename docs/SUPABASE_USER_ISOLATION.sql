create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  date_of_birth text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  linked_note_id uuid null,
  team_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  linked_field_setup_id uuid null,
  team_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  players jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists date_of_birth text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

alter table public.fields add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.fields add column if not exists name text;
alter table public.fields add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.fields add column if not exists linked_note_id uuid null;
alter table public.fields add column if not exists team_id uuid null;
alter table public.fields add column if not exists created_at timestamptz not null default now();
alter table public.fields add column if not exists updated_at timestamptz not null default now();

alter table public.notes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notes add column if not exists title text;
alter table public.notes add column if not exists content text not null default '';
alter table public.notes add column if not exists linked_field_setup_id uuid null;
alter table public.notes add column if not exists team_id uuid null;
alter table public.notes add column if not exists created_at timestamptz not null default now();
alter table public.notes add column if not exists updated_at timestamptz not null default now();

alter table public.teams add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.teams add column if not exists name text;
alter table public.teams add column if not exists players jsonb not null default '[]'::jsonb;
alter table public.teams add column if not exists created_at timestamptz not null default now();
alter table public.teams add column if not exists updated_at timestamptz not null default now();

create index if not exists fields_user_id_idx on public.fields(user_id);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_linked_field_setup_id_idx on public.notes(linked_field_setup_id);
create index if not exists teams_user_id_idx on public.teams(user_id);

alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.notes enable row level security;
alter table public.teams enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  auth.uid() = id
  or auth.jwt() ->> 'email' = 'rayanaaravmathur@gmail.com'
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "fields_select_own_or_admin" on public.fields;
create policy "fields_select_own_or_admin"
on public.fields
for select
using (
  auth.uid() = user_id
  or auth.jwt() ->> 'email' = 'rayanaaravmathur@gmail.com'
);

drop policy if exists "fields_insert_own" on public.fields;
create policy "fields_insert_own"
on public.fields
for insert
with check (auth.uid() = user_id);

drop policy if exists "fields_update_own" on public.fields;
create policy "fields_update_own"
on public.fields
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "fields_delete_own" on public.fields;
create policy "fields_delete_own"
on public.fields
for delete
using (auth.uid() = user_id);

drop policy if exists "notes_select_own_or_admin" on public.notes;
create policy "notes_select_own_or_admin"
on public.notes
for select
using (
  auth.uid() = user_id
  or auth.jwt() ->> 'email' = 'rayanaaravmathur@gmail.com'
);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes
for insert
with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes
for delete
using (auth.uid() = user_id);

drop policy if exists "teams_select_own_or_admin" on public.teams;
create policy "teams_select_own_or_admin"
on public.teams
for select
using (
  auth.uid() = user_id
  or auth.jwt() ->> 'email' = 'rayanaaravmathur@gmail.com'
);

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own"
on public.teams
for insert
with check (auth.uid() = user_id);

drop policy if exists "teams_update_own" on public.teams;
create policy "teams_update_own"
on public.teams
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "teams_delete_own" on public.teams;
create policy "teams_delete_own"
on public.teams
for delete
using (auth.uid() = user_id);
