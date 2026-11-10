begin;

lock table auth.users in share row exclusive mode;

alter table public.unitcost_accounts
  add column hospital_name text check (char_length(hospital_name) <= 120),
  add column hospital_code text check (hospital_code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$');

with profiles as (
  select id,
    left(coalesce(nullif(btrim(raw_user_meta_data ->> 'hospital_name'), ''),
      nullif(btrim(raw_user_meta_data ->> 'nama_rs'), '')), 120) as hospital_name,
    coalesce(nullif(btrim(raw_user_meta_data ->> 'hospital_code'), ''),
      nullif(btrim(raw_user_meta_data ->> 'kode_rs'), '')) as hospital_code
  from auth.users
)
update public.unitcost_accounts a
set hospital_name = p.hospital_name,
    hospital_code = case when p.hospital_code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$' then p.hospital_code end
from profiles p
where p.id = a.user_id;

create or replace function public.unitcost_on_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  code text := btrim(new.raw_user_meta_data ->> 'hospital_code');
begin
  insert into public.unitcost_accounts (user_id, display_name, phone_number, hospital_name, hospital_code)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 120),
    case when (new.raw_user_meta_data ->> 'phone_number') ~ '^\+?[0-9]{8,15}$'
      then new.raw_user_meta_data ->> 'phone_number' end,
    left(nullif(btrim(new.raw_user_meta_data ->> 'hospital_name'), ''), 120),
    case when code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$' then code end
  );
  return new;
end;
$$;

drop function public.unitcost_list_users();
create function public.unitcost_list_users()
returns table (
  user_id uuid, email text, display_name text, phone_number text, hospital_name text,
  hospital_code text, created_at timestamptz, approved_at timestamptz, expires_at timestamptz,
  status text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.unitcost_require_admin();
  return query
    select a.user_id, u.email::text, a.display_name, a.phone_number, a.hospital_name,
      a.hospital_code, u.created_at, a.approved_at, a.expires_at,
      case when a.approved_at is null then 'pending'
           when a.expires_at <= now() then 'expired' else 'active' end
    from public.unitcost_accounts a
    join auth.users u on u.id = a.user_id
    where a.role = 'user'
    order by (a.approved_at is null) desc, u.created_at desc, a.user_id;
end;
$$;

revoke execute on function public.unitcost_list_users() from public, anon, authenticated;
grant execute on function public.unitcost_list_users() to authenticated;

notify pgrst, 'reload schema';

commit;
