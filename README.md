# Employee Daily Check-in / Check-out Report

A simple website for intern daily check-in and check-out reports. Data is stored in a local **SQLite** database file (`reports.db`) in this folder.

## Pages

- **Home** (`index.html`) — Lists all dates with submissions, sortable newest/oldest. Click a date to open a report modal.
- **Check-in** (`check-in.html`) — Intern name, department/goal pairs (add more with **+ Work**).
- **Check-out** (`check-out.html`) — What got done, blockers, and notes for tomorrow.

## Run locally

Install dependencies and start the server:

```bash
npm install
npm start
```

Your default browser opens to [http://localhost:3000](http://localhost:3000) automatically. On Windows you can also double-click `start.bat`.

To skip auto-open: `set NO_OPEN_BROWSER=1` then `npm start`.

The SQLite database is created automatically at `reports.db` on first write.

## Data structure

Reports are keyed by date (`YYYY-MM-DD`). Each date has:

- `checkIns[]` — intern name, work items (department + goal), submission timestamp
- `checkOuts[]` — intern name, done/blocked/notes, submission timestamp

The API mirrors this shape:

- `GET /api/dates` — list of date keys
- `GET /api/days/:dateKey` — `{ checkIns, checkOuts }` for one date
- `POST /api/check-ins` — body: `{ dateKey, internName, workItems }`
- `POST /api/check-outs` — body: `{ dateKey, internName, done, blocked, notes }`
