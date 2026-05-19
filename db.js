const API_BASE = '/api';

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
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

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

async function saveCheckIn(entry) {
  const result = await apiJson(`${API_BASE}/check-ins`, {
    method: 'POST',
    body: JSON.stringify({
      dateKey: getTodayDateKey(),
      internName: entry.internName,
      workItems: entry.workItems,
    }),
  });
  return result.dateKey;
}

async function saveCheckOut(entry) {
  const result = await apiJson(`${API_BASE}/check-outs`, {
    method: 'POST',
    body: JSON.stringify({
      dateKey: getTodayDateKey(),
      internName: entry.internName,
      done: entry.done,
      blocked: entry.blocked,
      notes: entry.notes,
    }),
  });
  return result.dateKey;
}

async function getAllDateKeys() {
  return apiJson(`${API_BASE}/dates`);
}

async function getDayData(dateKey) {
  return apiJson(`${API_BASE}/days/${encodeURIComponent(dateKey)}`);
}
