const LEASE_HEADERS = [
  'Document ID','Document Type','Tenant ID','Tenant Name','Tenant Email','Property','Status','Form JSON',
  'Tenant Signature','Tenant Signed At','Landlord Signature','Landlord Signed At','Landlord Signed By','Updated At'
];

function ensureLeaseSheet_() {
  const sh = sheet_('Documents');
  const existing = headers_(sh);
  if (!existing.some(Boolean)) {
    sh.getRange(1,1,1,LEASE_HEADERS.length).setValues([LEASE_HEADERS]);
    return sh;
  }
  let col = existing.length + 1;
  LEASE_HEADERS.forEach(function(header) {
    if (existing.indexOf(header) === -1) sh.getRange(1,col++).setValue(header);
  });
  return sh;
}

function leaseRows_() {
  const sh = ensureLeaseSheet_();
  const headers = headers_(sh);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues()
    .filter(function(row){ return row.some(Boolean); })
    .map(function(row,index){ const obj={_row:index+2}; headers.forEach(function(h,i){obj[h]=row[i];}); return obj; })
    .filter(function(row){ return String(row['Document Type']||'') === 'Lease'; });
}

function leaseForTenantId_(tenantId) {
  const id = String(tenantId||'').trim();
  if (!id) return null;
  return leaseRows_().find(function(row){ return String(row['Tenant ID']||'').trim() === id; }) || null;
}

function leaseTenant_(email, tenantId) {
  const clean = String(email||'').trim().toLowerCase();
  const id = String(tenantId||'').trim();
  const tenant = findTenantByEmail_(clean);
  if (!tenant || String(tenant.Status||'Active').toLowerCase() !== 'active') throw new Error('This tenant account is not active.');
  if (String(tenant['Tenant ID']||'').trim() !== id) throw new Error('Tenant session could not be verified. Please sign in again.');
  return tenant;
}

function parseLeaseForm_(row) {
  if (!row) return {};
  try { return JSON.parse(String(row['Form JSON']||'{}')) || {}; } catch (e) { return {}; }
}

function leasePayload_(row, tenant) {
  const t = tenant || (row ? findTenantByEmail_(row['Tenant Email']||'') : null) || {};
  const tenantId = String((row && row['Tenant ID']) || t['Tenant ID'] || '');
  const property = [String(t.Property||'').trim(),String(t.Unit||'').trim()].filter(Boolean).join(' · ');
  return {
    documentId:String(row && row['Document ID'] || ''),
    tenantId:tenantId,
    tenantName:String(row && row['Tenant Name'] || t['Full Name'] || t.Name || ''),
    tenantEmail:String(row && row['Tenant Email'] || t.Email || '').toLowerCase(),
    property:String(row && row.Property || property),
    status:String(row && row.Status || 'Not started'),
    form:parseLeaseForm_(row),
    tenantSignature:String(row && row['Tenant Signature'] || ''),
    tenantSignedAt:String(row && row['Tenant Signed At'] || ''),
    landlordSignature:String(row && row['Landlord Signature'] || ''),
    landlordSignedAt:String(row && row['Landlord Signed At'] || ''),
    landlordSignedBy:String(row && row['Landlord Signed By'] || ''),
    updatedAt:String(row && row['Updated At'] || ''),
    defaults:{
      tenantName:String(t['Full Name']||t.Name||''), tenantEmail:String(t.Email||''), tenantMobile:String(t.Mobile||''),
      propertyAddress:property, rent:String(t['Monthly Rent']||''), deposit:String(t.Deposit||''),
      startDate:String(t['Lease Start']||''), endDate:String(t['Lease End']||'')
    }
  };
}

