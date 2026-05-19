# Employee Daily Check-in / Check-out Report

A simple website for intern daily check-in and check-out reports. Data is stored in a local **SQLite** database file (`reports.db`) in this folder.

## Pages

- **Home** (`index.html`) — Lists all dates with submissions, sortable newest/oldest. Click a date to open a report modal; use **Delete this date** to remove all check-ins and check-outs for that day.
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

## Where data is stored

All reports live in **`reports.db`** in this project folder (same folder as `server.js`):

```
c:\Users\loren\employee-daily-report\reports.db
```

The file is created the first time you run **`start.bat`** or **`npm start`** (when the server starts), not when you run `npm install`. You must use the server at `http://localhost:3000` — opening HTML files directly (`file://`) will not read or write this database.

When the server starts, the console prints the full path to the database file.

## Data structure

Reports are keyed by date (`YYYY-MM-DD`). Each date has:

- `checkIns[]` — intern name, work items (department + goal), submission timestamp
- `checkOuts[]` — intern name, done/blocked/notes, submission timestamp

The API mirrors this shape:

- `GET /api/dates` — list of date keys
- `GET /api/days/:dateKey` — `{ checkIns, checkOuts }` for one date
- `POST /api/check-ins` — body: `{ dateKey, internName, workItems }`
- `POST /api/check-outs` — body: `{ dateKey, internName, done, blocked, notes }`
- `DELETE /api/days/:dateKey` — removes all check-ins and check-outs for that date

## GitHub Pages vs shared data

**GitHub Pages only hosts static files** (HTML, CSS, JS). It cannot run Node.js or keep a `reports.db` file on the server for everyone to share.

| Setup | Cross-device? |
|--------|----------------|
| **This project as-is** (`npm start` on your PC) | No — data stays on the machine where the server runs. Another phone/laptop only sees data if it talks to that same running server on your network. |
| **GitHub Pages** (static hosting only) | No — there is no API or database; check-in/check-out would not save unless you rewrote the app to use a hosted backend. |
| **Hosted backend** (e.g. Railway, Render, Fly.io + PostgreSQL/SQLite) | Yes — one database on the internet; any device with the URL can read/write the same reports. |

To use the same reports from multiple devices, you need a **always-on server** with a **central database**, not just the repo on GitHub Pages.
