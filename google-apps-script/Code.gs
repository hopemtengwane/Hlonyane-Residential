const CONFIG = {
  spreadsheetId: '1fYfXR67OjWrvXJIx0Cgudrb_n51_IVK6bfn-Lts-kJI',
  supabaseUrl: 'https://aovespfbrgctyxhxssji.supabase.co',
  supabasePublishableKey: 'sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a',
  allowedAdmins: ['msindisi.mtengwane@gmail.com','nomondehlonyane@gmail.com'],
  otpMinutes: 10,
  fromEmail: 'Hlonyane Residential <communication@hlonyaneresidential.co.za>',
  replyTo: 'communication@hlonyaneresidential.co.za'
};

function resendApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY is not configured in Apps Script Project Settings > Script properties.');
  return key;
}

function sendResend_(to, subject, html) {
  const response = UrlFetchApp.fetch('https://api.resend.com/emails', {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + resendApiKey_()},
    payload: JSON.stringify({
      from: CONFIG.fromEmail,
      to: [to],
      subject: subject,
      html: html,
      reply_to: CONFIG.replyTo
    })
  });
  const status = response.getResponseCode();
  const body = response.getContentText() || '{}';
  let result = {};
  try { result = JSON.parse(body); } catch (e) {}
  if (status < 200 || status >= 300) throw new Error(result.message || ('Resend rejected the email (' + status + ').'));
  return result;
}

