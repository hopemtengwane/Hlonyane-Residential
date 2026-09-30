const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const ALLOWED_ADMINS = new Set([
  'msindisi.mtengwane@gmail.com',
  'nomondehlonyane@gmail.com',
]);

const REPO_OWNER = 'hopemtengwane';
const REPO_NAME = 'Hlonyane-Residential';
const REPO_BRANCH = 'main';
const SITE_CONFIG_PATH = 'site-config.json';
const APPS_SCRIPT_URL = Deno.env.get('HLONYANE_APPS_SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
const ALLOWED_FOLDERS = new Set([
  'property-photos/admin',
  'hero-photos/admin',
  'parallax/admin',
]);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'Hlonyane-Residential-Admin',
});

const cleanFileName = (value: string) => {
  const raw = value.trim().toLowerCase();
  const dot = raw.lastIndexOf('.');
  const ext = dot >= 0 ? raw.slice(dot).replace(/[^.a-z0-9]/g, '') : '';
  const stem = (dot >= 0 ? raw.slice(0, dot) : raw)
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
  return `${stem}${ext}`;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
};

const textToBase64 = (value: string) => bytesToBase64(new TextEncoder().encode(value));

const requireAdmin = async (request: Request) => {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(\S+)/i);
  if (!match) throw new Error('Admin session required.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) throw new Error('Supabase authentication is not configured.');

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: auth },
  });
  if (!response.ok) throw new Error(`Invalid or expired admin session (${response.status}).`);

  const user = await response.json();
  const email = String(user?.email || '').trim().toLowerCase();
  if (!ALLOWED_ADMINS.has(email)) throw new Error('Not authorised for Hlonyane Admin.');
  return { email, id: String(user?.id || ''), accessToken: match[1] };
};

const saveSiteConfig = async (config: unknown, adminEmail: string, githubToken: string) => {
  const configObject = config && typeof config === 'object' ? config : {};
  const serialized = JSON.stringify(configObject, null, 2) + '\n';
  if (serialized.length > 500000) throw new Error('Website configuration is too large.');

  const contentUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SITE_CONFIG_PATH}`;
  let sha: string | undefined;
  const current = await fetch(`${contentUrl}?ref=${encodeURIComponent(REPO_BRANCH)}`, {
    headers: githubHeaders(githubToken),
  });
  if (current.ok) {
    const existing = await current.json();
    sha = existing?.sha || undefined;
  } else if (current.status !== 404) {
    const failure = await current.json().catch(() => ({}));
    throw new Error(failure?.message || `Unable to read existing site configuration (${current.status}).`);
  }

  const response = await fetch(contentUrl, {
    method: 'PUT',
    headers: githubHeaders(githubToken),
    body: JSON.stringify({
      message: `Admin website settings update by ${adminEmail}`,
      content: textToBase64(serialized),
      branch: REPO_BRANCH,
      ...(sha ? { sha } : {}),
      committer: { name: 'Hlonyane Residential Admin', email: 'communication@hlonyaneresidential.co.za' },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || `GitHub config save failed (${response.status}).`);

  return json({
    ok: true,
    path: SITE_CONFIG_PATH,
    commitSha: result?.commit?.sha || null,
    savedBy: adminEmail,
  });
};

const responsePreview = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 220);

const callTenantBackend = async (action: string, payload: Record<string, unknown>, accessToken: string) => {
  let response: Response;
  try {
    response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, accessToken, ...payload }),
      redirect: 'follow',
    });
  } catch (error) {
    throw new Error(`Apps Script network request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const text = await response.text();
  let result: any = null;
  try { result = JSON.parse(text); } catch (_) {}
  if (!response.ok) {
    throw new Error(result?.error || `Apps Script returned HTTP ${response.status} at ${response.url || APPS_SCRIPT_URL}. Response: ${responsePreview(text) || '(empty)'}`);
  }
  if (!result || typeof result !== 'object') {
    throw new Error(`Apps Script returned non-JSON content at ${response.url || APPS_SCRIPT_URL}. Response: ${responsePreview(text) || '(empty)'}`);
  }
  if (result.ok === false) throw new Error(result.error || 'Apps Script rejected the tenant request.');
  return result;
};

