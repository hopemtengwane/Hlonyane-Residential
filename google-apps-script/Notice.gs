function saveTenantNotice_(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const tenantId = String(body.tenantId || '').trim();
  const startsOn = String(body.startsOn || '').trim();
  if (!email || !tenantId) return {ok:false, error:'Tenant session details are missing.'};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return {ok:false, error:'Choose a valid notice commencement date.'};

  const sh = ensureTenantPasswordColumn_();
  let headers = headers_(sh);
  const required = ['Notice Status','Notice Start','Updated At','Updated By'];
  required.forEach(name => {
    if (!headers.includes(name)) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(name);
      headers = headers_(sh);
    }
  });

  if (sh.getLastRow() < 2) return {ok:false, error:'Tenant account not found.'};
  const emailCol = headers.indexOf('Email');
  const idCol = headers.indexOf('Tenant ID');
  const statusCol = headers.indexOf('Status');
  const noticeStatusCol = headers.indexOf('Notice Status');
  const noticeStartCol = headers.indexOf('Notice Start');
  const updatedAtCol = headers.indexOf('Updated At');
  const updatedByCol = headers.indexOf('Updated By');
  const rows = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues();

  for (let i=0;i<rows.length;i++) {
    const rowEmail = emailCol >= 0 ? String(rows[i][emailCol]).trim().toLowerCase() : '';
    const rowId = idCol >= 0 ? String(rows[i][idCol]).trim() : '';
    if (rowEmail !== email || rowId !== tenantId) continue;
    if (statusCol >= 0 && String(rows[i][statusCol] || 'Active').trim().toLowerCase() !== 'active') {
      return {ok:false, error:'This tenant account is not active.'};
    }
    const sheetRow = i + 2;
    sh.getRange(sheetRow, noticeStatusCol + 1).setValue('Pending landlord acknowledgement');
    sh.getRange(sheetRow, noticeStartCol + 1).setValue(startsOn);
    if (updatedAtCol >= 0) sh.getRange(sheetRow, updatedAtCol + 1).setValue(Utilities.formatDate(new Date(), 'Africa/Johannesburg', "yyyy-MM-dd'T'HH:mm:ssXXX"));
    if (updatedByCol >= 0) sh.getRange(sheetRow, updatedByCol + 1).setValue('Tenant Portal');
    return {ok:true, startsOn:startsOn, status:'Pending landlord acknowledgement'};
  }
  return {ok:false, error:'Tenant account could not be matched.'};
}
