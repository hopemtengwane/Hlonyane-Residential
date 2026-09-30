const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const APPS_SCRIPT_URL = Deno.env.get('HLONYANE_APPS_SCRIPT_URL') ||
  'https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';

const preview = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 240);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'POST required.' }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    const site = String(body?.site || '').trim().toLowerCase();
    const action = String(body?.action || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const code = String(body?.code || '').trim();

    if (site !== 'hlonyane') return json({ ok: false, error: 'Unsupported site.' }, 400);
    if (!['tenant.requestOtp', 'tenant.verifyOtp'].includes(action)) {
      return json({ ok: false, error: 'Unsupported tenant action.' }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return json({ ok: false, error: 'Enter a valid email address.' }, 400);
    }
    if (action === 'tenant.verifyOtp' && !/^\d{6}$/.test(code)) {
      return json({ ok: false, error: 'Enter the 6-digit verification code.' }, 400);
    }

    const query = new URLSearchParams({ action, email });
    if (code) query.set('code', code);
    query.set('_', String(Date.now()));

    let response: Response;
    try {
      response = await fetch(`${APPS_SCRIPT_URL}?${query.toString()}`, {
        method: 'GET',
        redirect: 'follow',
      });
    } catch (error) {
      throw new Error(`Tenant backend network request failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const text = await response.text();
    let result: any = null;
    try { result = JSON.parse(text); } catch (_) {}

    if (!response.ok) {
      throw new Error(`Tenant backend returned HTTP ${response.status}. ${preview(text)}`);
    }
    if (!result || typeof result !== 'object') {
      throw new Error(`Tenant backend returned non-JSON content. ${preview(text)}`);
    }

    return json(result, result.ok === false ? 400 : 200);
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to contact tenant sign-in service.',
    }, 500);
  }
});
