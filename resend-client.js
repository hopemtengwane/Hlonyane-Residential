/* Production email bridge for Hlonyane Residential.
   The shared Supabase smart-handler expects multipart/form-data. */
(() => {
  const apiUrl = window.HLONYANE_API_URL || localStorage.getItem('hlonyaneApiUrl') || '';
  const supabaseKey = window.HLONYANE_SUPABASE_KEY || 'sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';

  window.hlonyaneNotify = async (payload) => {
    if (!apiUrl) return { ok: false, offline: true };

    const fd = payload instanceof FormData ? payload : new FormData();
    if (!(payload instanceof FormData)) {
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: fd
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok === false) {
      const detail = result?.error || result?.message || `Request failed (${response.status})`;
      throw new Error(detail);
    }
    return result;
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!apiUrl || !(form instanceof HTMLFormElement) || form.id !== 'enquiryForm') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const status = document.querySelector('#formStatus');
    const submit = form.querySelector('button[type="submit"]');
    const original = submit?.innerHTML || '';

    const fd = new FormData(form);
    fd.set('site', 'hlonyane');
    fd.set('type', fd.get('enquiryType') || 'General enquiry');
    fd.set('sendConfirmation', 'true');

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Sending…';
    }
    if (status) status.textContent = 'Sending your enquiry…';

    try {
      const result = await window.hlonyaneNotify(fd);
      if (status) {
        status.textContent = result?.reference
          ? `✓ Enquiry sent · Reference ${result.reference}. We will be in touch.`
          : '✓ Enquiry sent. We will be in touch.';
      }
      form.reset();
    } catch (error) {
      console.error('Hlonyane enquiry submission failed:', error);
      if (status) status.textContent = `Unable to send enquiry: ${error.message}`;
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = original;
      }
    }
  }, true);
})();
