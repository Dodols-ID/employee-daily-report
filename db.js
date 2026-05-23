let supabaseClient = null;

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
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  return supabaseClient;
}

async function supabaseRequest(run) {
  const { data, error } = await run(getSupabase());
  if (error) throw new Error(error.message);
  return data;
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
  const id = crypto.randomUUID();
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
  const id = crypto.randomUUID();
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
    id: crypto.randomUUID(),
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
