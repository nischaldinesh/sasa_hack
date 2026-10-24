-- Rejects any auth user whose email does not end in @ou.edu.
-- Run once in the Supabase SQL Editor, after schema.sql. Safe to run again.
-- Blocks sign up through the app, the auth API and the admin API alike,
-- so no auth.users row is ever created for a non OU email.

create or replace function public.enforce_ou_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@ou.edu' then
    raise exception 'Only @ou.edu email addresses can sign up'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_ou_email on auth.users;

create trigger enforce_ou_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_ou_email();

-- The Supabase Auth server inserts users as supabase_auth_admin.
grant execute on function public.enforce_ou_email() to supabase_auth_admin;
