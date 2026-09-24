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

type ResendAttachment = {
  path?: string;
  filename: string;
  content_id?: string;
  content_type?: string;
};

const sendResend = async ({ to, subject, html, replyTo, attachments }: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: ResendAttachment[];
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
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments?.length ? { attachments } : {})
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
    const adminLogoAttachment: ResendAttachment = {
      path: 'https://raw.githubusercontent.com/hopemtengwane/Hlonyane-Residential/main/logo.png',
      filename: 'hlonyane-residential-logo-admin.png',
      content_id: 'hlonyane-logo-admin',
      content_type: 'image/png'
    };
    const confirmationLogoAttachment: ResendAttachment = {
      path: 'https://raw.githubusercontent.com/hopemtengwane/Hlonyane-Residential/main/logo.png',
      filename: 'hlonyane-residential-logo-confirmation.png',
      content_id: 'hlonyane-logo-confirmation',
      content_type: 'image/png'
    };

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
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f2ed" style="width:100%;background:#f3f2ed;margin:0;padding:0">
        <tr><td align="center" style="padding:32px 16px">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:18px;overflow:hidden">
            <tr><td height="8" bgcolor="#2f7d3b" style="height:8px;background:#2f7d3b;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="padding:34px 40px 18px">
              <h2 style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:26px;line-height:1.25;color:#174326">New Hlonyane Residential enquiry</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#000000" style="width:100%;background:#000000;border-collapse:collapse;margin:0 0 26px">
                <tr><td align="left" style="padding:18px 20px;background:#000000">
                  <img src="cid:hlonyane-logo-admin" alt="Hlonyane Residential" width="300" style="display:block;width:300px;max-width:100%;height:auto;border:0">
                </td></tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:15px;color:#253128">${detailRows}</table>
              <div style="margin-top:24px;padding:18px 20px;background:#f4f7f2;border-left:4px solid #2f7d3b;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#253128">
                ${esc(message).replace(/\n/g, '<br>')}
              </div>
              <p style="margin:22px 0 0;font-family:Arial,sans-serif;color:#657366;font-size:12px;line-height:1.5">Sent from the Hlonyane Residential website.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>`;

    await sendResend({
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
      replyTo: email,
      attachments: [adminLogoAttachment]
    });

    if (sendConfirmation) {
      const confirmationSubject = `We received your Hlonyane Residential enquiry — ${reference}`;
      const confirmationHtml = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f2ed" style="width:100%;background:#f3f2ed;margin:0;padding:0">
          <tr><td align="center" style="padding:36px 14px">
            <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:20px;overflow:hidden;border:1px solid #e1e4de">
              <tr><td height="9" bgcolor="#2f7d3b" style="height:9px;background:#2f7d3b;font-size:0;line-height:0">&nbsp;</td></tr>
              <tr><td style="padding:38px 40px 18px">
                <h1 style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:31px;line-height:1.25;color:#173a24;font-weight:700">Thank you for contacting Hlonyane Residential</h1>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#000000" style="width:100%;background:#000000;border-collapse:collapse;margin:0 0 30px">
                  <tr><td align="left" style="padding:18px 20px;background:#000000">
                    <img src="cid:hlonyane-logo-confirmation" alt="Hlonyane Residential" width="320" style="display:block;width:320px;max-width:100%;height:auto;border:0">
                  </td></tr>
                </table>
                <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:18px;line-height:1.6;color:#252b26">Hi ${esc(name)},</p>
                <p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:17px;line-height:1.65;color:#252b26">Your enquiry has been received successfully by Hlonyane Residential.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f1ea" style="width:100%;background:#f4f1ea;border-collapse:separate;border-spacing:0;border-radius:10px;margin:0 0 24px">
                  <tr><td style="padding:18px 20px;font-family:Arial,sans-serif">
                    <div style="font-size:12px;line-height:1.3;font-weight:700;letter-spacing:1.4px;color:#a47d1e;text-transform:uppercase;margin-bottom:8px">YOUR REFERENCE</div>
                    <div style="font-size:22px;line-height:1.35;font-weight:700;color:#202720">${reference}</div>
                  </td></tr>
                </table>

                <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:17px;line-height:1.65;color:#252b26">A member of the Hlonyane Residential team will be in touch.</p>
                <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#657366">Please keep the reference number above should you need to follow up on your enquiry.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f7f2" style="width:100%;background:#f4f7f2;border-collapse:separate;border-spacing:0;margin:0 0 28px;border-left:4px solid #c9a84b">
                  <tr><td style="padding:16px 18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#253128">${esc(message).replace(/\n/g, '<br>')}</td></tr>
                </table>

                <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#252b26">Regards,<br><strong>Hlonyane Residential Team</strong></p>
              </td></tr>
              <tr><td bgcolor="#f7f8f5" style="padding:18px 40px;background:#f7f8f5;border-top:1px solid #e3e6df;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a817b">Hlonyane Residential · Middelburg, Eastern Cape</td></tr>
            </table>
          </td></tr>
        </table>`;

      await sendResend({
        to: email,
        subject: confirmationSubject,
        html: confirmationHtml,
        attachments: [confirmationLogoAttachment]
      });
    }

    return json({ ok: true, reference });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, 500);
  }
});
