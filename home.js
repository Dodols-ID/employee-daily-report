(function () {
  const dateList = document.getElementById('date-list');
  const emptyState = document.getElementById('empty-state');
  const sortOrder = document.getElementById('sort-order');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalCheckin = document.getElementById('modal-checkin');
  const modalCheckout = document.getElementById('modal-checkout');
  const modalDelete = document.getElementById('modal-delete');
  let activeDateKey = null;

  function sortDates(dates, order) {
    const sorted = [...dates].sort();
    return order === 'newest' ? sorted.reverse() : sorted;
  }

  function renderCheckInEntry(entry) {
    const workHtml = entry.workItems
      .map((w) => {
        const text = typeof w === 'string' ? w : [w.department, w.goal].filter(Boolean).join(' — ');
        return `<li>${escapeHtml(text)}</li>`;
      })
      .join('');

    return `
      <article class="entry-card">
        <p class="entry-meta"><strong>${escapeHtml(entry.internName)}</strong> · ${formatTimestamp(entry.submittedAt)}</p>
        <ol class="work-list">${workHtml}</ol>
      </article>
    `;
  }

  function renderCheckOutEntry(entry) {
    return `
      <article class="entry-card">
        <p class="entry-meta"><strong>${escapeHtml(entry.internName)}</strong> · ${formatTimestamp(entry.submittedAt)}</p>
        <dl class="checkout-dl">
          <dt>What got done</dt>
          <dd>${escapeHtml(entry.done)}</dd>
          <dt>What blocked progress</dt>
          <dd>${escapeHtml(entry.blocked)}</dd>
          <dt>Notes for tomorrow</dt>
          <dd>${escapeHtml(entry.notes)}</dd>
        </dl>
      </article>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function openModal(dateKey) {
    activeDateKey = dateKey;
    const data = await getDayData(dateKey);
    modalTitle.textContent = `${formatDisplayDate(dateKey)} Report`;

    modalCheckin.innerHTML =
      data.checkIns.length > 0
        ? data.checkIns.map(renderCheckInEntry).join('')
        : '<p class="no-data">No check-in submitted for this date.</p>';

    modalCheckout.innerHTML =
      data.checkOuts.length > 0
        ? data.checkOuts.map(renderCheckOutEntry).join('')
        : '<p class="no-data">No check-out submitted for this date.</p>';

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    activeDateKey = null;
  }

  async function deleteActiveDate() {
    if (!activeDateKey) return;
    const label = formatDisplayDate(activeDateKey);
    const confirmed = confirm(
      `Delete all check-in and check-out data for ${label}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteDay(activeDateKey);
    } catch {
      alert('Could not delete this date. Check your Supabase connection.');
      return;
    }

    closeModal();
    await renderDateList();
  }

  async function renderDateList() {
    let dates;
    try {
      dates = await getAllDateKeys();
    } catch (err) {
      dateList.innerHTML = '';
      emptyState.textContent = `Could not load reports: ${err.message}`;
      emptyState.classList.remove('hidden');
      return;
    }
    dateList.innerHTML = '';
    emptyState.textContent =
      'No reports yet. Submit a check-in or check-out to get started.';

    if (dates.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const sorted = sortDates(dates, sortOrder.value);

    sorted.forEach((dateKey) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-item';
      btn.textContent = formatDisplayDate(dateKey);
      btn.addEventListener('click', () => openModal(dateKey));
      li.appendChild(btn);
      dateList.appendChild(li);
    });
  }

  sortOrder.addEventListener('change', renderDateList);
  modalClose.addEventListener('click', closeModal);
  modalDelete.addEventListener('click', deleteActiveDate);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
      closeModal();
    }
  });

  renderDateList();
})();
