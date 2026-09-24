const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Attachment = { filename: string; content: string; content_type?: string };

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const sendResend = async ({ to, subject, html, replyTo, attachments }: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
}) => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  if (!apiKey || !from) throw new Error('Resend is not configured: add RESEND_API_KEY and RESEND_FROM_EMAIL.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}), ...(attachments?.length ? { attachments } : {}) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || 'Resend rejected the email.');
  return result;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const payload = await request.json();
    const type = String(payload.type || 'enquiry');
    const adminEmail = Deno.env.get('HLONYANE_ADMIN_EMAIL') || 'msindisi.mtengwane@gmail.com';
    const sender = String(payload.email || payload.replyTo || '').trim();
    const name = String(payload.name || 'Tenant').trim();
    const subject = String(payload.subject || `${type[0].toUpperCase()}${type.slice(1)} · Hlonyane Residential`).trim();
    const message = String(typeof payload.message === 'object' ? (payload.message?.body || '') : (payload.message || '')).trim();
    if (!message) return json({ error: 'Message is required.' }, 400);
    const attachments = Array.isArray(payload.attachments) ? payload.attachments.filter((item: Attachment) => item?.filename && item?.content) : [];
    const details = Object.entries(payload.details || {}).map(([key, value]) => `<p><strong>${esc(key)}:</strong> ${esc(value)}</p>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${esc(subject)}</h2><p>${esc(message).replace(/\n/g, '<br>')}</p>${details}<hr><p style="color:#657366;font-size:12px">Sent from Hlonyane Residential.</p></div>`;
    const result = await sendResend({ to: payload.to || adminEmail, subject, html, replyTo: sender || undefined, attachments });
    if (sender && payload.sendConfirmation !== false) {
      await sendResend({ to: sender, subject: 'We received your message · Hlonyane Residential', html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Thank you, ${esc(name)}</h2><p>We received your message and a member of the Hlonyane Residential team will be in touch.</p><p>${esc(message).replace(/\n/g, '<br>')}</p></div>` });
    }
    return json({ ok: true, id: result?.id || null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, 500);
  }
});
