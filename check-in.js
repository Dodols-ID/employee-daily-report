(function () {
  const form = document.getElementById('checkin-form');
  const workRows = document.getElementById('work-rows');
  const addWorkBtn = document.getElementById('add-work');
  const messageEl = document.getElementById('checkin-message');
  let rowCount = 1;

  function defaultRowHtml() {
    return `
      <div class="work-row" data-row="0">
        <div class="form-group">
          <label for="dept-goal-0">Department — goal</label>
          <input type="text" id="dept-goal-0" name="deptGoal[]" required placeholder="e.g. Engineering — Build login page">
        </div>
      </div>
    `;
  }

  addWorkBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'work-row';
    row.dataset.row = String(rowCount);
    row.innerHTML = `
      <div class="form-group">
        <label for="dept-goal-${rowCount}">Department — goal</label>
        <input type="text" id="dept-goal-${rowCount}" name="deptGoal[]" required placeholder="e.g. Engineering — Build login page">
      </div>
      <button type="button" class="btn-remove-row" aria-label="Remove this work item">&times;</button>
    `;
    row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
    workRows.appendChild(row);
    rowCount += 1;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const internName = form.internName.value.trim();
    const workItems = [...form.querySelectorAll('[name="deptGoal[]"]')]
      .map((el) => el.value.trim())
      .filter(Boolean);

    try {
      await saveCheckIn({ internName, workItems });
    } catch {
      messageEl.textContent = 'Could not save check-in. Is the server running?';
      messageEl.classList.remove('hidden');
      return;
    }

    messageEl.textContent = `Check-in saved for ${formatDisplayDate(getTodayDateKey())} at ${formatTimestamp(new Date().toISOString())}.`;
    messageEl.classList.remove('hidden');
    form.reset();
    workRows.innerHTML = defaultRowHtml();
    rowCount = 1;
  });
})();
