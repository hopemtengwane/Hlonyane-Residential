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
  'Read By'
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
    if (existing.indexOf(header) === -1) {
      sh.getRange(1, nextCol++).setValue(header);
    }
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
  if (!tenant || String(tenant.Status || 'Active').toLowerCase() !== 'active') {
    return {ok:false, error:'This tenant account is not active.'};
  }
  if (String(tenant['Tenant ID'] || '').trim() !== tenantId) {
    return {ok:false, error:'Tenant session could not be verified. Please sign in again.'};
  }

  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  const now = Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const property = [String(tenant.Property || '').trim(), String(tenant.Unit || '').trim()].filter(Boolean).join(' · ');
  const record = {
    'Message ID': 'MSG-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(),
    'Direction': 'Tenant to Admin',
    'Tenant ID': tenantId,
    'Tenant Name': String(tenant['Full Name'] || tenant.Name || '').trim(),
    'Tenant Email': email,
    'Property': property,
    'Category': category,
    'Subject': subject,
    'Message': message,
    'Status': 'Unread',
    'Created At': now,
    'Read At': '',
    'Read By': ''
  };
  sh.appendRow(headers.map(function(header) { return record[header] == null ? '' : record[header]; }));
  return {ok:true, messageId:record['Message ID'], createdAt:now};
}

function listPortalMessages_() {
  return messageRows_()
    .filter(function(row) { return String(row.Direction || '') === 'Tenant to Admin'; })
    .sort(function(a, b) { return String(b['Created At'] || '').localeCompare(String(a['Created At'] || '')); })
    .map(function(row) {
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
        readBy:String(row['Read By'] || '')
      };
    });
}

function markPortalMessageRead_(messageId, adminEmail) {
  const id = String(messageId || '').trim();
  if (!id) throw new Error('Message ID required');
  const sh = ensureMessageSheet_();
  const headers = headers_(sh);
  const rows = messageRows_();
  const row = rows.find(function(item) { return String(item['Message ID'] || '') === id; });
  if (!row) return {ok:true, updated:false};

  const statusCol = headers.indexOf('Status') + 1;
  const readAtCol = headers.indexOf('Read At') + 1;
  const readByCol = headers.indexOf('Read By') + 1;
  const now = Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX");
  if (statusCol > 0) sh.getRange(row._row, statusCol).setValue('Read');
  if (readAtCol > 0) sh.getRange(row._row, readAtCol).setValue(now);
  if (readByCol > 0) sh.getRange(row._row, readByCol).setValue(adminEmail || 'Admin');
  return {ok:true, updated:true, messageId:id, readAt:now};
}
