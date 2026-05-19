const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, 'reports.db');

let db;
let initPromise;

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      date_key TEXT NOT NULL,
      intern_name TEXT NOT NULL,
      work_items TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS check_outs (
      id TEXT PRIMARY KEY,
      date_key TEXT NOT NULL,
      intern_name TEXT NOT NULL,
      done TEXT NOT NULL,
      blocked TEXT NOT NULL,
      notes TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    )
  `);
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(date_key)'
  );
  db.run(
    'CREATE INDEX IF NOT EXISTS idx_check_outs_date ON check_outs(date_key)'
  );
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  persist();
}

async function init() {
  if (db) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    initSchema();
    persist();
  })();
  await initPromise;
}

function rowToCheckIn(row) {
  return {
    id: row.id,
    internName: row.intern_name,
    workItems: JSON.parse(row.work_items),
    submittedAt: row.submitted_at,
  };
}

function rowToCheckOut(row) {
  return {
    id: row.id,
    internName: row.intern_name,
    done: row.done,
    blocked: row.blocked,
    notes: row.notes,
    submittedAt: row.submitted_at,
  };
}

function getAllDateKeys() {
  const rows = queryAll(`
    SELECT date_key FROM check_ins
    UNION
    SELECT date_key FROM check_outs
    ORDER BY date_key
  `);
  return rows.map((r) => r.date_key);
}

function getDayData(dateKey) {
  const checkIns = queryAll(
    'SELECT * FROM check_ins WHERE date_key = ? ORDER BY submitted_at ASC',
    [dateKey]
  ).map(rowToCheckIn);
  const checkOuts = queryAll(
    'SELECT * FROM check_outs WHERE date_key = ? ORDER BY submitted_at ASC',
    [dateKey]
  ).map(rowToCheckOut);
  return { checkIns, checkOuts };
}

function saveCheckIn(dateKey, entry) {
  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  run(
    `INSERT INTO check_ins (id, date_key, intern_name, work_items, submitted_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, dateKey, entry.internName, JSON.stringify(entry.workItems), submittedAt]
  );
  return { id, dateKey, submittedAt };
}

function saveCheckOut(dateKey, entry) {
  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  run(
    `INSERT INTO check_outs (id, date_key, intern_name, done, blocked, notes, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      dateKey,
      entry.internName,
      entry.done,
      entry.blocked,
      entry.notes,
      submittedAt,
    ]
  );
  return { id, dateKey, submittedAt };
}

module.exports = {
  init,
  getAllDateKeys,
  getDayData,
  saveCheckIn,
  saveCheckOut,
};
