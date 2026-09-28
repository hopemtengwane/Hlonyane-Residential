const CONFIG = {
  spreadsheetId: '1fYfXR67OjWrvXJIx0Cgudrb_n51_IVK6bfn-Lts-kJI',
  supabaseUrl: 'https://aovespfbrgctyxhxssji.supabase.co',
  supabasePublishableKey: 'sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a',
  allowedAdmins: ['msindisi.mtengwane@gmail.com','nomondehlonyane@gmail.com']
};

function doGet() {
  return json_({ok:true, service:'Hlonyane Tenant Data API', version:'1.0'});
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    if (!action) throw new Error('Missing action');
    if (action.startsWith('admin.')) {
      const admin = requireAdmin_(body.accessToken);
      if (action === 'admin.syncTenants') return json_(syncTenants_(body.tenants || [], admin.email));
      if (action === 'admin.listTenants') return json_({ok:true, tenants:listTenants_()});
      if (action === 'admin.deleteTenant') return json_(deleteTenant_(body.email || body.tenantId, admin.email));
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

function listTenants_() {
  const sh = sheet_('Tenants');
  const headers = headers_(sh);
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues();
  return rows.filter(r => r.some(Boolean)).map(r => {
    const obj = {};
    headers.forEach((h,i)=>obj[h]=r[i]);
    return obj;
  });
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
  const sh = sheet_('Tenants');
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
      'Email': email,
      'Mobile': String(t.mobile || '').trim(),
      'Emergency Contact': String(t.emergency || old['Emergency Contact'] || '').trim(),
      'Property': p.address,
      'Unit': p.unit,
      'Bedroom Type': p.bedroomType,
      'Furnishing': String(t.furnishing || 'Unfurnished'),
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
  }
  return {ok:true, count:clean.length, syncedAt:new Date().toISOString()};
}

function deleteTenant_(identity, adminEmail) {
  const key = String(identity || '').trim().toLowerCase();
  if (!key) throw new Error('Tenant email or ID required');
  const sh = sheet_('Tenants');
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
