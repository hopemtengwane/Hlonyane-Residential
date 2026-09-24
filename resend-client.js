/* Hlonyane Residential enquiry bridge using the same Supabase client pattern as Mabcor. */
(() => {
  const supabaseUrl = 'https://aovespfbrgctyxhxssji.supabase.co';
  const publishableKey = 'sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';

  const configured = window.supabase?.createClient && publishableKey;
  const client = configured
    ? window.supabase.createClient(supabaseUrl, publishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

  window.hlonyaneNotify = async (formData) => {
    if (!client) throw new Error('The enquiry service is not available in this browser.');
    const { data, error } = await client.functions.invoke('Hlonyane-handler', { body: formData });
    if (error) {
      let message = error.message || 'Unable to send notification.';
      try {
        const context = error.context;
        if (context && typeof context.json === 'function') {
          const body = await context.json();
          message = body?.error || body?.message || message;
        }
      } catch (_) {}
      throw new Error(message);
    }
    if (!data?.ok) throw new Error(data?.error || 'Unable to send notification.');
    return data;
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'enquiryForm') return;

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
