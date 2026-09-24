/* Optional production email bridge. Leave HLONYANE_API_URL empty for the local preview. */
(() => {
  const apiUrl = window.HLONYANE_API_URL || localStorage.getItem('hlonyaneApiUrl') || '';
  window.hlonyaneNotify = async (payload) => {
    if (!apiUrl) return { ok: false, offline: true };
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to send notification.');
    return result;
  };
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!apiUrl || !(form instanceof HTMLFormElement) || form.id !== 'enquiryForm') return;
    event.preventDefault(); event.stopImmediatePropagation();
    const status = document.querySelector('#formStatus');
    const values = Object.fromEntries(new FormData(form).entries());
    if (status) status.textContent = 'Sending your enquiry…';
    try {
      await window.hlonyaneNotify({ type: 'enquiry', name: values.name, email: values.email, message: values.message, details: values, sendConfirmation: true });
      if (status) status.textContent = '✓ Enquiry sent. We will be in touch.';
      form.reset();
    } catch (error) { if (status) status.textContent = `Unable to send enquiry: ${error.message}`; }
  }, true);
})();
