(function () {
  const form = document.getElementById('checkout-form');
  const messageEl = document.getElementById('checkout-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const entry = {
      internName: form.internName.value.trim(),
      done: form.done.value.trim(),
      blocked: form.blocked.value.trim(),
      notes: form.notes.value.trim(),
    };

    try {
      await saveCheckOut(entry);
    } catch {
      messageEl.textContent = 'Could not save check-out. Is the server running?';
      messageEl.classList.remove('hidden');
      return;
    }

    messageEl.textContent = `Check-out saved for ${formatDisplayDate(getTodayDateKey())} at ${formatTimestamp(new Date().toISOString())}.`;
    messageEl.classList.remove('hidden');
    form.reset();
  });
})();
