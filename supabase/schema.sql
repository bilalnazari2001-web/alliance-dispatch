-- =====================================================================
-- Alliance Medical Transportation — Dispatch Platform schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- UUID generation
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'wheelchair van'
    check (type in ('wheelchair van', 'sedan')),
  capacity int not null default 4,
  status text not null default 'available'
    check (status in ('available', 'in_service', 'maintenance')),
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'driver'
    check (role in ('admin', 'driver')),
  driver_id uuid references public.drivers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  pickup_address text not null,
  destination text not null,
  pickup_datetime timestamptz not null,
  passenger_name text not null,
  passenger_type text not null default 'ambulatory'
    check (passenger_type in ('wheelchair', 'ambulatory')),
  payment_type text not null default 'private_pay'
    check (payment_type in ('private_pay', 'medicaid', 'insurance')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'en_route', 'picked_up', 'completed', 'cancelled')),
  driver_id uuid references public.drivers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  fare numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  actor text,
  action text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at trigger for trips
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'driver')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.customers enable row level security;
alter table public.trips enable row level security;
alter table public.activity_log enable row level security;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_driver_id()
returns uuid language sql security definer set search_path = public as $$
  select driver_id from public.profiles where id = auth.uid();
$$;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- drivers
drop policy if exists "drivers_admin_all" on public.drivers;
create policy "drivers_admin_all" on public.drivers
  for all using (public.is_admin());

drop policy if exists "drivers_select_own" on public.drivers;
create policy "drivers_select_own" on public.drivers
  for select using (id = public.my_driver_id());

-- vehicles
drop policy if exists "vehicles_admin_all" on public.vehicles;
create policy "vehicles_admin_all" on public.vehicles
  for all using (public.is_admin());

drop policy if exists "vehicles_select_authenticated" on public.vehicles;
create policy "vehicles_select_authenticated" on public.vehicles
  for select using (auth.role() = 'authenticated');

-- customers (admin only)
drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all" on public.customers
  for all using (public.is_admin());

-- trips
drop policy if exists "trips_admin_all" on public.trips;
create policy "trips_admin_all" on public.trips
  for all using (public.is_admin());

drop policy if exists "trips_driver_select_assigned" on public.trips;
create policy "trips_driver_select_assigned" on public.trips
  for select using (driver_id = public.my_driver_id());

drop policy if exists "trips_driver_update_assigned" on public.trips;
create policy "trips_driver_update_assigned" on public.trips
  for update using (driver_id = public.my_driver_id())
  with check (driver_id = public.my_driver_id());

-- activity_log
drop policy if exists "activity_admin_all" on public.activity_log;
create policy "activity_admin_all" on public.activity_log
  for all using (public.is_admin());

drop policy if exists "activity_driver_read_assigned" on public.activity_log;
create policy "activity_driver_read_assigned" on public.activity_log
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = activity_log.trip_id
        and t.driver_id = public.my_driver_id()
    )
  );

drop policy if exists "activity_driver_insert_assigned" on public.activity_log;
create policy "activity_driver_insert_assigned" on public.activity_log
  for insert with check (
    exists (
      select 1 from public.trips t
      where t.id = activity_log.trip_id
        and t.driver_id = public.my_driver_id()
    )
  );

-- ---------------------------------------------------------------------
-- SAMPLE SEED DATA (clearly labeled; delete when you go live)
-- ---------------------------------------------------------------------

do $$
declare
  v_van uuid;
  v_sedan uuid;
  d_one uuid;
  d_two uuid;
  c_one uuid;
  c_two uuid;
  c_three uuid;
begin
  insert into public.vehicles (name, type, capacity, status)
  values ('SAMPLE Van 1', 'wheelchair van', 4, 'available')
  returning id into v_van;

  insert into public.vehicles (name, type, capacity, status)
  values ('SAMPLE Sedan 1', 'sedan', 3, 'available')
  returning id into v_sedan;

  insert into public.drivers (name, phone, vehicle_id, status)
  values ('SAMPLE Driver One', '(240) 555-0101', v_van, 'active')
  returning id into d_one;

  insert into public.drivers (name, phone, vehicle_id, status)
  values ('SAMPLE Driver Two', '(240) 555-0102', v_sedan, 'active')
  returning id into d_two;

  insert into public.customers (name, phone, notes)
  values ('SAMPLE Customer A', '(703) 555-0111', 'Sample record — delete before going live')
  returning id into c_one;

  insert into public.customers (name, phone, notes)
  values ('SAMPLE Customer B', '(804) 555-0122', 'Sample record — delete before going live')
  returning id into c_two;

  insert into public.customers (name, phone, notes)
  values ('SAMPLE Customer C', '(571) 555-0133', 'Sample record — delete before going live')
  returning id into c_three;

  -- 5 sample trips: two today, one tomorrow, one completed, one en route
  insert into public.trips
    (customer_id, pickup_address, destination, pickup_datetime, passenger_name,
     passenger_type, payment_type, status, driver_id, vehicle_id, fare, notes)
  values
    (c_one, '123 Main St, Woodbridge, VA', 'Sentara Hospital, Woodbridge, VA',
     date_trunc('day', now()) + interval '9 hours', 'SAMPLE Customer A',
     'wheelchair', 'medicaid', 'scheduled', d_one, v_van, 45.00, 'Sample trip'),
    (c_two, '456 Oak Ave, Dumfries, VA', 'Dialysis Center, Manassas, VA',
     date_trunc('day', now()) + interval '13 hours 30 minutes', 'SAMPLE Customer B',
     'ambulatory', 'private_pay', 'scheduled', d_two, v_sedan, 60.00, 'Sample trip'),
    (c_three, '789 Pine Rd, Richmond, VA', 'VCU Medical Center, Richmond, VA',
     date_trunc('day', now()) + interval '1 day 10 hours', 'SAMPLE Customer C',
     'wheelchair', 'insurance', 'scheduled', d_one, v_van, 75.00, 'Sample trip'),
    (c_one, '123 Main St, Woodbridge, VA', 'Kaiser Clinic, Woodbridge, VA',
     now() - interval '2 hours', 'SAMPLE Customer A',
     'ambulatory', 'private_pay', 'completed', d_two, v_sedan, 40.00, 'Sample trip'),
    (c_two, '456 Oak Ave, Dumfries, VA', 'Inova Hospital, Alexandria, VA',
     now() - interval '30 minutes', 'SAMPLE Customer B',
     'wheelchair', 'medicaid', 'en_route', d_one, v_van, 55.00, 'Sample trip');

  insert into public.activity_log (trip_id, actor, action)
  select id, 'system', 'Sample trip created'
  from public.trips;
end;
$$;
