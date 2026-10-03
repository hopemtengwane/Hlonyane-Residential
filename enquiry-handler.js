(() => {
  const ENDPOINT = 'https://aovespfbrgctyxhxssji.supabase.co/functions/v1/Hlonyane-handler';
  const form = document.getElementById('enquiryForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  window.hlonyaneNotify = true;

  const setStatus = (message, kind = '') => {
    if (!status) return;
    status.textContent = message || '';
    status.dataset.state = kind;
  };

  const withTimeout = async (url, options, timeoutMs = 20000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const originalLabel = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    setStatus('Sending your enquiry…', 'sending');

    try {
      const payload = new FormData(form);
      payload.set('site', 'hlonyane');
      payload.set('sendConfirmation', 'true');

      const response = await withTimeout(ENDPOINT, {
        method: 'POST',
        body: payload,
      });

      const text = await response.text();
      let result = null;
      try { result = text ? JSON.parse(text) : {}; } catch (_) {}

      if (!response.ok) {
        const message = result?.error || result?.message || `Enquiry service returned HTTP ${response.status}.`;
        throw new Error(message);
      }
      if (!result || result.ok !== true) {
        throw new Error(result?.error || 'The enquiry service returned an unexpected response.');
      }

      const reference = result.reference ? ` Reference: ${result.reference}` : '';
      setStatus(`Thank you. Your enquiry has been sent.${reference}`, 'success');
      form.reset();

      // Keep date fields valid after reset.
      const today = new Date();
      const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      form.querySelectorAll('input[type="date"]').forEach((input) => { input.min = localToday; });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'The enquiry service took too long to respond. Please try again.'
        : (error?.message || 'Unable to send your enquiry. Please try again.');
      setStatus(message, 'error');
      console.error('[Hlonyane enquiry]', error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel || 'Send enquiry ↗';
      }
    }
  });
})();
