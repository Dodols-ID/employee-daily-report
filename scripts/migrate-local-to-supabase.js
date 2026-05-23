/**
 * One-time migration: copy data from local reports.db into Supabase.
 *
 * Usage:
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *   npm run migrate
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { createClient } = require('@supabase/supabase-js');

const DB_PATH = path.join(__dirname, '..', 'reports.db');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
  );
  console.error(
    'Use the service role key from Supabase Dashboard → Settings → API (keep it secret).'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function loadLocalDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No reports.db found — nothing to migrate.');
    return null;
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  function queryAll(sql) {
    const stmt = db.prepare(sql);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  return {
    checkIns: queryAll('SELECT * FROM check_ins'),
    checkOuts: queryAll('SELECT * FROM check_outs'),
    kanbanTasks: queryAll('SELECT * FROM kanban_tasks'),
  };
}

async function upsert(table, rows, mapRow) {
  if (!rows.length) {
    console.log(`  ${table}: 0 rows`);
    return;
  }

  const payload = rows.map(mapRow);
  const { error } = await supabase.from(table).upsert(payload, {
    onConflict: 'id',
  });

  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length} row(s)`);
}

async function main() {
  console.log('Loading local SQLite data...');
  const local = await loadLocalDb();
  if (!local) return;

  console.log('Uploading to Supabase...');

  await upsert('check_ins', local.checkIns, (row) => ({
    id: row.id,
    date_key: row.date_key,
    intern_name: row.intern_name,
    work_items: JSON.parse(row.work_items),
    submitted_at: row.submitted_at,
  }));

  await upsert('check_outs', local.checkOuts, (row) => ({
    id: row.id,
    date_key: row.date_key,
    intern_name: row.intern_name,
    done: row.done,
    blocked: row.blocked,
    notes: row.notes,
    submitted_at: row.submitted_at,
  }));

  await upsert('kanban_tasks', local.kanbanTasks, (row) => ({
    id: row.id,
    title: row.title,
    due_date: row.due_date,
    status: row.status,
    department: row.department,
    created_at: row.created_at,
  }));

  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
