const MESSAGE_HEADERS = [
  'Message ID',
  'Direction',
  'Tenant ID',
  'Tenant Name',
  'Tenant Email',
  'Property',
  'Category',
  'Subject',
  'Message',
  'Status',
  'Created At',
  'Read At',
  'Read By',
  'Sent By'
];

function ensureMessageSheet_() {
  const sh = sheet_('Messages');
  const existing = headers_(sh);
  if (!existing.some(Boolean)) {
    sh.getRange(1, 1, 1, MESSAGE_HEADERS.length).setValues([MESSAGE_HEADERS]);
    return sh;
  }
  let nextCol = existing.length + 1;
  MESSAGE_HEADERS.forEach(function(header) {
    if (existing.indexOf(header) === -1) sh.getRange(1, nextCol++).setValue(header);
  });
  return sh;
}

function messageRows_() {
  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getDisplayValues()
    .filter(function(row) { return row.some(Boolean); })
    .map(function(row, index) {
      const obj = {_row: index + 2};
      headers.forEach(function(header, i) { obj[header] = row[i]; });
      return obj;
    });
}

function messageView_(row) {
  return {
    id:String(row['Message ID'] || ''),
    direction:String(row.Direction || ''),
    tenantId:String(row['Tenant ID'] || ''),
    tenantName:String(row['Tenant Name'] || ''),
    tenantEmail:String(row['Tenant Email'] || ''),
    property:String(row.Property || ''),
    category:String(row.Category || ''),
    subject:String(row.Subject || ''),
    message:String(row.Message || ''),
    status:String(row.Status || 'Unread'),
    createdAt:String(row['Created At'] || ''),
    readAt:String(row['Read At'] || ''),
    readBy:String(row['Read By'] || ''),
    sentBy:String(row['Sent By'] || '')
  };
}

function submitTenantMessage_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const tenantId = String(payload.tenantId || '').trim();
  const category = String(payload.category || 'Maintenance').trim().slice(0, 80) || 'Maintenance';
  const subject = String(payload.subject || '').trim().slice(0, 160);
  const message = String(payload.message || '').trim().slice(0, 4000);
  if (!email || !tenantId) return {ok:false, error:'Tenant session details are missing. Please sign in again.'};
  if (!subject) return {ok:false, error:'Add a subject.'};
  if (!message) return {ok:false, error:'Write a message before sending.'};
  const tenant = findTenantByEmail_(email);
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') return {ok:false, error:'This tenant account is not active.'};
  if (String(tenant['Tenant ID'] || '').trim() !== tenantId) return {ok:false, error:'Tenant session could not be verified. Please sign in again.'};

  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  const now = Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const property = [String(tenant.Property || '').trim(), String(tenant.Unit || '').trim()].filter(Boolean).join(' · ');
  const record = {
    'Message ID':'MSG-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(),
    'Direction':'Tenant to Admin',
    'Tenant ID':tenantId,
    'Tenant Name':String(tenant['Full Name'] || tenant.Name || '').trim(),
    'Tenant Email':email,
    'Property':property,
    'Category':category,
    'Subject':subject,
    'Message':message,
    'Status':'Unread',
    'Created At':now,
    'Read At':'',
    'Read By':'',
    'Sent By':email
  };
  sh.appendRow(headers.map(function(header) { return record[header] == null ? '' : record[header]; }));
  return {ok:true, messageId:record['Message ID'], createdAt:now};
}

function listPortalMessages_() {
  return messageRows_()
    .filter(function(row) { return String(row.Direction || '') === 'Tenant to Admin'; })
    .sort(function(a, b) { return String(b['Created At'] || '').localeCompare(String(a['Created At'] || '')); })
    .map(messageView_);
}

function markPortalMessageRead_(messageId, adminEmail) {
  return markMessageRead_(messageId, 'Tenant to Admin', adminEmail || 'Admin');
}

function activeTenants_() {
  return listTenants_().filter(function(t) { return String(t.Status || 'Active').toLowerCase() === 'active' && String(t.Email || '').trim(); });
}

