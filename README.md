# Alliance Dispatch — NEMT Dispatch Platform

A RouteGenie-style dispatch and operations platform for **Alliance Medical
Transportation** (non-emergency medical transportation, Northern Virginia to
Richmond, VA).

**Stack:** Next.js 14 (App Router, TypeScript, Tailwind CSS) + Supabase
(Postgres, Auth, Realtime). No other backend.

**What it does:** run board, trip scheduling & dispatch, driver roster, vehicle
fleet, customer list, billing summary, and a mobile-friendly driver view with
status updates. Everything is stored in your own Supabase database.

---

## Deploy in 4 steps

You need: a Supabase account (free), a GitHub account (free), and a Vercel
account (free). Nothing here costs money to start.

### Step 1 — Create your Supabase project and load the database

1. Go to [supabase.com](https://supabase.com) and sign up / sign in.
2. Click **New project**, name it `alliance-dispatch`, set a database password
   (save it somewhere safe), and pick the region closest to you (e.g. US East).
   Wait for it to finish provisioning.
3. In the Supabase dashboard sidebar, click **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` from this project, copy its entire
   contents, paste into the SQL editor, and click **Run**. This creates all
   tables, security rules, and clearly-labeled sample data (delete the SAMPLE
   rows later).
5. Go to **Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public key** (the long key labeled `anon` / `public`)
6. Still in Supabase, go to **Authentication → Users** and click **Add user →
   Create new user**. Enter your email and a password, and make sure
   **Auto Confirm User** is checked. This is your dispatcher login.
7. Promote yourself to admin: go back to **SQL Editor → New query** and run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   (Replace `you@example.com` with the email you just created.)
8. Optional: repeat step 6 for each driver, then link them — run:
   ```sql
   update public.profiles set driver_id = '<driver-uuid-from-drivers-table>'
   where id = (select id from auth.users where email = 'driver@example.com');
   ```
   You can find each driver's UUID in the **Table Editor → drivers** table.

### Step 2 — Put this folder on GitHub

1. Go to [github.com](https://github.com), sign in, click **New repository**,
   name it `alliance-dispatch`, and create it (no README needed).
2. On your computer, open a terminal in this project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Alliance dispatch platform"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/alliance-dispatch.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your GitHub username.)

### Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account.
2. Click **Add New → Project**, find `alliance-dispatch`, and click **Import**.
3. When asked for **Environment Variables**, add exactly these two:
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL from Step 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon public key from Step 1
4. Click **Deploy**. After a minute or two you get a live URL like
   `https://alliance-dispatch.vercel.app`.
5. Open it, sign in with the dispatcher email/password from Step 1, and start
   dispatching. Delete the SAMPLE drivers/vehicles/trips when ready.

### Step 4 (optional) — Connect your own domain

1. Buy a domain (e.g. `alliancemedicaltransportation.com`) at Namecheap or
   Cloudflare (~$10–15/year).
2. In Vercel, open your project → **Settings → Domains** → add your domain
   and follow the DNS instructions Vercel shows.
3. Your dispatch platform is now live at your own address.

---

## Local development

```bash
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm install
npm run dev                  # open http://localhost:3000
```

## Notes

- Drivers only see trips assigned to them (enforced by database security rules).
- Realtime: the dashboard and driver view update live when trip statuses change.
- The public marketing website is a separate project; this app is for internal
  dispatch operations only.