function writeLease_(tenant, payload, status, tenantSignature, landlordSignature, landlordEmail) {
  const sh = ensureLeaseSheet_();
  const headers = headers_(sh);
  const tenantId = String(tenant['Tenant ID']||'').trim();
  const current = leaseForTenantId_(tenantId);
  const now = Utilities.formatDate(new Date(),'Africa/Johannesburg',"yyyy-MM-dd'T'HH:mm:ssXXX");
  const property = [String(tenant.Property||'').trim(),String(tenant.Unit||'').trim()].filter(Boolean).join(' · ');
  const existingForm = parseLeaseForm_(current);
  const incomingForm = payload && payload.form && typeof payload.form === 'object' ? payload.form : {};
  const form = Object.assign({}, existingForm, incomingForm);
  const record = {
    'Document ID':String(current && current['Document ID'] || ('LEASE-' + Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase())),
    'Document Type':'Lease','Tenant ID':tenantId,
    'Tenant Name':String(tenant['Full Name']||tenant.Name||''),'Tenant Email':String(tenant.Email||'').toLowerCase(),
    'Property':property,'Status':status,'Form JSON':JSON.stringify(form),
    'Tenant Signature':tenantSignature != null ? String(tenantSignature) : String(current && current['Tenant Signature'] || ''),
    'Tenant Signed At':status === 'Tenant signed' && !(current && current['Tenant Signed At']) ? now : String(current && current['Tenant Signed At'] || ''),
    'Landlord Signature':landlordSignature != null ? String(landlordSignature) : String(current && current['Landlord Signature'] || ''),
    'Landlord Signed At':status === 'Fully signed' ? now : String(current && current['Landlord Signed At'] || ''),
    'Landlord Signed By':status === 'Fully signed' ? String(landlordEmail||'') : String(current && current['Landlord Signed By'] || ''),
    'Updated At':now
  };
  const values = headers.map(function(h){ return record[h] == null ? '' : record[h]; });
  if (current) sh.getRange(current._row,1,1,headers.length).setValues([values]);
  else sh.appendRow(values);
  return leasePayload_(Object.assign({_row: current ? current._row : sh.getLastRow()},record), tenant);
}

function getTenantLease_(email, tenantId) {
  const tenant = leaseTenant_(email,tenantId);
  return {ok:true, lease:leasePayload_(leaseForTenantId_(tenantId), tenant)};
}

function saveTenantLeaseDraft_(payload) {
  const tenant = leaseTenant_(payload.email,payload.tenantId);
  const current = leaseForTenantId_(payload.tenantId);
  const currentStatus = String(current && current.Status || 'Not started');
  if (currentStatus === 'Tenant signed' || currentStatus === 'Fully signed') throw new Error('This lease has already been signed by the tenant and can no longer be edited.');
  return {ok:true, lease:writeLease_(tenant,payload,'Draft',null,null,'')};
}

function submitTenantLease_(payload) {
  const tenant = leaseTenant_(payload.email,payload.tenantId);
  const current = leaseForTenantId_(payload.tenantId);
  if (String(current && current.Status || '') === 'Fully signed') throw new Error('This lease is already fully signed.');
  const form = payload.form || {};
  const signature = String(payload.tenantSignature||'');
  if (!form.termsAccepted) throw new Error('The lease terms must be accepted before signing.');
  if (!signature && !String(form.typedSignature||'').trim()) throw new Error('Add the tenant signature before submitting.');
  return {ok:true, lease:writeLease_(tenant,payload,'Tenant signed',signature,null,'')};
}

function listLeaseStatuses_() {
  const rows = leaseRows_();
  const byId = {}; rows.forEach(function(r){byId[String(r['Tenant ID']||'')] = r;});
  return listTenants_().filter(function(t){return String(t.Status||'Active').toLowerCase()==='active';}).map(function(t){
    const id=String(t['Tenant ID']||''); const row=byId[id];
    return {tenantId:id,tenantName:String(t['Full Name']||t.Name||''),tenantEmail:String(t.Email||'').toLowerCase(),property:[String(t.Property||''),String(t.Unit||'')].filter(Boolean).join(' · '),status:String(row&&row.Status||'Not started'),updatedAt:String(row&&row['Updated At']||'')};
  });
}

function getAdminLease_(tenantId) {
  const id=String(tenantId||'').trim();
  const tenant=listTenants_().find(function(t){return String(t['Tenant ID']||'').trim()===id;});
  if(!tenant) throw new Error('Tenant not found.');
  return {ok:true, lease:leasePayload_(leaseForTenantId_(id),tenant)};
}

function signLeaseAsLandlord_(payload, adminEmail) {
  const id=String(payload.tenantId||'').trim();
  const tenant=listTenants_().find(function(t){return String(t['Tenant ID']||'').trim()===id;});
  if(!tenant) throw new Error('Tenant not found.');
  const current=leaseForTenantId_(id);
  if(!current || String(current.Status||'')!=='Tenant signed') throw new Error('The tenant must sign the lease before the landlord can sign it.');
  const signature=String(payload.landlordSignature||'');
  const form=payload.form||{};
  if(!signature && !String(form.landlordSignature||'').trim()) throw new Error('Add the landlord signature before completing the lease.');
  return {ok:true, lease:writeLease_(tenant,payload,'Fully signed',null,signature,adminEmail)};
}
