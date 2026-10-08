-- Public self-scheduling for Alliance Medical Transportation
-- Run this in the Supabase SQL Editor (one time).
--
-- What it does:
--  1. Adds a 'pending' trip status for customer-submitted requests awaiting confirmation.
--  2. Adds an optional contact_phone column on trips.
--  3. Lets anonymous (not-logged-in) visitors INSERT new customers and new trips,
--     but ONLY trips with status = 'pending'. They cannot read, update, or delete anything.

-- 1. Allow 'pending' status on trips
alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips
  add constraint trips_status_check
  check (status in ('pending', 'scheduled', 'en_route', 'picked_up', 'completed', 'cancelled'));

-- 2. Contact phone on trips (for the booking form)
alter table public.trips add column if not exists contact_phone text;

-- 3. Public insert policies (RLS is already enabled on both tables)
drop policy if exists "trips_anon_insert_pending" on public.trips;
create policy "trips_anon_insert_pending" on public.trips
  for insert to anon
  with check (status = 'pending');

drop policy if exists "customers_anon_insert" on public.customers;
create policy "customers_anon_insert" on public.customers
  for insert to anon
  with check (true);
