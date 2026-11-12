begin;

create schema if not exists unitcost_private;
revoke all on schema unitcost_private from public, anon, authenticated;

create table unitcost_private.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null unique references auth.sessions(id) on delete cascade,
  session_created_at timestamptz not null
);
revoke all on unitcost_private.active_sessions from public, anon, authenticated;

create function public.unitcost_session_is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from unitcost_private.active_sessions a
    join auth.sessions s on s.id = a.session_id and s.user_id = a.user_id
    join public.unitcost_accounts u on u.user_id = a.user_id
    where a.user_id = auth.uid()
      and a.session_id::text = auth.jwt() ->> 'session_id'
      and u.approved_at is not null
      and (u.expires_at is null or u.expires_at > now())
  );
$$;
revoke execute on function public.unitcost_session_is_active() from public, anon, authenticated;
grant execute on function public.unitcost_session_is_active() to authenticated;

-- Called only while opening the workspace. A displaced/older session cannot
-- reclaim the account, even if its still-unexpired JWT is replayed.
create function unitcost_private.claim_session()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  login_session auth.sessions%rowtype;
begin
  if not exists (
    select 1 from public.unitcost_accounts a where a.user_id = auth.uid()
      and a.approved_at is not null and (a.expires_at is null or a.expires_at > now())
  ) then return false; end if;
  select s.* into login_session from auth.sessions s
  where s.user_id = auth.uid() and s.id::text = auth.jwt() ->> 'session_id';
  if not found then return false; end if;
  if exists (
    select 1 from auth.sessions s where s.user_id = login_session.user_id
      and (s.created_at, s.id) > (login_session.created_at, login_session.id)
  ) then return false; end if;
  insert into unitcost_private.active_sessions as active (user_id, session_id, session_created_at)
  values (login_session.user_id, login_session.id, login_session.created_at)
  on conflict (user_id) do update set
    session_id = excluded.session_id, session_created_at = excluded.session_created_at
  where (active.session_created_at, active.session_id) <= (excluded.session_created_at, excluded.session_id);
  return public.unitcost_session_is_active();
end;
$$;
revoke execute on function unitcost_private.claim_session() from public, anon, authenticated;

create or replace function public.unitcost_my_access()
returns table (role text, status text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  account public.unitcost_accounts%rowtype;
begin
  select a.* into account from public.unitcost_accounts a where a.user_id = auth.uid();
  if not found then return; end if;
  return query select account.role,
    case when account.approved_at is null then 'pending'
         when account.expires_at <= now() then 'expired'
         when not unitcost_private.claim_session() then 'session_replaced'
         else 'active' end,
    account.expires_at;
end;
$$;
revoke execute on function public.unitcost_my_access() from public, anon, authenticated;
grant execute on function public.unitcost_my_access() to authenticated;

alter policy unitcost_account_read_own on public.unitcost_accounts
  using (user_id = (select auth.uid()) and (select public.unitcost_session_is_active()));

create or replace function public.unitcost_require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.unitcost_session_is_active() or not exists (
    select 1 from public.unitcost_accounts
    where user_id = auth.uid() and role = 'admin' and approved_at is not null
  ) then raise exception 'Admin access required' using errcode = '42501'; end if;
end;
$$;
revoke execute on function public.unitcost_require_admin() from public, anon, authenticated;
grant execute on function public.unitcost_require_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
