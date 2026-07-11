# Baseball HQ: shared / multi-tenant build

A faithful replica of Kurt's "Ethan's Baseball HQ" prototype, re-plumbed from a
single-device localStorage app into a **multi-tenant web app** where families or
teams sign in, share a team code, and compete on a live leaderboard.

- **Frontend:** the original `index.html` / `styles.css` / `app.js`, visually unchanged.
  The state layer now reads/writes Supabase instead of localStorage.
- **Backend:** Supabase (Postgres + Auth + Row Level Security). One `athletes` row per
  user stores the whole game state as JSONB; a SQL view computes XP **server-side** so
  the leaderboard can't be faked. RLS keeps every team's data isolated.
- **Hosting:** static site on GitHub Pages; the browser talks straight to Supabase.

## One-time setup

### 1. Create the Supabase project
1. Go to https://supabase.com → **New project** (free tier is fine). Pick a name and a
   database password (you won't need the password again for this).
2. Wait for it to finish provisioning (~2 min).

### 2. Load the schema
1. In the project, open **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. You should see it finish with no errors. (It creates the tables, RLS policies, the
   XP engine, onboarding functions, and a demo "Northbrook Spartans" team with join
   code `SPARTANS`.)

### 3. Make sign-up instant (for demo testing)
1. Go to **Authentication → Sign In / Providers → Email**.
2. Turn **OFF** "Confirm email" so testers get a session immediately after signing up.
   (For a real launch you'd leave this on.)

### 4. Wire up the frontend
1. Open **Project Settings → Data API** and copy the **Project URL**.
2. Open **Project Settings → API Keys** and copy the **anon / public** key.
3. Paste both into [`config.js`](config.js):
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJhbGci..."
   };
   ```
   The anon key is meant to live in the browser: RLS is what protects the data.

### 5. Deploy
Commit and push; GitHub Pages serves the site. Share the Pages URL with testers.

## How testing works
- First screen: enter an email + password → an account is created automatically.
- Next: pick a player name and either **Join** the demo team (code `SPARTANS`, lands you
  on a populated leaderboard) or **Create** your own team and share its code.
- Complete a mission / log a workout → XP rises → you move on the leaderboard. Open the
  app on a second device with a second account on the same team code to see two real
  players compete.
- Each user's team code is shown in **Parent → Account**.

## What's intentionally deferred (Phase 2)
- Billing/subscriptions, full COPPA parental-consent flow, per-child multiple athletes
  per parent, notifications, and moderation. See the sprint plan for sequencing.

## Data model (quick reference)
- `teams(id, name, join_code)`: the tenant.
- `athletes(user_id, team_id, display_name, state jsonb)`: one per account; `state` is
  the original app's blob.
- `compute_xp(state)` / `leaderboard` view: server-side XP + workouts, RLS-scoped to team.
- `join_team()` / `create_team_and_join()`: onboarding RPCs.
