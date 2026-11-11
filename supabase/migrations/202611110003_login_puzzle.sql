begin;

create schema if not exists unitcost_private;
revoke all on schema unitcost_private from public, anon, authenticated;

create table unitcost_private.login_puzzle_settings (
  singleton boolean primary key default true check (singleton),
  required boolean not null default false
);
insert into unitcost_private.login_puzzle_settings default values;

create table unitcost_private.login_puzzles (
  puzzle_id text primary key check (puzzle_id ~ '^[a-f0-9]{32}$'),
  consumed_at timestamptz not null default now()
);
create index login_puzzles_consumed_at_idx on unitcost_private.login_puzzles(consumed_at);

create table unitcost_private.verified_login_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null,
  puzzle_id text not null unique references unitcost_private.login_puzzles(puzzle_id)
);

create function public.unitcost_consume_login_puzzle(puzzle_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from unitcost_private.login_puzzles p
  where p.consumed_at < now() - interval '1 hour'
    and not exists (select 1 from unitcost_private.verified_login_sessions s where s.puzzle_id = p.puzzle_id);
  insert into unitcost_private.login_puzzles(puzzle_id)
  values ($1) on conflict do nothing;
  return found;
end;
$$;

create function public.unitcost_allow_puzzle_session(puzzle_id text, login_session uuid, login_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into unitcost_private.verified_login_sessions(session_id, user_id, puzzle_id)
  select s.id, s.user_id, p.puzzle_id
  from auth.sessions s cross join unitcost_private.login_puzzles p
  where s.id = login_session and s.user_id = login_user and p.puzzle_id = $1
    and p.consumed_at >= now() - interval '2 minutes'
  on conflict do nothing;
  return found;
end;
$$;

revoke execute on function public.unitcost_consume_login_puzzle(text) from public, anon, authenticated;
revoke execute on function public.unitcost_allow_puzzle_session(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.unitcost_consume_login_puzzle(text) to service_role;
grant execute on function public.unitcost_allow_puzzle_session(text, uuid, uuid) to service_role;

create function public.unitcost_login_puzzle_allows_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select not settings.required from unitcost_private.login_puzzle_settings settings where singleton),
    false
  ) or exists (
    select 1 from unitcost_private.verified_login_sessions s
    where s.session_id::text = auth.jwt() ->> 'session_id' and s.user_id = auth.uid()
  );
$$;
revoke execute on function public.unitcost_login_puzzle_allows_access() from public, anon, authenticated;
grant execute on function public.unitcost_login_puzzle_allows_access() to authenticated;

alter policy unitcost_account_read_own on public.unitcost_accounts
  using (user_id = (select auth.uid()) and (select public.unitcost_login_puzzle_allows_access()));

create or replace function public.unitcost_require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.unitcost_login_puzzle_allows_access() or not exists (
    select 1 from public.unitcost_accounts
    where user_id = auth.uid() and role = 'admin' and approved_at is not null
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
