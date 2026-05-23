let supabaseClient = null;

/** In-memory auth storage — avoids SecurityError when localStorage is blocked. */
const memoryAuthStorage = (() => {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
})();

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through — insecure context (file://, some HTTP hosts) */
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function normalizeDateKey(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function normalizeSupabaseUrl(url) {
  let base = String(url).trim().replace(/\/+$/, '');
  base = base.replace(/\/rest\/v1$/i, '');
  if (!base.startsWith('http')) {
    throw new Error('SUPABASE_URL must start with https://');
  }
  return base;
}

function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (typeof supabase === 'undefined') {
    throw new Error(
      'Supabase library not loaded. Include the Supabase CDN script before db.js.'
    );
  }

  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Copy config.example.js to config.js and set your keys.'
    );
  }

  if (
    window.SUPABASE_URL.includes('YOUR_PROJECT') ||
    window.SUPABASE_ANON_KEY.includes('YOUR_ANON')
  ) {
    throw new Error('Replace the placeholder values in config.js with your Supabase keys.');
  }

  supabaseClient = supabase.createClient(
    normalizeSupabaseUrl(window.SUPABASE_URL),
    window.SUPABASE_ANON_KEY.trim(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: memoryAuthStorage,
      },
    }
  );
  return supabaseClient;
}

function wrapSecurityError(err) {
  if (err instanceof DOMException && err.name === 'SecurityError') {
    const hints = [];
    if (window.location.protocol === 'file:') {
      hints.push('Open the site via http://localhost (use start.bat), not by double-clicking HTML files.');
    } else if (
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      hints.push('Use https:// or open via http://localhost:3000.');
    }
    hints.push('Allow storage/cookies for this site, or disable strict tracking protection.');
    hints.push('Check the browser console Network tab for blocked requests to supabase.co.');
    return new Error(`SecurityError: ${err.message}. ${hints.join(' ')}`);
  }
  return err;
}

async function supabaseRequest(run) {
  try {
    const { data, error } = await run(getSupabase());
    if (error) {
      const hint =
        error.code === 'PGRST205' || /relation.*does not exist/i.test(error.message)
          ? ' Run supabase/schema.sql in the Supabase SQL Editor.'
          : '';
      throw new Error(error.message + hint);
    }
    return data;
  } catch (err) {
    throw wrapSecurityError(err);
  }
}

function mapCheckIn(row) {
  return {
    id: row.id,
    internName: row.intern_name,
    workItems: row.work_items,
    submittedAt: row.submitted_at,
  };
}

function mapCheckOut(row) {
  return {
    id: row.id,
    internName: row.intern_name,
    done: row.done,
    blocked: row.blocked,
    notes: row.notes,
    submittedAt: row.submitted_at,
  };
}

function mapKanbanTask(row) {
  return {
    id: row.id,
    title: row.title,
    dueDate: normalizeDateKey(row.due_date),
    status: row.status,
    department: row.department,
    createdAt: row.created_at,
  };
}

async function saveCheckIn(entry) {
  const dateKey = getTodayDateKey();
  const id = newId();
  const submittedAt = new Date().toISOString();

  await supabaseRequest((client) =>
    client.from('check_ins').insert({
      id,
      date_key: dateKey,
      intern_name: entry.internName,
      work_items: entry.workItems,
      submitted_at: submittedAt,
    })
  );

  return dateKey;
}

async function saveCheckOut(entry) {
  const dateKey = getTodayDateKey();
  const id = newId();
  const submittedAt = new Date().toISOString();

  await supabaseRequest((client) =>
    client.from('check_outs').insert({
      id,
      date_key: dateKey,
      intern_name: entry.internName,
      done: entry.done,
      blocked: entry.blocked,
      notes: entry.notes,
      submitted_at: submittedAt,
    })
  );

  return dateKey;
}

async function getAllDateKeys() {
  const [checkIns, checkOuts] = await Promise.all([
    supabaseRequest((client) => client.from('check_ins').select('date_key')),
    supabaseRequest((client) => client.from('check_outs').select('date_key')),
  ]);

  const keys = new Set();
  checkIns.forEach((row) => keys.add(normalizeDateKey(row.date_key)));
  checkOuts.forEach((row) => keys.add(normalizeDateKey(row.date_key)));
  return [...keys].sort();
}

async function getDayData(dateKey) {
  const [checkIns, checkOuts] = await Promise.all([
    supabaseRequest((client) =>
      client
        .from('check_ins')
        .select('*')
        .eq('date_key', dateKey)
        .order('submitted_at', { ascending: true })
    ),
    supabaseRequest((client) =>
      client
        .from('check_outs')
        .select('*')
        .eq('date_key', dateKey)
        .order('submitted_at', { ascending: true })
    ),
  ]);

  return {
    checkIns: checkIns.map(mapCheckIn),
    checkOuts: checkOuts.map(mapCheckOut),
  };
}

async function deleteDay(dateKey) {
  await supabaseRequest((client) =>
    client.from('check_ins').delete().eq('date_key', dateKey)
  );
  await supabaseRequest((client) =>
    client.from('check_outs').delete().eq('date_key', dateKey)
  );
}

async function getKanbanTasks() {
  const rows = await supabaseRequest((client) =>
    client
      .from('kanban_tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
  );
  return rows.map(mapKanbanTask);
}

async function getKanbanTask(id) {
  const rows = await supabaseRequest((client) =>
    client.from('kanban_tasks').select('*').eq('id', id).limit(1)
  );
  if (!rows.length) throw new Error('Task not found');
  return mapKanbanTask(rows[0]);
}

async function saveKanbanTasks(tasks) {
  const createdAt = new Date().toISOString();
  const rows = tasks.map((task) => ({
    id: newId(),
    title: task.title,
    due_date: task.dueDate,
    status: task.status,
    department: task.department,
    created_at: createdAt,
  }));

  const inserted = await supabaseRequest((client) =>
    client.from('kanban_tasks').insert(rows).select('*')
  );

  return inserted.map(mapKanbanTask);
}

async function updateKanbanTaskStatus(id, status) {
  const rows = await supabaseRequest((client) =>
    client
      .from('kanban_tasks')
      .update({ status })
      .eq('id', id)
      .select('*')
  );
  if (!rows.length) throw new Error('Task not found');
  return mapKanbanTask(rows[0]);
}

async function deleteKanbanTask(id) {
  await supabaseRequest((client) =>
    client.from('kanban_tasks').delete().eq('id', id)
  );
}