function adminSendPortalMessage_(payload, adminEmail) {
  const recipient = String(payload.recipient || '').trim();
  const category = String(payload.category || 'General').trim().slice(0, 80) || 'General';
  const subject = String(payload.subject || '').trim().slice(0, 160);
  const message = String(payload.message || '').trim().slice(0, 4000);
  if (!recipient) throw new Error('Choose who should receive the message.');
  if (!subject) throw new Error('Add a subject.');
  if (!message) throw new Error('Write a message before sending.');

  const tenants = activeTenants_();
  let recipients = [];
  if (recipient === 'all') recipients = tenants;
  else if (recipient.indexOf('property:') === 0) {
    const property = recipient.slice(9).trim().toLowerCase();
    recipients = tenants.filter(function(t) { return String(t.Property || '').trim().toLowerCase() === property; });
  } else if (recipient.indexOf('person:') === 0) {
    const email = recipient.slice(7).trim().toLowerCase();
    recipients = tenants.filter(function(t) { return String(t.Email || '').trim().toLowerCase() === email; });
  }
  if (!recipients.length) throw new Error('No active tenants match the selected recipient.');

  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  const now = Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const records = recipients.map(function(tenant) {
    const property = [String(tenant.Property || '').trim(), String(tenant.Unit || '').trim()].filter(Boolean).join(' · ');
    return {
      'Message ID':'MSG-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(),
      'Direction':'Admin to Tenant',
      'Tenant ID':String(tenant['Tenant ID'] || ''),
      'Tenant Name':String(tenant['Full Name'] || tenant.Name || '').trim(),
      'Tenant Email':String(tenant.Email || '').trim().toLowerCase(),
      'Property':property,
      'Category':category,
      'Subject':subject,
      'Message':message,
      'Status':'Unread',
      'Created At':now,
      'Read At':'',
      'Read By':'',
      'Sent By':String(adminEmail || 'Admin')
    };
  });
  const values = records.map(function(record) { return headers.map(function(header) { return record[header] == null ? '' : record[header]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return {ok:true, count:records.length, sentAt:now, messageIds:records.map(function(r) { return r['Message ID']; })};
}

function listTenantMessages_(email, tenantId) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanId = String(tenantId || '').trim();
  if (!cleanEmail || !cleanId) return {ok:false, error:'Tenant session details are missing. Please sign in again.'};
  const tenant = findTenantByEmail_(cleanEmail);
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') return {ok:false, error:'This tenant account is not active.'};
  if (String(tenant['Tenant ID'] || '').trim() !== cleanId) return {ok:false, error:'Tenant session could not be verified. Please sign in again.'};

  const messages = messageRows_()
    .filter(function(row) {
      return String(row['Tenant ID'] || '').trim() === cleanId && String(row['Tenant Email'] || '').trim().toLowerCase() === cleanEmail;
    })
    .sort(function(a, b) { return String(b['Created At'] || '').localeCompare(String(a['Created At'] || '')); })
    .map(messageView_);
  return {ok:true, messages:messages};
}

function markTenantMessageRead_(messageId, email, tenantId) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanId = String(tenantId || '').trim();
  if (!cleanEmail || !cleanId) return {ok:false, error:'Tenant session details are missing. Please sign in again.'};
  const tenant = findTenantByEmail_(cleanEmail);
  if (!tenant || String(tenant['Tenant ID'] || '').trim() !== cleanId) return {ok:false, error:'Tenant session could not be verified. Please sign in again.'};
  const row = messageRows_().find(function(item) {
    return String(item['Message ID'] || '') === String(messageId || '') &&
      String(item.Direction || '') === 'Admin to Tenant' &&
      String(item['Tenant ID'] || '').trim() === cleanId &&
      String(item['Tenant Email'] || '').trim().toLowerCase() === cleanEmail;
  });
  if (!row) return {ok:true, updated:false};
  return markMessageRead_(messageId, 'Admin to Tenant', cleanEmail);
}

function markMessageRead_(messageId, direction, reader) {
  const id = String(messageId || '').trim();
  if (!id) throw new Error('Message ID required');
  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  const row = messageRows_().find(function(item) {
    return String(item['Message ID'] || '') === id && (!direction || String(item.Direction || '') === direction);
  });
  if (!row) return {ok:true, updated:false};
  const statusCol = headers.indexOf('Status') + 1;
  const readAtCol = headers.indexOf('Read At') + 1;
  const readByCol = headers.indexOf('Read By') + 1;
  const now = Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX");
  if (statusCol > 0) sh.getRange(row._row, statusCol).setValue('Read');
  if (readAtCol > 0) sh.getRange(row._row, readAtCol).setValue(now);
  if (readByCol > 0) sh.getRange(row._row, readByCol).setValue(reader || 'Reader');
  return {ok:true, updated:true, messageId:id, readAt:now};
}
