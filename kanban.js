(function () {
  const STATUSES = ['Current', 'Urgent', 'Waiting'];
  const DEPARTMENTS = [
    'College',
    'Creative',
    'Health',
    'Social',
    'Maintenance',
  ];

  const columns = {
    Current: document.getElementById('col-current'),
    Urgent: document.getElementById('col-urgent'),
    Waiting: document.getElementById('col-waiting'),
  };

  const taskRows = document.getElementById('task-rows');
  const addWorkBtn = document.getElementById('add-work');
  const addForm = document.getElementById('kanban-add-form');
  const addMessage = document.getElementById('kanban-add-message');
  const dockToggle = document.getElementById('dock-toggle');
  const addPanel = document.getElementById('kanban-add-panel');
  const taskModalOverlay = document.getElementById('task-modal-overlay');
  const taskModalClose = document.getElementById('task-modal-close');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskModalBody = document.getElementById('task-modal-body');
  const taskModalDelete = document.getElementById('task-modal-delete');

  let rowCount = 0;
  let activeTaskId = null;
  let isDragging = false;
  let tasksCache = [];

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function isOverdue(dueDate) {
    return dueDate < getTodayDateKey();
  }

  function defaultTaskRowHtml(index) {
    const statusOptions = STATUSES.map(
      (s) => `<option value="${s}">${s}</option>`
    ).join('');
    const deptOptions = DEPARTMENTS.map(
      (d) => `<option value="${d}">${d}</option>`
    ).join('');

    return `
      <div class="task-row" data-row="${index}">
        <div class="form-group">
          <label for="task-title-${index}">Title</label>
          <input type="text" id="task-title-${index}" name="title[]" required placeholder="Task title">
        </div>
        <div class="form-group">
          <label for="task-due-${index}">Due date</label>
          <input type="date" id="task-due-${index}" name="dueDate[]" required>
        </div>
        <div class="form-group">
          <label for="task-status-${index}">Status</label>
          <select id="task-status-${index}" name="status[]" required>${statusOptions}</select>
        </div>
        <div class="form-group">
          <label for="task-dept-${index}">Department</label>
          <select id="task-dept-${index}" name="department[]" required>${deptOptions}</select>
        </div>
        <button type="button" class="btn-remove-row" aria-label="Remove this task">&times;</button>
      </div>
    `;
  }

  function resetAddForm() {
    taskRows.innerHTML = defaultTaskRowHtml(0);
    rowCount = 1;
    bindRemoveButtons();
  }

  function bindRemoveButtons() {
    taskRows.querySelectorAll('.btn-remove-row').forEach((btn) => {
      btn.onclick = () => {
        const rows = taskRows.querySelectorAll('.task-row');
        if (rows.length <= 1) return;
        btn.closest('.task-row').remove();
      };
    });
  }

  addWorkBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.innerHTML = defaultTaskRowHtml(rowCount);
    const el = row.firstElementChild;
    taskRows.appendChild(el);
    rowCount += 1;
    bindRemoveButtons();
  });

  dockToggle.addEventListener('click', () => {
    const open = addPanel.classList.toggle('hidden');
    dockToggle.setAttribute('aria-expanded', String(!open));
    dockToggle.textContent = open ? '+ Add tasks' : 'Close';
  });

  function renderTaskCard(task) {
    const card = document.createElement('article');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    if (isOverdue(task.dueDate)) {
      card.classList.add('kanban-card--overdue');
    }

    card.innerHTML = `
      <h3 class="kanban-card-title">${escapeHtml(task.title)}</h3>
      <p class="kanban-card-due">${escapeHtml(formatDisplayDate(task.dueDate))}</p>
      <p class="kanban-card-meta"><span class="kanban-card-dept">${escapeHtml(task.department)}</span></p>
    `;

    card.addEventListener('dragstart', (e) => {
      isDragging = true;
      card.classList.add('kanban-card--dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('kanban-card--dragging');
      setTimeout(() => {
        isDragging = false;
      }, 0);
      document.querySelectorAll('.kanban-column--drop-target').forEach((el) => {
        el.classList.remove('kanban-column--drop-target');
      });
    });

    card.addEventListener('click', () => {
      if (!isDragging) openTaskModal(task.id);
    });

    return card;
  }

  function renderBoard(tasks) {
    tasksCache = tasks;
    Object.values(columns).forEach((col) => {
      col.innerHTML = '';
    });

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, []]));
    tasks.forEach((t) => {
      if (byStatus[t.status]) byStatus[t.status].push(t);
    });

    STATUSES.forEach((status) => {
      const list = byStatus[status].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate)
      );
      const col = columns[status];
      if (list.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'kanban-empty';
        empty.textContent = 'No tasks';
        col.appendChild(empty);
        return;
      }
      list.forEach((task) => col.appendChild(renderTaskCard(task)));
    });
  }

  function setupColumnDropZones() {
    document.querySelectorAll('.kanban-column').forEach((column) => {
      const status = column.dataset.status;
      const cardsEl = column.querySelector('.kanban-cards');

      cardsEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('kanban-column--drop-target');
      });

      cardsEl.addEventListener('dragleave', (e) => {
        if (!cardsEl.contains(e.relatedTarget)) {
          column.classList.remove('kanban-column--drop-target');
        }
      });

      cardsEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('kanban-column--drop-target');
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const task = tasksCache.find((t) => t.id === taskId);
        if (!task || task.status === status) return;

        try {
          await updateKanbanTaskStatus(taskId, status);
          await loadBoard();
        } catch {
          alert('Could not move task. Check your Supabase connection.');
        }
      });
    });
  }

  async function loadBoard() {
    try {
      const tasks = await getKanbanTasks();
      renderBoard(tasks);
    } catch {
      document.getElementById('kanban-board').innerHTML =
        '<p class="empty-state">Could not load tasks. Check config.js and Supabase setup.</p>';
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
    await loadBoard();
  }

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = taskRows.querySelectorAll('.task-row');
    const tasks = [...rows]
      .map((row) => ({
        title: row.querySelector('[name="title[]"]').value.trim(),
        dueDate: row.querySelector('[name="dueDate[]"]').value,
        status: row.querySelector('[name="status[]"]').value,
        department: row.querySelector('[name="department[]"]').value,
      }))
      .filter((t) => t.title && t.dueDate);

    if (tasks.length === 0) return;

    try {
      await saveKanbanTasks(tasks);
    } catch {
      addMessage.textContent = 'Could not save tasks. Check config.js and Supabase setup.';
      addMessage.classList.remove('hidden');
      return;
    }

    addMessage.textContent = `Added ${tasks.length} task${tasks.length === 1 ? '' : 's'} to the board.`;
    addMessage.classList.remove('hidden');
    resetAddForm();
    await loadBoard();
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

  resetAddForm();
  setupColumnDropZones();
  loadBoard();
})();
