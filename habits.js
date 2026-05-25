(function () {
  const habitList = document.getElementById('habit-list');
  const habitsEmpty = document.getElementById('habits-empty');
  const habitRows = document.getElementById('habit-rows');
  const addHabitRowBtn = document.getElementById('add-habit-row');
  const habitsAddForm = document.getElementById('habits-add-form');
  const habitsAddMessage = document.getElementById('habits-add-message');
  const dockToggle = document.getElementById('habits-dock-toggle');
  const addPanel = document.getElementById('habits-add-panel');

  const detailOverlay = document.getElementById('habit-detail-overlay');
  const detailClose = document.getElementById('habit-detail-close');
  const detailTitle = document.getElementById('habit-detail-title');
  const habitStats = document.getElementById('habit-stats');
  const habitMiniCal = document.getElementById('habit-mini-cal');
  const habitCalLabel = document.getElementById('habit-cal-label');
  const habitCalPrev = document.getElementById('habit-cal-prev');
  const habitCalNext = document.getElementById('habit-cal-next');
  const habitDetailDelete = document.getElementById('habit-detail-delete');

  const logOverlay = document.getElementById('habit-log-overlay');
  const logClose = document.getElementById('habit-log-close');
  const logForm = document.getElementById('habit-log-form');
  const logHabitId = document.getElementById('habit-log-habit-id');
  const logDateInput = document.getElementById('habit-log-date');
  const logMessage = document.getElementById('habit-log-message');
  const logTitle = document.getElementById('habit-log-title');

  const dayOverlay = document.getElementById('habit-day-overlay');
  const dayClose = document.getElementById('habit-day-close');
  const dayTitle = document.getElementById('habit-day-title');
  const dayBody = document.getElementById('habit-day-body');

  let rowCount = 0;
  let habitsCache = [];
  let logsByHabit = new Map();
  let activeHabitId = null;
  let detailLogs = [];
  let detailViewYear;
  let detailViewMonth;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function parseDurationToMinutes(text) {
    const raw = String(text).trim().toLowerCase();
    if (!raw) return 0;

    let total = 0;
    const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|r)?/);
    const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/);
    if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
    if (minMatch) total += parseFloat(minMatch[1]);
    if (!hourMatch && !minMatch) {
      const num = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (!Number.isNaN(num)) total += num;
    }
    return Math.max(0, Math.round(total));
  }

  function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function dateKeyFromParts(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function daysBetween(startKey, endKey) {
    const [sy, sm, sd] = startKey.split('-').map(Number);
    const [ey, em, ed] = endKey.split('-').map(Number);
    const a = new Date(sy, sm - 1, sd);
    const b = new Date(ey, em - 1, ed);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }

  function computeStreak(logDates) {
    if (!logDates.length) return 0;
    const set = new Set(logDates);
    const sorted = [...logDates].sort();
    let streak = 0;
    let cursor = sorted[sorted.length - 1];
    while (set.has(cursor)) {
      streak += 1;
      const [y, m, d] = cursor.split('-').map(Number);
      const prev = new Date(y, m - 1, d - 1);
      cursor = dateKeyFromParts(prev.getFullYear(), prev.getMonth(), prev.getDate());
    }
    return streak;
  }

  function computeStats(logs, habitCreatedAt) {
    const logDates = logs.map((l) => l.logDate);
    const createdKey = normalizeDateKey(habitCreatedAt).slice(0, 10) || getHabitLogDateKey();
    const todayKey = getHabitLogDateKey();
    const totalDays = daysBetween(createdKey, todayKey);
    const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);
    return {
      streak: computeStreak(logDates),
      frequency: Math.round((logs.length / totalDays) * 100),
      totalHours: (totalMinutes / 60).toFixed(1),
      logCount: logs.length,
    };
  }

  function defaultHabitRowHtml(index) {
    return `
      <div class="task-row" data-row="${index}">
        <div class="form-group">
          <label for="habit-name-${index}">Habit name</label>
          <input type="text" id="habit-name-${index}" name="habitName[]" required placeholder="e.g. Morning run">
        </div>
        <button type="button" class="btn-remove-row" aria-label="Remove this habit">&times;</button>
      </div>
    `;
  }

  function resetAddForm() {
    habitRows.innerHTML = defaultHabitRowHtml(0);
    rowCount = 1;
    bindRemoveButtons();
  }

  function bindRemoveButtons() {
    habitRows.querySelectorAll('.btn-remove-row').forEach((btn) => {
      btn.onclick = () => {
        if (habitRows.querySelectorAll('.task-row').length <= 1) return;
        btn.closest('.task-row').remove();
      };
    });
  }

  function hasLogToday(habitId) {
    const logs = logsByHabit.get(habitId) || [];
    const today = getHabitLogDateKey();
    return logs.some((l) => l.logDate === today);
  }

  function renderHabitCard(habit) {
    const li = document.createElement('li');
    const loggedToday = hasLogToday(habit.id);
    const windowOpen = isHabitSubmissionWindowOpen();
    const canLog = !loggedToday && windowOpen;

    li.className = 'habit-card-wrap';
    li.innerHTML = `
      <article class="habit-card">
        <button type="button" class="habit-card-main" data-habit-id="${habit.id}">
          <h3 class="habit-card-title">${escapeHtml(habit.name)}</h3>
          <p class="habit-card-meta">${loggedToday ? 'Logged today' : windowOpen ? 'Not logged today' : 'Closed after 11:59 PM'}</p>
        </button>
        <button type="button" class="btn btn-primary btn-log-today" data-habit-id="${habit.id}" ${canLog ? '' : 'disabled'}>
          ${loggedToday ? 'Done today' : 'Log today'}
        </button>
      </article>
    `;

    li.querySelector('.habit-card-main').addEventListener('click', () =>
      openHabitDetail(habit.id)
    );
    li.querySelector('.btn-log-today').addEventListener('click', (e) => {
      e.stopPropagation();
      if (canLog) openLogForm(habit.id, getHabitLogDateKey());
    });

    return li;
  }

  async function loadHabits() {
    try {
      habitsCache = await getHabits();
      logsByHabit = new Map();
      await Promise.all(
        habitsCache.map(async (h) => {
          const logs = await getHabitLogs(h.id);
          logsByHabit.set(h.id, logs);
        })
      );

      habitList.innerHTML = '';
      if (habitsCache.length === 0) {
        habitsEmpty.classList.remove('hidden');
        return;
      }
      habitsEmpty.classList.add('hidden');
      habitsCache.forEach((h) => habitList.appendChild(renderHabitCard(h)));
    } catch (err) {
      habitList.innerHTML = '';
      habitsEmpty.textContent = `Could not load habits: ${err.message}`;
      habitsEmpty.classList.remove('hidden');
    }
  }

  function openLogForm(habitId, logDate, titleLabel) {
    logHabitId.value = habitId;
    logDateInput.value = logDate;
    logTitle.textContent = titleLabel || `Log — ${formatDisplayDate(logDate)}`;
    logForm.reset();
    logHabitId.value = habitId;
    logDateInput.value = logDate;
    logMessage.classList.add('hidden');
    logOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLogForm() {
    logOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderMiniCalendar(logs) {
    const logMap = new Map(logs.map((l) => [l.logDate, l]));
    habitCalLabel.textContent = new Date(detailViewYear, detailViewMonth, 1).toLocaleDateString(
      undefined,
      { month: 'long', year: 'numeric' }
    );

    const firstDay = new Date(detailViewYear, detailViewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(detailViewYear, detailViewMonth + 1, 0).getDate();
    const todayKey = getHabitLogDateKey();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    let html = '<div class="habit-mini-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="habit-mini-days">';

    for (let i = 0; i < totalCells; i += 1) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        html += '<span class="habit-mini-day habit-mini-day--empty"></span>';
        continue;
      }
      const dateKey = dateKeyFromParts(detailViewYear, detailViewMonth, dayNum);
      const logged = logMap.has(dateKey);
      const classes = ['habit-mini-day'];
      if (logged) classes.push('habit-mini-day--done');
      if (dateKey === todayKey) classes.push('habit-mini-day--today');
      html += `<button type="button" class="${classes.join(' ')}" data-date="${dateKey}" ${logged ? '' : 'disabled'}>${dayNum}</button>`;
    }
    html += '</div>';
    habitMiniCal.innerHTML = html;

    habitMiniCal.querySelectorAll('.habit-mini-day--done').forEach((btn) => {
      btn.addEventListener('click', () => openDayView(activeHabitId, btn.dataset.date));
    });
  }

  function renderStats(stats) {
    habitStats.innerHTML = `
      <div class="habit-stat-grid">
        <div class="habit-stat"><span class="habit-stat-value">${stats.streak}</span><span class="habit-stat-label">Day streak</span></div>
        <div class="habit-stat"><span class="habit-stat-value">${stats.frequency}%</span><span class="habit-stat-label">Frequency</span></div>
        <div class="habit-stat"><span class="habit-stat-value">${stats.totalHours}h</span><span class="habit-stat-label">Total time</span></div>
        <div class="habit-stat"><span class="habit-stat-value">${stats.logCount}</span><span class="habit-stat-label">Total logs</span></div>
      </div>
    `;
  }

  async function openHabitDetail(habitId) {
    activeHabitId = habitId;
    let habit;
    try {
      habit = await getHabit(habitId);
      detailLogs = await getHabitLogs(habitId);
    } catch (err) {
      alert(`Could not load habit: ${err.message}`);
      return;
    }

    const now = new Date();
    detailViewYear = now.getFullYear();
    detailViewMonth = now.getMonth();

    detailTitle.textContent = habit.name;
    renderStats(computeStats(detailLogs, habit.createdAt));
    renderMiniCalendar(detailLogs);

    detailOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeHabitDetail() {
    detailOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    activeHabitId = null;
  }

  async function openDayView(habitId, logDate) {
    const log = detailLogs.find((l) => l.logDate === logDate);
    if (!log) return;

    dayTitle.textContent = formatDisplayDate(logDate);
    dayBody.innerHTML = `
      <dl class="task-detail-dl">
        <dt>What's done</dt>
        <dd class="task-detail-primary">${escapeHtml(log.whatsDone)}</dd>
        <dt>For how long</dt>
        <dd>${escapeHtml(formatDuration(log.durationMinutes))}</dd>
        <dt>What to improve</dt>
        <dd>${escapeHtml(log.whatToImprove || '—')}</dd>
        <dt>Submitted</dt>
        <dd>${escapeHtml(formatTimestamp(log.submittedAt))}</dd>
      </dl>
    `;
    dayOverlay.classList.remove('hidden');
  }

  function closeDayView() {
    dayOverlay.classList.add('hidden');
  }

  async function deleteActiveHabit() {
    if (!activeHabitId) return;
    const habit = habitsCache.find((h) => h.id === activeHabitId);
    if (!confirm(`Delete habit "${habit?.name || 'this habit'}" and all its logs?`)) return;
    try {
      await deleteHabit(activeHabitId);
    } catch (err) {
      alert(err.message);
      return;
    }
    closeHabitDetail();
    await loadHabits();
  }

  addHabitRowBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.innerHTML = defaultHabitRowHtml(rowCount);
    habitRows.appendChild(row.firstElementChild);
    rowCount += 1;
    bindRemoveButtons();
  });

  dockToggle.addEventListener('click', () => {
    const open = addPanel.classList.toggle('hidden');
    dockToggle.setAttribute('aria-expanded', String(!open));
    dockToggle.textContent = open ? '+ Add habits' : 'Close';
  });

  habitsAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const names = [...habitRows.querySelectorAll('[name="habitName[]"]')]
      .map((el) => el.value.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    if (!names.length) return;

    try {
      await saveHabits(names);
      habitsAddMessage.textContent = `Added ${names.length} habit${names.length === 1 ? '' : 's'}.`;
      habitsAddMessage.classList.remove('hidden');
      resetAddForm();
      await loadHabits();
    } catch (err) {
      habitsAddMessage.textContent = err.message;
      habitsAddMessage.classList.remove('hidden');
    }
  });

  logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const habitId = logHabitId.value;
    const logDate = logDateInput.value || getHabitLogDateKey();
    const entry = {
      logDate,
      whatsDone: logForm.whatsDone.value.trim(),
      durationMinutes: parseDurationToMinutes(logForm.duration.value),
      whatToImprove: logForm.whatToImprove.value.trim(),
    };

    if (!entry.whatsDone) return;

    try {
      await saveHabitLog(habitId, entry);
      closeLogForm();
      await loadHabits();
      if (activeHabitId === habitId) await openHabitDetail(habitId);
    } catch (err) {
      logMessage.textContent = err.message;
      logMessage.classList.remove('hidden');
    }
  });

  habitCalPrev.addEventListener('click', () => {
    detailViewMonth -= 1;
    if (detailViewMonth < 0) {
      detailViewMonth = 11;
      detailViewYear -= 1;
    }
    renderMiniCalendar(detailLogs);
  });

  habitCalNext.addEventListener('click', () => {
    detailViewMonth += 1;
    if (detailViewMonth > 11) {
      detailViewMonth = 0;
      detailViewYear += 1;
    }
    renderMiniCalendar(detailLogs);
  });

  detailClose.addEventListener('click', closeHabitDetail);
  habitDetailDelete.addEventListener('click', deleteActiveHabit);
  logClose.addEventListener('click', closeLogForm);
  dayClose.addEventListener('click', closeDayView);

  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) closeHabitDetail();
  });
  logOverlay.addEventListener('click', (e) => {
    if (e.target === logOverlay) closeLogForm();
  });
  dayOverlay.addEventListener('click', (e) => {
    if (e.target === dayOverlay) closeDayView();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!dayOverlay.classList.contains('hidden')) closeDayView();
    else if (!logOverlay.classList.contains('hidden')) closeLogForm();
    else if (!detailOverlay.classList.contains('hidden')) closeHabitDetail();
  });

  resetAddForm();
  loadHabits();
})();
