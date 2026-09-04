create table if not exists profiles (id uuid references auth.users primary key, full_name text not null, role text not null check (role in ('admin','manager','employee')), department text, employment_status text not null default 'active' check (employment_status in ('active','offboarded')), created_at timestamptz default now());
create table if not exists leave_requests (id uuid default gen_random_uuid() primary key, employee_id uuid references profiles(id) not null, start_date date not null, end_date date not null, reason text, status text default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz default now());
create table if not exists vendors (id uuid default gen_random_uuid() primary key, name text not null, contact_email text, category text, created_at timestamptz default now());
create table if not exists vendor_items (id uuid default gen_random_uuid() primary key, vendor_id uuid references vendors(id) on delete cascade not null, item_name text not null, unit_price numeric not null check (unit_price >= 0), created_at timestamptz default now());
create table if not exists purchase_requests (id uuid default gen_random_uuid() primary key, requester_id uuid references profiles(id) not null, vendor_id uuid references vendors(id), vendor_item_id uuid references vendor_items(id), item_description text not null, quantity integer not null default 1 check (quantity > 0), unit_price numeric not null default 0 check (unit_price >= 0), amount numeric not null default 0 check (amount >= 0), status text default 'pending' check (status in ('pending','approved','rejected')), asset_status text not null default 'not_applicable' check (asset_status in ('not_applicable','assigned','returned')), returned_at timestamptz, created_at timestamptz default now());
create table if not exists approval_requests (id uuid default gen_random_uuid() primary key, leave_request_id uuid references leave_requests(id), purchase_request_id uuid references purchase_requests(id), approver_id uuid references profiles(id), status text default 'pending' check (status in ('pending','approved','rejected')), comment text, decided_at timestamptz, created_at timestamptz default now(), constraint one_target check ((leave_request_id is not null and purchase_request_id is null) or (leave_request_id is null and purchase_request_id is not null)));
create table if not exists notifications (id uuid default gen_random_uuid() primary key, user_id uuid references profiles(id) not null, title text not null, message text not null, type text check (type in ('leave','purchase','approval','system')), is_read boolean default false, created_at timestamptz default now());

alter table profiles add column if not exists employment_status text not null default 'active';
alter table purchase_requests add column if not exists asset_status text not null default 'not_applicable';
alter table purchase_requests add column if not exists returned_at timestamptz;
alter table purchase_requests add column if not exists quantity integer not null default 1;
alter table purchase_requests add column if not exists unit_price numeric not null default 0;
alter table purchase_requests add column if not exists vendor_item_id uuid references vendor_items(id);
alter table purchase_requests alter column amount set default 0;
alter table purchase_requests alter column amount drop not null;
alter table purchase_requests drop constraint if exists purchase_requests_amount_check;
alter table purchase_requests add constraint purchase_requests_amount_nonnegative check (amount is null or amount >= 0);

alter table profiles enable row level security;
alter table leave_requests enable row level security;
alter table vendors enable row level security;
alter table purchase_requests enable row level security;
alter table approval_requests enable row level security;
alter table notifications enable row level security;

create policy "profiles own read" on profiles for select using (auth.uid() = id);
create or replace function public.create_employee_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
	insert into public.profiles (id, full_name, role)
	values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New employee'), 'employee');
	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.create_employee_profile();

create policy "leave own read" on leave_requests for select using (auth.uid() = employee_id);
create policy "leave manager read" on leave_requests for select using (exists (select 1 from profiles where id = auth.uid() and role in ('manager', 'admin')));
create policy "purchase own read" on purchase_requests for select using (auth.uid() = requester_id);
create policy "purchase manager read" on purchase_requests for select using (exists (select 1 from profiles where id = auth.uid() and role in ('manager', 'admin')));
create policy "vendors authenticated read" on vendors for select using (auth.uid() is not null);
create policy "approvals manager read" on approval_requests for select using (exists (select 1 from profiles where id = auth.uid() and role in ('manager', 'admin')));
create policy "notifications own read" on notifications for select using (auth.uid() = user_id);
create policy "notifications own update" on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
