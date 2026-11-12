begin;

-- Keep the latest session ID after sign-out so an earlier session cannot take
-- over again. The verifier still requires an existing matching Auth session.
-- The user's foreign key removes this record when the account is deleted.
alter table unitcost_private.active_sessions
  drop constraint active_sessions_session_id_fkey;

commit;
