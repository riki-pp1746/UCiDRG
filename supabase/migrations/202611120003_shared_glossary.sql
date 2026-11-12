begin;

create table unitcost_private.glossary_entries (
  term_key text primary key check (term_key ~ '^[A-Za-z][A-Za-z0-9]{0,39}$'),
  summary text not null check (
    char_length(summary) between 1 and 500
    and summary ~ '[^[:space:]]'
    and cardinality(regexp_split_to_array(regexp_replace(summary, '^\s+|\s+$', '', 'g'), '\s+')) <= 25
  ),
  detail text not null check (
    char_length(detail) between 1 and 3000
    and detail ~ '[^[:space:]]'
    and cardinality(regexp_split_to_array(regexp_replace(detail, '^\s+|\s+$', '', 'g'), '\s+')) <= 100
  )
);
revoke all on unitcost_private.glossary_entries from public, anon, authenticated;

create function public.unitcost_glossary_entries()
returns table (term_key text, summary text, detail text)
language sql stable security definer set search_path = '' as $$
  select g.term_key, g.summary, g.detail
  from unitcost_private.glossary_entries g
  where (select public.unitcost_session_is_active());
$$;
revoke execute on function public.unitcost_glossary_entries() from public, anon, authenticated;
grant execute on function public.unitcost_glossary_entries() to authenticated;

create function public.unitcost_set_glossary_entry(p_term_key text, p_summary text, p_detail text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.unitcost_require_admin();
  if p_summary is null and p_detail is null then
    delete from unitcost_private.glossary_entries where term_key = p_term_key;
    return;
  end if;

  insert into unitcost_private.glossary_entries (term_key, summary, detail)
  values (p_term_key, p_summary, p_detail)
  on conflict (term_key) do update
    set summary = excluded.summary, detail = excluded.detail;
end;
$$;
revoke execute on function public.unitcost_set_glossary_entry(text,text,text) from public, anon, authenticated;
grant execute on function public.unitcost_set_glossary_entry(text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
