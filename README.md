# Attendance Hub

Multi-class attendance web app built with React 18, TypeScript, Vite, Tailwind, Zustand, React Router, and Supabase.

## Local commands

```powershell
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Mock mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are missing, the app runs in seeded pilot mode with built-in teacher/admin users and sample class data.

## Real Supabase setup

### 1. Create env file

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...
```

### 2. Create Supabase project objects

Run the migration in:

`supabase/migrations/20260412160000_initial_schema.sql`

This creates:

- `classes`
- `users`
- `students`
- `attendance`
- `audit_logs`
- `push_subscriptions`
- `notification_logs`
- RLS policies
- RPC functions for attendance and student updates

### 3. Create Auth users

In Supabase Auth, create:

- one teacher account
- one admin account

The `public.users.id` values must exactly match the corresponding `auth.users.id` values.

### 4. Seed pilot data

Open `supabase/seed.sql`, replace the placeholder teacher/admin UUIDs with the real auth user IDs, then run it.

That sets up:

- class `10M`
- one teacher profile
- one admin profile
- 40 students

### 5. Deploy edge functions

Deploy:

- `supabase/functions/send-sms`
- `supabase/functions/process-reminders`

Set these function secrets:

```env
SMS_API_URL=...
SMS_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`send-sms` already implements the required backend wrapper shape and returns mock success if SMS credentials are absent.

## How to test live mode

1. Start the app with `npm run dev`
2. Open `http://localhost:5173`
3. Sign in with the teacher or admin email/password you created in Supabase Auth
4. Confirm the user also has a matching row in `public.users`
5. Test:
   - teacher lands on assigned class attendance
   - admin lands on dashboard
   - attendance tap cycle updates statuses
   - submit changes button from `Submit` to `Update`
   - student edits work from admin view
   - history opens existing records

## Current live-mode notes

- The frontend now uses Supabase Auth and real table/RPC calls when env vars are present.
- Automatic reminder delivery is only partially implemented server-side; the repo includes the scaffolding and storage for push subscriptions and reminder processing, but scheduled production notification dispatch still needs completion.
