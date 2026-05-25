# Employee Daily Check-in / Check-out Report

A static web app for intern daily reports and a kanban task board. **All data is stored in [Supabase](https://supabase.com)** so the site works online on **GitHub Pages** from any device.

## Pages

- **Home** — Daily check-in / check-out reports by date
- **Check-in** — Morning department goals
- **Check-out** — End-of-day summary
- **Kanban** — Current / Urgent / Waiting columns with drag-and-drop
- **Calendar** — Month view of kanban tasks by due date
- **Habits** — Habit tracker with daily logs, streaks, and mini calendar

## Setup (one time)

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Open **SQL Editor** and run the full script in [`supabase/schema.sql`](supabase/schema.sql). If you already ran it before, run only the new `habits` / `habit_logs` section at the bottom of the file.
3. In **Project Settings → API**, copy:
   - **Project URL** — e.g. `https://xxxxx.supabase.co` (not the REST URL ending in `/rest/v1/`)
   - **anon public** key (safe for the browser)

### 2. Local config

```bash
copy config.example.js config.js
```

Edit `config.js` with your Supabase URL and anon key.

### 3. Migrate existing local SQLite data (optional)

If you have an old `reports.db` from the previous local-server version:

```bash
npm install
set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npm run migrate
```

Use the **service role** key only for this one-time migration (never commit it or put it in the website).

### 4. Run locally

Double-click **`start.bat`** or:

```bash
npm run serve
```

Open [http://localhost:3000](http://localhost:3000). Data reads/writes go to Supabase, not your PC.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the repo **Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main` (or `master`). The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds `config.js` from secrets and deploys the static site.

Your site will be at `https://<username>.github.io/<repo-name>/`.

## Data structure (Supabase)

| Table | Purpose |
|-------|---------|
| `check_ins` | Daily check-ins (`date_key`, `intern_name`, `work_items` JSON) |
| `check_outs` | Daily check-outs (`done`, `blocked`, `notes`) |
| `kanban_tasks` | Tasks (`title`, `due_date`, `status`, `department`) |
| `habits` | Habit names |
| `habit_logs` | Daily logs (`whats_done`, `duration_minutes`, `what_to_improve`) — one per habit per day |

Row-level security is open for read/write (suitable for a small internal team). For production, add Supabase Auth and tighten policies.

## Architecture

```
Browser (GitHub Pages or local serve)
    ↓ Supabase JS client (config.js + anon key)
Supabase PostgreSQL
```

There is **no Node server** in production. The old `reports.db` / Express setup has been replaced by Supabase.

## Calendar

The **Calendar** page shows all kanban tasks on their **due date** in a month grid. Overdue days are highlighted; click a task chip to view or delete it (same modal as Kanban).

## Troubleshooting

### `SecurityError: The request was denied`

Usually **not** a wrong API key. Common causes:

1. **Opening HTML files directly** (`file://`) — use `start.bat` or `npm run serve` and open `http://localhost:3000`.
2. **Browser privacy settings** blocking storage or cross-site requests — relax tracking protection for your site, or try another browser.
3. **Wrong Supabase URL** — use **Project URL** (`https://xxx.supabase.co`), not `.../rest/v1/`.
4. **GitHub Pages secrets** — `SUPABASE_URL` must be the Project URL; re-deploy after fixing secrets.
5. **Supabase project paused** — resume the project in the Supabase dashboard (free tier pauses inactive projects).

Check **Developer tools → Console** and **Network** for the exact failing request.