const tenantHealth = async () => {
  let response: Response;
  try {
    response = await fetch(`${APPS_SCRIPT_URL}?_=${Date.now()}`, { redirect: 'follow' });
  } catch (error) {
    return {
      ok: false,
      stage: 'edge-to-apps-script',
      error: error instanceof Error ? error.message : String(error),
      appsScriptUrl: APPS_SCRIPT_URL,
    };
  }
  const text = await response.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch (_) {}
  return {
    ok: response.ok && !!parsed?.ok,
    stage: 'edge-to-apps-script',
    httpStatus: response.status,
    finalUrl: response.url,
    appsScriptUrl: APPS_SCRIPT_URL,
    responseType: parsed ? 'json' : 'non-json',
    service: parsed?.service || null,
    version: parsed?.version || null,
    responsePreview: parsed ? null : responsePreview(text),
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);

  try {
    const admin = await requireAdmin(request);
    const githubToken = Deno.env.get('HLONYANE_GITHUB_TOKEN');
    if (!githubToken) return json({ error: 'HLONYANE_GITHUB_TOKEN is not configured.' }, 500);

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (String(body?.site || '').toLowerCase() !== 'hlonyane') return json({ error: 'Unsupported site.' }, 400);

      if (body?.action === 'saveSiteConfig') {
        return await saveSiteConfig(body?.config || {}, admin.email, githubToken);
      }
      if (body?.action === 'tenantHealth') {
        return json(await tenantHealth());
      }
      if (body?.action === 'listTenants') {
        const result = await callTenantBackend('admin.listTenants', {}, admin.accessToken);
        return json(result);
      }
      if (body?.action === 'syncTenants') {
        const tenants = Array.isArray(body?.tenants) ? body.tenants : [];
        const result = await callTenantBackend('admin.syncTenants', { tenants }, admin.accessToken);
        return json(result);
      }
      if (body?.action === 'listPortalMessages') {
        const result = await callTenantBackend('admin.listPortalMessages', {}, admin.accessToken);
        return json(result);
      }
      if (body?.action === 'markPortalMessageRead') {
        const result = await callTenantBackend('admin.markPortalMessageRead', { messageId: String(body?.messageId || '') }, admin.accessToken);
        return json(result);
      }
      return json({ error: 'Unsupported action.' }, 400);
    }

    const form = await request.formData();
    const site = String(form.get('site') || '').trim().toLowerCase();
    if (site !== 'hlonyane') return json({ error: 'Unsupported site.' }, 400);

    const folder = String(form.get('folder') || '').trim().replace(/^\/+|\/+$/g, '');
    if (!ALLOWED_FOLDERS.has(folder)) return json({ error: 'Unsupported upload folder.' }, 400);

    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Image file is required.' }, 400);
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Use a JPG, PNG, WEBP or GIF image.' }, 400);
    if (file.size <= 0 || file.size > MAX_BYTES) return json({ error: 'Image must be smaller than 8 MB.' }, 400);

    const safeName = cleanFileName(file.name || 'image');
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const unique = crypto.randomUUID().slice(0, 8);
    const path = `${folder}/${stamp}-${unique}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const content = bytesToBase64(bytes);

    const githubResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'PUT',
        headers: githubHeaders(githubToken),
        body: JSON.stringify({
          message: `Admin media upload: ${safeName}`,
          content,
          branch: REPO_BRANCH,
          committer: { name: 'Hlonyane Residential Admin', email: 'communication@hlonyaneresidential.co.za' },
        }),
      },
    );

    const result = await githubResponse.json();
    if (!githubResponse.ok) {
      return json({ error: result?.message || `GitHub upload failed (${githubResponse.status}).` }, githubResponse.status);
    }

    return json({
      ok: true,
      path,
      rawUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${path}`,
      htmlUrl: result?.content?.html_url || null,
      commitSha: result?.commit?.sha || null,
      uploadedBy: admin.email,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to complete Admin request.' }, 500);
  }
});