function testResendMail() {
  const to = Session.getActiveUser().getEmail() || 'omnidatamanager@gmail.com';
  sendResend_(
    to,
    'Hlonyane Residential email test',
    '<div style="font-family:Arial,sans-serif;color:#102b3c"><h2>Hlonyane Residential</h2><p>Resend is connected successfully.</p><p>This email was sent from <strong>communication@hlonyaneresidential.co.za</strong>.</p></div>'
  );
  return 'Resend test sent to ' + to;
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || '');
    let result;
    if (action === 'tenant.requestOtp') result = requestTenantOtp_(p.email || '');
    else if (action === 'tenant.verifyOtp') result = verifyTenantOtp_(p.email || '', p.code || '');
    else if (action === 'site.getConfig') result = getSiteConfig_();
    else if (action === 'admin.listTenants') {
      requireAdmin_(p.accessToken || '');
      result = {ok:true, tenants:listTenants_()};
    }
    else result = {ok:true, service:'Hlonyane Tenant Data API', version:'1.5'};
    return jsonpOrJson_(result, p.callback);
  } catch (err) {
    return jsonpOrJson_({ok:false, error:String(err && err.message || err)}, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    if (!action) throw new Error('Missing action');

    if (action === 'tenant.passwordLogin') {
      return json_(passwordTenantLogin_(body.email || '', body.password || ''));
    }

    if (action.startsWith('admin.')) {
      const admin = requireAdmin_(body.accessToken);
      if (action === 'admin.syncTenants') return json_(syncTenants_(body.tenants || [], admin.email));
      if (action === 'admin.listTenants') return json_({ok:true, tenants:listTenants_()});
      if (action === 'admin.deleteTenant') return json_(deleteTenant_(body.email || body.tenantId, admin.email));
      if (action === 'admin.saveSiteConfig') return json_(saveSiteConfig_(body.config || {}, admin.email));
      throw new Error('Unsupported admin action');
    }
    throw new Error('Unsupported action');
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function requireAdmin_(accessToken) {
  if (!accessToken) throw new Error('Admin session required');
  const res = UrlFetchApp.fetch(CONFIG.supabaseUrl + '/auth/v1/user', {
    method:'get', muteHttpExceptions:true,
    headers:{apikey:CONFIG.supabasePublishableKey, Authorization:'Bearer ' + accessToken}
  });
  if (res.getResponseCode() !== 200) throw new Error('Invalid or expired admin session');
  const user = JSON.parse(res.getContentText() || '{}');
  const email = String(user.email || '').trim().toLowerCase();
  if (!CONFIG.allowedAdmins.includes(email)) throw new Error('Not authorised for Hlonyane Admin');
  return {id:user.id, email};
}

function sheet_(name) {
  const sh = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function headers_(sh) {
  const last = Math.max(1, sh.getLastColumn());
  return sh.getRange(1,1,1,last).getDisplayValues()[0].map(x => String(x).trim());
}

function ensureTenantPasswordColumn_() {
  const sh = sheet_('Tenants');
  const headers = headers_(sh);
  if (!headers.includes('Password')) {
    sh.getRange(1, headers.length + 1).setValue('Password');
  }
  return sh;
}

function listTenants_() {
  const sh = ensureTenantPasswordColumn_();
  const headers = headers_(sh);
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues();
  return rows.filter(r => r.some(Boolean)).map(r => {
    const obj = {};
    headers.forEach((h,i)=>obj[h]=r[i]);
    return obj;
  });
}

function findTenantByEmail_(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;
  return listTenants_().find(t => String(t.Email || '').trim().toLowerCase() === key) || null;
}

function tenantPayload_(tenant, email) {
  const clean = String(email || tenant.Email || '').trim().toLowerCase();
  const name = String(tenant['Full Name'] || tenant.Name || '').trim();
  const property = [String(tenant.Property || '').trim(), String(tenant.Unit || '').trim()].filter(Boolean).join(' · ');
  return {
    tenantId:String(tenant['Tenant ID'] || ''),
    name:name,
    email:clean,
    mobile:String(tenant.Mobile || ''),
    emergency:String(tenant['Emergency Contact'] || ''),
    property:property,
    bedroomType:String(tenant['Bedroom Type'] || ''),
    furnishing:String(tenant.Furnishing || 'Unfurnished'),
    rent:String(tenant['Monthly Rent'] || ''),
    deposit:String(tenant.Deposit || ''),
    leaseStart:String(tenant['Lease Start'] || ''),
    leaseEnd:String(tenant['Lease End'] || ''),
    awayFrom:String(tenant['Away From'] || ''),
    awayTo:String(tenant['Away To'] || ''),
    noticeStatus:String(tenant['Notice Status'] || ''),
    noticeStart:String(tenant['Notice Start'] || ''),
    photo:String(tenant['Profile Photo'] || '')
  };
}

function passwordTenantLogin_(email, password) {
  const clean = String(email || '').trim().toLowerCase();
  const entered = String(password || '');
  if (!/^\S+@\S+\.\S+$/.test(clean)) return {ok:false, error:'Enter a valid email address.'};
  if (!entered) return {ok:false, error:'Enter your tenant portal password.'};

  const tenant = findTenantByEmail_(clean);
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') {
    return {ok:false, error:'This email is not enrolled as an active Hlonyane tenant.'};
  }

  const stored = String(tenant.Password || '');
  if (!stored) return {ok:false, error:'A portal password has not been set for this tenant yet. Please contact the property manager.'};
  if (entered !== stored) return {ok:false, error:'Incorrect password for this tenant account.'};

  return {ok:true, tenant:tenantPayload_(tenant, clean)};
}

function requestTenantOtp_(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(clean)) return {ok:false, error:'Enter a valid email address.'};
  const tenant = findTenantByEmail_(clean);
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') {
    return {ok:false, error:'This email is not enrolled as an active Hlonyane tenant.'};
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('tenant-otp:' + clean, code, CONFIG.otpMinutes * 60);
  sendResend_(
    clean,
    'Your Hlonyane Residential sign-in code',
    '<div style="font-family:Arial,sans-serif;color:#102b3c"><h2>Hlonyane Residential</h2><p>Your tenant portal sign-in code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">' + code + '</p><p>This code expires in ' + CONFIG.otpMinutes + ' minutes.</p><p>If you did not request this code, you can ignore this email.</p><p style="margin-top:28px;color:#65727a;font-size:12px">Hlonyane Residential · communication@hlonyaneresidential.co.za</p></div>'
  );
  return {ok:true, sent:true, expiresMinutes:CONFIG.otpMinutes};
}

function verifyTenantOtp_(email, code) {
  const clean = String(email || '').trim().toLowerCase();
  const entered = String(code || '').trim();
  const cache = CacheService.getScriptCache();
  const expected = cache.get('tenant-otp:' + clean);
  if (!expected || entered !== expected) return {ok:false, error:'The verification code is incorrect or has expired.'};
  const tenant = findTenantByEmail_(clean);
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') return {ok:false, error:'This tenant account is not active.'};
  cache.remove('tenant-otp:' + clean);
  return {ok:true, tenant:tenantPayload_(tenant, clean)};
}

function tenantId_(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
  return 'HLR-' + digest.slice(0,6).map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join('').toUpperCase();
}

function propertyParts_(property) {
  const raw = String(property || '').trim();
  const unitMatch = raw.match(/Unit\s+(\d+)/i);
  const unit = unitMatch ? 'Unit ' + unitMatch[1] : (raw.toLowerCase().includes('4-bedroom') ? '4-bedroom house' : '');
  const address = raw.split('·')[0].trim();
  const n = unitMatch ? Number(unitMatch[1]) : 0;
  let bedroomType = '';
  if (/4 Van Reenen/i.test(address)) bedroomType = n && n <= 7 ? '2-bedroom' : n ? '1-bedroom' : '';
  if (/21 Roode/i.test(address)) bedroomType = /4-bedroom/i.test(raw) ? '4-bedroom commune' : n && n <= 8 ? '1-bedroom' : n ? '2-bedroom' : '';
  return {address, unit, bedroomType};
}

function syncTenants_(tenants, adminEmail) {
  const sh = ensureTenantPasswordColumn_();
  const headers = headers_(sh);
  const now = new Date();
  const existing = listTenants_();
  const existingByEmail = {};
  existing.forEach(t => existingByEmail[String(t.Email || '').toLowerCase()] = t);
  const clean = (tenants || []).map(t => {
    const email = String(t.email || '').trim().toLowerCase();
    if (!email) return null;
    const old = existingByEmail[email] || {};
    const p = propertyParts_(t.property);
    return {
      'Tenant ID': old['Tenant ID'] || tenantId_(email),
      'Status': String(t.status || old.Status || 'Active'),
      'Full Name': String(t.name || '').trim(),
      'Name': String(t.name || '').trim(),
      'Email': email,
      'Mobile': String(t.mobile || '').trim(),
      'Emergency Contact': String(t.emergency || old['Emergency Contact'] || '').trim(),
      'Property': p.address,
      'Unit': p.unit,
      'Bedroom Type': p.bedroomType,
      'Furnishing': String(t.furnishing || 'Unfurnished'),
      'Password': String(t.password || old.Password || '').trim(),
      'Monthly Rent': String(t.rent || old['Monthly Rent'] || ''),
      'Deposit': String(t.deposit || old.Deposit || ''),
      'Lease Start': String(t.leaseStart || old['Lease Start'] || ''),
      'Lease End': String(t.leaseEnd || old['Lease End'] || ''),
      'Home/Away Status': String(t.awayFrom && t.awayTo ? 'Away' : 'Home'),
      'Away From': String(t.awayFrom || ''),
      'Away To': String(t.awayTo || ''),
      'Notice Status': String((t.notice && t.notice.status) || old['Notice Status'] || ''),
      'Notice Start': String((t.notice && t.notice.startsOn) || old['Notice Start'] || ''),
      'Profile Photo': String(t.photo || old['Profile Photo'] || ''),
      'Created At': old['Created At'] || Utilities.formatDate(now, 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      'Updated At': Utilities.formatDate(now, 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      'Updated By': adminEmail
    };
  }).filter(Boolean);

  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,Math.max(headers.length,1)).clearContent();
  if (clean.length) {
    const values = clean.map(obj => headers.map(h => obj[h] == null ? '' : obj[h]));
    sh.getRange(2,1,values.length,headers.length).setValues(values);
    const mobileCol = headers.indexOf('Mobile');
    if (mobileCol >= 0) sh.getRange(2,mobileCol+1,values.length,1).setNumberFormat('@');
  }
  return {ok:true, count:clean.length, syncedAt:new Date().toISOString()};
}

function deleteTenant_(identity, adminEmail) {
  const key = String(identity || '').trim().toLowerCase();
  if (!key) throw new Error('Tenant email or ID required');
  const sh = ensureTenantPasswordColumn_();
  const headers = headers_(sh);
  const emailCol = headers.indexOf('Email');
  const idCol = headers.indexOf('Tenant ID');
  if (sh.getLastRow() < 2) return {ok:true, deleted:false};
  const rows = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues();
  for (let i=rows.length-1;i>=0;i--) {
    const email = emailCol >= 0 ? String(rows[i][emailCol]).toLowerCase() : '';
    const id = idCol >= 0 ? String(rows[i][idCol]).toLowerCase() : '';
    if (email === key || id === key) {
      sh.deleteRow(i+2);
      return {ok:true, deleted:true, by:adminEmail};
    }
  }
  return {ok:true, deleted:false};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonpOrJson_(obj, callback) {
  const cb = String(callback || '').replace(/[^a-zA-Z0-9_$\.]/g,'');
  if (!cb) return json_(obj);
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
