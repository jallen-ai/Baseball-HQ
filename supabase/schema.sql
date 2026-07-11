-- =====================================================================
--  Baseball HQ — multi-tenant backend schema
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to re-run (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.athletes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete cascade, -- null allowed for demo/seed athletes
  team_id       uuid references public.teams(id) on delete set null,
  display_name  text not null default 'Athlete',
  state         jsonb not null default '{}'::jsonb,   -- the entire game state blob (same shape as the original app)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists athletes_team_idx on public.athletes(team_id);

-- ---------------------------------------------------------------------
-- Server-side XP engine.
-- Computes total XP from the state blob using the SAME formula as the
-- original client (daily*25 + verifiedCombine*75 + quest xp + bonus xp).
-- Because the DB derives XP, the client cannot fake a leaderboard score.
-- ---------------------------------------------------------------------
create or replace function public.compute_xp(s jsonb)
returns integer
language sql
immutable
as $$
  select (
      case when jsonb_typeof(s->'daily') = 'array'
           then jsonb_array_length(s->'daily') else 0 end * 25
    + coalesce((
        select count(*) from jsonb_array_elements(
          case when jsonb_typeof(s->'combine')='array' then s->'combine' else '[]'::jsonb end) e
        where coalesce((e->>'verified')::boolean, false)
      ), 0) * 75
    + coalesce((
        select sum(coalesce((e->>'xp')::numeric, 0)) from jsonb_array_elements(
          case when jsonb_typeof(s->'quests')='array' then s->'quests' else '[]'::jsonb end) e
      ), 0)
    + coalesce((
        select sum(coalesce((e->>'xp')::numeric, 0)) from jsonb_array_elements(
          case when jsonb_typeof(s->'bonuses')='array' then s->'bonuses' else '[]'::jsonb end) e
      ), 0)
  )::integer;
$$;

-- ---------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so they bypass RLS and don't recurse
-- inside the policies that call them).
-- ---------------------------------------------------------------------
create or replace function public.my_athlete()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.athletes where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_team()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.athletes where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------
-- Leaderboard view. security_invoker=on means the caller's RLS applies,
-- so a user only ever sees rows for their own team.
-- ---------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = on) as
select
  a.id,
  a.team_id,
  a.display_name,
  public.compute_xp(a.state) as xp,
  case when jsonb_typeof(a.state->'daily')='array'
       then jsonb_array_length(a.state->'daily') else 0 end as workouts
from public.athletes a;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.teams    enable row level security;
alter table public.athletes enable row level security;

-- teams: you can see only your own team
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select using (id = public.my_team());

-- athletes: you can READ everyone on your team (that's the leaderboard),
-- but you can only WRITE your own row.
drop policy if exists athletes_select on public.athletes;
create policy athletes_select on public.athletes
  for select using (team_id = public.my_team() or user_id = auth.uid());

drop policy if exists athletes_insert on public.athletes;
create policy athletes_insert on public.athletes
  for insert with check (user_id = auth.uid());

drop policy if exists athletes_update on public.athletes;
create policy athletes_update on public.athletes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Onboarding RPCs (SECURITY DEFINER: they create the team/athlete rows
-- on the caller's behalf, then RLS governs everything after).
-- ---------------------------------------------------------------------
create or replace function public.create_team_and_join(p_display_name text, p_team_name text)
returns public.athletes
language plpgsql security definer set search_path = public as $$
declare v_team public.teams; v_athlete public.athletes; v_code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.teams(name, join_code, created_by)
    values (coalesce(nullif(trim(p_team_name),''),'My Team'), v_code, auth.uid())
    returning * into v_team;
  insert into public.athletes(user_id, team_id, display_name, state)
    values (auth.uid(), v_team.id, coalesce(nullif(trim(p_display_name),''),'Athlete'), '{}'::jsonb)
    on conflict (user_id) do update
      set team_id = excluded.team_id, display_name = excluded.display_name, updated_at = now()
    returning * into v_athlete;
  return v_athlete;
end; $$;

create or replace function public.join_team(p_display_name text, p_code text)
returns public.athletes
language plpgsql security definer set search_path = public as $$
declare v_team public.teams; v_athlete public.athletes;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_team from public.teams where upper(join_code) = upper(trim(p_code)) limit 1;
  if v_team.id is null then raise exception 'No team found for code %', p_code; end if;
  insert into public.athletes(user_id, team_id, display_name, state)
    values (auth.uid(), v_team.id, coalesce(nullif(trim(p_display_name),''),'Athlete'), '{}'::jsonb)
    on conflict (user_id) do update
      set team_id = excluded.team_id, display_name = excluded.display_name, updated_at = now()
    returning * into v_athlete;
  return v_athlete;
end; $$;

-- ---------------------------------------------------------------------
-- Grants (Supabase roles). RLS still governs row visibility.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.athletes to authenticated;
grant select on public.teams to authenticated;
grant select on public.leaderboard to authenticated;
grant execute on function public.create_team_and_join(text, text) to authenticated;
grant execute on function public.join_team(text, text) to authenticated;
grant execute on function public.compute_xp(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Demo seed: a "Northbrook Spartans" team (join code SPARTANS) pre-loaded
-- with a few athletes so the leaderboard looks alive on first sign-in.
-- Seed athletes have user_id = null so no one can log in as them.
-- ---------------------------------------------------------------------
insert into public.teams (id, name, join_code)
values ('00000000-0000-0000-0000-000000000001', 'Northbrook Spartans', 'SPARTANS')
on conflict (join_code) do nothing;

-- idempotent: clear prior seed athletes on the demo team, then re-insert
delete from public.athletes
where team_id = '00000000-0000-0000-0000-000000000001' and user_id is null;

insert into public.athletes (team_id, display_name, state)
select '00000000-0000-0000-0000-000000000001', s.name,
  jsonb_build_object(
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'date', to_char(current_date - g, 'YYYY-MM-DD'),
        'pushups', 8 + (g % 7), 'squats', 18 + (g % 10),
        'plank', 25 + (g % 20), 'sprints', 4 + (g % 4)))
      from generate_series(1, s.workouts) g),
    'bonuses', jsonb_build_array(jsonb_build_object(
      'date', to_char(current_date, 'YYYY-MM-DD'),
      'type', 'Season Seed', 'xp', s.bonus, 'reason', 'Preseason work'))
  )
from (values
  ('Jack',    40, 1710),
  ('Mason',   38, 1540),
  ('Luke',    36, 1480),
  ('Noah',    35, 1390),
  ('Charlie', 33, 1315)
) as s(name, workouts, bonus);

-- Done. Sanity check:
--   select display_name, xp, workouts from public.leaderboard order by xp desc;
