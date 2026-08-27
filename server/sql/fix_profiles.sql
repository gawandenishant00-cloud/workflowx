-- Run this entire script in Supabase SQL Editor.
-- It creates profiles automatically for future Auth signups and backfills existing users.

create or replace function public.create_employee_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'New employee'),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_employee_profile();

-- Backfill Auth users that were created before the trigger existed.
insert into public.profiles (id, full_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'full_name', split_part(users.email, '@', 1), 'New employee'),
  'employee'
from auth.users as users
where not exists (
  select 1 from public.profiles as existing where existing.id = users.id
);
