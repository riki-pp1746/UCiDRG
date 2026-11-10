begin;

create table public.unitcost_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  phone_number text check (phone_number ~ '^\+?[0-9]{8,15}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  approved_at timestamptz,
  expires_at timestamptz,
  check (
    (role = 'admin' and approved_at is not null and expires_at is null)
    or (role = 'user' and (
      (approved_at is null and expires_at is null)
      or (approved_at is not null and expires_at is not null and expires_at > approved_at)
    ))
  )
);

alter table public.unitcost_accounts enable row level security;
revoke all on public.unitcost_accounts from public, anon, authenticated;
grant select on public.unitcost_accounts to authenticated;
create policy unitcost_account_read_own on public.unitcost_accounts
  for select to authenticated using (user_id = (select auth.uid()));

create function public.unitcost_on_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.unitcost_accounts (user_id, display_name, phone_number)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 120),
    case when (new.raw_user_meta_data ->> 'phone_number') ~ '^\+?[0-9]{8,15}$'
      then new.raw_user_meta_data ->> 'phone_number' end
  );
  return new;
end;
$$;

revoke execute on function public.unitcost_on_signup() from public, anon, authenticated;
create trigger unitcost_on_signup after insert on auth.users
  for each row execute function public.unitcost_on_signup();

insert into public.unitcost_accounts (user_id, display_name, phone_number)
select id,
  left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(raw_user_meta_data ->> 'username'), '')), 120),
  case when (raw_user_meta_data ->> 'phone_number') ~ '^\+?[0-9]{8,15}$'
    then raw_user_meta_data ->> 'phone_number'
    when phone ~ '^\+?[0-9]{8,15}$' then phone end
from auth.users
on conflict (user_id) do nothing;

create function public.unitcost_my_access()
returns table (role text, status text, expires_at timestamptz)
language sql stable set search_path = ''
as $$
  select a.role,
    case when a.approved_at is null then 'pending'
         when a.expires_at <= now() then 'expired' else 'active' end,
    a.expires_at
  from public.unitcost_accounts a
  where a.user_id = auth.uid();
$$;

revoke execute on function public.unitcost_my_access() from public, anon, authenticated;
grant execute on function public.unitcost_my_access() to authenticated;

create function public.unitcost_require_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.unitcost_accounts
    where user_id = auth.uid() and role = 'admin' and approved_at is not null
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

create function public.unitcost_list_users()
returns table (
  user_id uuid, email text, display_name text, phone_number text, hospital_name text,
  created_at timestamptz, approved_at timestamptz, expires_at timestamptz,
  status text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.unitcost_require_admin();
  return query
    select a.user_id, u.email::text, a.display_name, a.phone_number,
      left(u.raw_user_meta_data ->> 'hospital_name', 120), u.created_at,
      a.approved_at, a.expires_at,
      case when a.approved_at is null then 'pending'
           when a.expires_at <= now() then 'expired' else 'active' end
    from public.unitcost_accounts a
    join auth.users u on u.id = a.user_id
    where a.role = 'user'
    order by (a.approved_at is null) desc, u.created_at desc, a.user_id;
end;
$$;

create function public.unitcost_update_user(
  target_id uuid, action text, expected_expiry timestamptz default null
)
returns void
language plpgsql security definer set search_path = '' set timezone = 'Asia/Jakarta'
as $$
begin
  perform public.unitcost_require_admin();
  if action = 'approve' then
    update public.unitcost_accounts
      set approved_at = now(), expires_at = now() + interval '3 months'
      where user_id = target_id and role = 'user' and approved_at is null;
  elsif action = 'extend' then
    update public.unitcost_accounts
      set expires_at = greatest(expires_at, now()) + interval '3 months'
      where user_id = target_id and role = 'user' and approved_at is not null
        and expires_at = expected_expiry;
  else
    raise exception 'Invalid account action' using errcode = '22023';
  end if;

  if not found then
    raise exception 'Account has changed' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.unitcost_require_admin() from public, anon, authenticated;
revoke execute on function public.unitcost_list_users() from public, anon, authenticated;
revoke execute on function public.unitcost_update_user(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.unitcost_list_users() to authenticated;
grant execute on function public.unitcost_update_user(uuid, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';

commit;
