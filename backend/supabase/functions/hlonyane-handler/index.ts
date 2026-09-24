const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const makeReference = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HLR-${y}${m}${d}-${token}`;
};

const sendResend = async ({ to, subject, html, replyTo }: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('HLONYANE_FROM_EMAIL') || Deno.env.get('RESEND_FROM_EMAIL') || 'Hlonyane Residential <onboarding@resend.dev>';
  if (!apiKey) throw new Error('Resend is not configured: add RESEND_API_KEY.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {})
    }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || 'Resend rejected the email.');
  return result;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'Expected multipart form data.' }, 400);
    }

    const form = await request.formData();
    const site = String(form.get('site') || 'hlonyane').toLowerCase();
    if (site !== 'hlonyane') return json({ error: 'Unsupported site.' }, 400);

    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const type = String(form.get('type') || form.get('enquiryType') || 'General enquiry').trim();
    const property = String(form.get('property') || '').trim();
    const furnishing = String(form.get('furnishing') || '').trim();
    const preferredDate = String(form.get('preferredDate') || '').trim();
    const checkIn = String(form.get('checkIn') || '').trim();
    const checkOut = String(form.get('checkOut') || '').trim();
    const message = String(form.get('message') || '').trim();
    const sendConfirmation = String(form.get('sendConfirmation') || 'true') !== 'false';

    if (!name || !email || !message) {
      return json({ error: 'Name, email and message are required.' }, 400);
    }

    const adminEmail = Deno.env.get('HLONYANE_ADMIN_EMAIL') || 'msindisi.mtengwane@gmail.com';
    const reference = makeReference();

    const detailRows = [
      ['Reference', reference],
      ['Name', name],
      ['Email', email],
      ['Phone', phone],
      ['Enquiry type', type],
      ['Property', property],
      ['Furnishing', furnishing],
      ['Preferred date', preferredDate],
      ['Check-in', checkIn],
      ['Check-out', checkOut],
    ].filter(([, value]) => value)
      .map(([label, value]) => `<tr><td style="padding:7px 12px 7px 0;color:#657366"><strong>${esc(label)}</strong></td><td style="padding:7px 0">${esc(value)}</td></tr>`)
      .join('');

    const adminSubject = `Hlonyane enquiry — ${reference}`;
    const adminHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c2b20">
        <h2 style="margin:0 0 18px;color:#174326">New Hlonyane Residential enquiry</h2>
        <table style="border-collapse:collapse;margin-bottom:22px">${detailRows}</table>
        <div style="padding:18px;background:#f4f7f2;border-left:4px solid #2f7d3b">
          ${esc(message).replace(/\n/g, '<br>')}
        </div>
        <p style="margin-top:22px;color:#657366;font-size:12px">Sent from the Hlonyane Residential website.</p>
      </div>`;

    await sendResend({
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
      replyTo: email
    });

    if (sendConfirmation) {
      const confirmationSubject = `We received your Hlonyane Residential enquiry — ${reference}`;
      const confirmationHtml = `
        <div style="margin:0;background:#f3f2ed;padding:40px 18px;font-family:Arial,sans-serif;color:#202720">
          <div style="max-width:760px;margin:auto;background:#fff;border-radius:22px;overflow:hidden;border-top:9px solid #2f7d3b">
            <div style="padding:46px 58px">
              <h1 style="margin:0 0 28px;font-size:34px;color:#173a24">Thank you for contacting Hlonyane Residential</h1>
              <p style="font-size:20px;margin:0 0 22px">Hi ${esc(name)},</p>
              <p style="font-size:18px;line-height:1.7">Your enquiry has been received successfully by Hlonyane Residential.</p>
              <p style="font-size:18px;line-height:1.7">Your reference is <strong>${reference}</strong>.</p>
              <p style="font-size:18px;line-height:1.7">A member of our team will be in touch.</p>
              <div style="margin-top:30px;padding:18px;background:#f4f7f2;border-left:4px solid #c9a84b">${esc(message).replace(/\n/g, '<br>')}</div>
            </div>
          </div>
        </div>`;

      await sendResend({
        to: email,
        subject: confirmationSubject,
        html: confirmationHtml
      });
    }

    return json({ ok: true, reference });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, 500);
  }
});
