(function () {
  const monthLabel = document.getElementById('cal-month-label');
  const calendarDays = document.getElementById('calendar-days');
  const calPrev = document.getElementById('cal-prev');
  const calNext = document.getElementById('cal-next');
  const calToday = document.getElementById('cal-today');
  const taskModalOverlay = document.getElementById('task-modal-overlay');
  const taskModalClose = document.getElementById('task-modal-close');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskModalBody = document.getElementById('task-modal-body');
  const taskModalDelete = document.getElementById('task-modal-delete');

  let viewYear;
  let viewMonth;
  let tasksCache = [];
  let activeTaskId = null;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function isOverdue(dueDate) {
    return dueDate < getTodayDateKey();
  }

  function dateKeyFromParts(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function initViewDate() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
  }

  function renderMonthLabel() {
    const labelDate = new Date(viewYear, viewMonth, 1);
    monthLabel.textContent = labelDate.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  function tasksForDate(dateKey) {
    return tasksCache
      .filter((t) => t.dueDate === dateKey)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  function renderCalendar() {
    renderMonthLabel();
    calendarDays.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = getTodayDateKey();

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i += 1) {
      const dayNum = i - startOffset + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      if (dayNum < 1 || dayNum > daysInMonth) {
        cell.classList.add('calendar-day--outside');
        calendarDays.appendChild(cell);
        continue;
      }

      const dateKey = dateKeyFromParts(viewYear, viewMonth, dayNum);
      if (dateKey === todayKey) cell.classList.add('calendar-day--today');

      const dayTasks = tasksForDate(dateKey);
      if (dayTasks.some((t) => isOverdue(t.dueDate))) {
        cell.classList.add('calendar-day--has-overdue');
      }

      const header = document.createElement('div');
      header.className = 'calendar-day-number';
      header.textContent = String(dayNum);
      cell.appendChild(header);

      const list = document.createElement('div');
      list.className = 'calendar-day-tasks';

      dayTasks.forEach((task) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'calendar-task-chip';
        if (isOverdue(task.dueDate)) chip.classList.add('calendar-task-chip--overdue');
        chip.innerHTML = `
          <span class="calendar-task-title">${escapeHtml(task.title)}</span>
          <span class="calendar-task-meta">${escapeHtml(task.status)} · ${escapeHtml(task.department)}</span>
        `;
        chip.addEventListener('click', () => openTaskModal(task.id));
        list.appendChild(chip);
      });

      cell.appendChild(list);
      calendarDays.appendChild(cell);
    }
  }

  function closeTaskModal() {
    taskModalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    activeTaskId = null;
  }

  async function openTaskModal(taskId) {
    activeTaskId = taskId;
    let task;
    try {
      task = await getKanbanTask(taskId);
    } catch {
      alert('Could not load task.');
      return;
    }

    taskModalTitle.textContent = task.title;
    const overdue = isOverdue(task.dueDate);
    taskModalBody.innerHTML = `
      <dl class="task-detail-dl ${overdue ? 'task-detail-dl--overdue' : ''}">
        <dt>Due date</dt>
        <dd class="task-detail-primary">${escapeHtml(formatDisplayDate(task.dueDate))}${overdue ? ' <span class="task-overdue-badge">Overdue</span>' : ''}</dd>
        <dt>Status</dt>
        <dd>${escapeHtml(task.status)}</dd>
        <dt>Department</dt>
        <dd>${escapeHtml(task.department)}</dd>
        <dt>Added</dt>
        <dd>${escapeHtml(formatTimestamp(task.createdAt))}</dd>
      </dl>
    `;

    taskModalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  async function deleteActiveTask() {
    if (!activeTaskId) return;
    const task = tasksCache.find((t) => t.id === activeTaskId);
    const label = task ? task.title : 'this task';
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      await deleteKanbanTask(activeTaskId);
    } catch {
      alert('Could not delete task.');
      return;
    }

    closeTaskModal();
    await loadTasks();
  }

  async function loadTasks() {
    try {
      tasksCache = await getKanbanTasks();
      renderCalendar();
    } catch {
      calendarDays.innerHTML =
        '<p class="empty-state">Could not load calendar. Check your Supabase config in config.js.</p>';
    }
  }

  calPrev.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  calNext.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  calToday.addEventListener('click', () => {
    initViewDate();
    renderCalendar();
  });

  taskModalClose.addEventListener('click', closeTaskModal);
  taskModalDelete.addEventListener('click', deleteActiveTask);
  taskModalOverlay.addEventListener('click', (e) => {
    if (e.target === taskModalOverlay) closeTaskModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !taskModalOverlay.classList.contains('hidden')) {
      closeTaskModal();
    }
  });

  initViewDate();
  loadTasks();
})();
