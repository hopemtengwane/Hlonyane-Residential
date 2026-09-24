# Hlonyane Resend integration

This Edge Function follows the same pattern used for Mabcor: the Resend API key stays in Supabase secrets and is never shipped to the browser.

Function: `hlonyane-handler`

Required Supabase secrets:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Hlonyane Residential <notifications@verified-domain.co.za>
HLONYANE_ADMIN_EMAIL=msindisi.mtengwane@gmail.com
```

POST JSON to the shared function with `site`, `type`, `subject`, `message`, and optional `email`, `name`, `to`, `details`, `attachments`, and `sendConfirmation`. Use `site: "hlonyane"` for this website and preserve `site: "mabcor"` for Mabcor. Attachments use Resend's API shape: `{ filename, content: base64, content_type }`.

Supported notification types are `enquiry`, `portal-message`, `maintenance`, `notice`, and `lease`.

The static preview continues to work without the function. Set `window.HLONYANE_API_URL` to the shared function URL when the existing Supabase project is ready, then route the public enquiry and portal actions through it. This does not require a new Supabase project.
