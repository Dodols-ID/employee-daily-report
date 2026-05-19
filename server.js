const { exec } = require('child_process');
const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/dates', (_req, res) => {
  res.json(db.getAllDateKeys());
});

app.get('/api/days/:dateKey', (req, res) => {
  res.json(db.getDayData(req.params.dateKey));
});

app.post('/api/check-ins', (req, res) => {
  const { dateKey, internName, workItems } = req.body;
  if (!dateKey || !internName || !Array.isArray(workItems)) {
    res.status(400).json({ error: 'dateKey, internName, and workItems are required' });
    return;
  }
  const result = db.saveCheckIn(dateKey, { internName, workItems });
  res.status(201).json(result);
});

app.post('/api/check-outs', (req, res) => {
  const { dateKey, internName, done, blocked, notes } = req.body;
  if (!dateKey || !internName) {
    res.status(400).json({ error: 'dateKey and internName are required' });
    return;
  }
  const result = db.saveCheckOut(dateKey, {
    internName,
    done: done ?? '',
    blocked: blocked ?? '',
    notes: notes ?? '',
  });
  res.status(201).json(result);
});

function openBrowser(url) {
  if (process.env.NO_OPEN_BROWSER === '1') return;

  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.log(`Open in your browser: ${url}`);
  });
}

db.init().then(() => {
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Employee daily report running at ${url}`);
    console.log(`SQLite database: ${path.join(__dirname, 'reports.db')}`);
    openBrowser(url);
  });
});
