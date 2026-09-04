-- Run this entire script in Supabase SQL Editor.
-- It creates profiles automatically for future Auth signups and backfills existing users.

alter table public.profiles add column if not exists employment_status text not null default 'active';
alter table public.purchase_requests add column if not exists asset_status text not null default 'not_applicable';
alter table public.purchase_requests add column if not exists returned_at timestamptz;
create table if not exists public.vendor_items (id uuid default gen_random_uuid() primary key, vendor_id uuid references public.vendors(id) on delete cascade not null, item_name text not null, unit_price numeric not null check (unit_price >= 0), created_at timestamptz default now());
alter table public.purchase_requests add column if not exists quantity integer not null default 1;
alter table public.purchase_requests add column if not exists unit_price numeric not null default 0;
alter table public.purchase_requests add column if not exists vendor_item_id uuid references public.vendor_items(id);
alter table public.purchase_requests alter column amount set default 0;
alter table public.purchase_requests alter column amount drop not null;
alter table public.purchase_requests drop constraint if exists purchase_requests_amount_check;
alter table public.purchase_requests add constraint purchase_requests_amount_nonnegative check (amount is null or amount >= 0);

notify pgrst, 'reload schema';

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

-- Refresh Supabase's API schema cache after creating the new table.
notify pgrst, 'reload schema';
