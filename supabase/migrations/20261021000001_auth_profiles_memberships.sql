-- 0001: auth, profiles, organisations, memberships, and the transition table.
--
-- Conventions for every migration in this repo:
--   * one file per change, never edited after merge; corrections are new files
--   * every tenant-scoped table carries estate_id and has RLS enabled
--   * no table is created without its RLS policies in the same file
--
-- Estates and lots arrive in 0002. The transition table lives here so the
-- domain/stateMachine.ts <-> SQL drift test exists from Day 1; the trigger
-- that enforces it is added with the applications table.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type portal_role as enum ('submitter', 'assessor', 'developer');

create type application_state as enum (
  'draft',
  'lodged',
  'under_assessment',
  'awaiting_information',
  'approved',
  'not_approved',
  'withdrawn'
);

-- ---------------------------------------------------------------------------
-- Estates (minimal now; lots, checklist and branding columns in 0002)
-- ---------------------------------------------------------------------------
create table estates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created by trigger on signup
-- ---------------------------------------------------------------------------
create table organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  abn         text check (abn is null or abn ~ '^[0-9]{11}$'),
  created_at  timestamptz not null default now()
);

create table profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  email            text not null,
  display_name     text,
  organisation_id  uuid references organisations (id) on delete set null,
  created_at       timestamptz not null default now()
);

create function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', null));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Memberships: role per user per estate
-- ---------------------------------------------------------------------------
create table memberships (
  user_id     uuid not null references profiles (user_id) on delete cascade,
  estate_id   uuid not null references estates (id) on delete cascade,
  role        portal_role not null,
  granted_by  uuid references profiles (user_id),
  created_at  timestamptz not null default now(),
  primary key (user_id, estate_id, role)
);

create index memberships_estate_role_idx on memberships (estate_id, role);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies
-- ---------------------------------------------------------------------------
create function current_user_has_role(p_estate uuid, p_role portal_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.estate_id = p_estate
      and m.role = p_role
  );
$$;

create function current_user_is_member(p_estate uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.estate_id = p_estate
  );
$$;

-- ---------------------------------------------------------------------------
-- Transition table: mirror of src/domain/stateMachine.ts TRANSITIONS.
-- tests/domain/stateMachine.sql-sync.test.ts fails if the two drift.
-- ---------------------------------------------------------------------------
create table application_transitions (
  from_state       application_state not null,
  to_state         application_state not null,
  allowed_roles    portal_role[] not null,
  requires_reason  boolean not null,
  primary key (from_state, to_state)
);

insert into application_transitions (from_state, to_state, allowed_roles, requires_reason) values
  ('draft', 'lodged', ARRAY['submitter']::portal_role[], false),
  ('draft', 'withdrawn', ARRAY['submitter']::portal_role[], false),
  ('lodged', 'under_assessment', ARRAY['assessor']::portal_role[], false),
  ('lodged', 'withdrawn', ARRAY['submitter']::portal_role[], false),
  ('under_assessment', 'awaiting_information', ARRAY['assessor']::portal_role[], true),
  ('under_assessment', 'approved', ARRAY['assessor']::portal_role[], true),
  ('under_assessment', 'not_approved', ARRAY['assessor']::portal_role[], true),
  ('under_assessment', 'withdrawn', ARRAY['submitter']::portal_role[], false),
  ('awaiting_information', 'under_assessment', ARRAY['submitter']::portal_role[], false),
  ('awaiting_information', 'withdrawn', ARRAY['submitter']::portal_role[], false),
  ('approved', 'under_assessment', ARRAY['assessor']::portal_role[], true),
  ('not_approved', 'under_assessment', ARRAY['assessor']::portal_role[], true);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table estates enable row level security;
alter table organisations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table application_transitions enable row level security;

-- Estates: visible to members. Creation is an operator act via service role.
create policy estates_select_member on estates
  for select using (current_user_is_member(id));

-- Profiles: a user sees and edits their own row. Assessors and developers
-- see profiles of people who share an estate with them (for queue display).
create policy profiles_select_self on profiles
  for select using (user_id = auth.uid());

create policy profiles_select_shared_estate on profiles
  for select using (
    exists (
      select 1 from memberships mine
      join memberships theirs on theirs.estate_id = mine.estate_id
      where mine.user_id = auth.uid()
        and mine.role in ('assessor', 'developer')
        and theirs.user_id = profiles.user_id
    )
  );

create policy profiles_update_self on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Organisations: visible to members of the organisation and to assessors /
-- developers of any estate the organisation has applications in (added in
-- 0003 once applications exist). For now: own organisation only.
create policy organisations_select_own on organisations
  for select using (
    exists (select 1 from profiles p where p.user_id = auth.uid() and p.organisation_id = organisations.id)
  );

-- Memberships: a user sees their own; assessors and developers see all
-- memberships for their estates. Grants are operator acts via service role
-- in the light version.
create policy memberships_select_self on memberships
  for select using (user_id = auth.uid());

create policy memberships_select_estate_staff on memberships
  for select using (
    current_user_has_role(estate_id, 'assessor') or current_user_has_role(estate_id, 'developer')
  );

-- Transition table is reference data: readable by any signed-in user.
create policy transitions_select_authenticated on application_transitions
  for select to authenticated using (true);
