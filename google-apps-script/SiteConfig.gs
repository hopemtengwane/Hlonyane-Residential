const SITE_CONFIG_KEY = 'site.config.v1';

function portalConfigSheet_() {
  return sheet_('Portal Config');
}

function readPortalConfigValue_(key) {
  const sh = portalConfigSheet_();
  if (sh.getLastRow() < 1) return '';
  const rows = sh.getRange(1,1,sh.getLastRow(),Math.max(2,sh.getLastColumn())).getDisplayValues();
  for (let i=0;i<rows.length;i++) {
    if (String(rows[i][0] || '').trim() === key) return String(rows[i][1] || '');
  }
  return '';
}

function writePortalConfigValue_(key, value, adminEmail) {
  const sh = portalConfigSheet_();
  const lastRow = Math.max(1, sh.getLastRow());
  const rows = sh.getRange(1,1,lastRow,Math.max(2,sh.getLastColumn())).getDisplayValues();
  let row = -1;
  for (let i=0;i<rows.length;i++) {
    if (String(rows[i][0] || '').trim() === key) { row=i+1; break; }
  }
  const now = Utilities.formatDate(new Date(),'Africa/Johannesburg',"yyyy-MM-dd'T'HH:mm:ssXXX");
  if (row < 0) row = sh.getLastRow() + 1;
  sh.getRange(row,1).setValue(key);
  sh.getRange(row,2).setValue(value);
  if (sh.getLastColumn() >= 3) sh.getRange(row,3).setValue(now);
  if (sh.getLastColumn() >= 4) sh.getRange(row,4).setValue(adminEmail || '');
}

function normaliseSitePricing_(config) {
  const next = Object.assign({}, config || {});
  if (Array.isArray(next.properties)) {
    next.properties = next.properties.map(function(property) {
      const p = Object.assign({}, property || {});
      const name = String(p.name || '').toLowerCase();
      const type = String(p.type || '').toLowerCase();
      const address = String(p.address || '').toLowerCase();
      if (name.indexOf('overnight bachelor') >= 0 || type.indexOf('bachelor rooms') >= 0) {
        p.rent = 750; p.furnished = null; p.pricingMode = 'nightly'; p.unitLabel = 'rooms';
        return p;
      }
      if (name.indexOf('4 bedroom commune') >= 0 || type.indexOf('communal rooms') >= 0) {
        p.rent = 600; p.furnished = null; p.pricingMode = 'nightly'; p.unitLabel = 'rooms';
        return p;
      }
      let bedrooms = Number(p.beds) || 0;
      if (!bedrooms && /2[- ]?bed/i.test(type)) bedrooms = 2;
      if (!bedrooms && (/1[- ]?bed/i.test(type) || /bachelor/i.test(type))) bedrooms = 1;
      if ((address.indexOf('van reenen') >= 0 || address.indexOf('roode') >= 0) && bedrooms === 1) {
        p.rent = 4500; p.furnished = 8000;
      }
      if ((address.indexOf('van reenen') >= 0 || address.indexOf('roode') >= 0) && bedrooms === 2) {
        p.rent = 6000; p.furnished = 9500;
      }
      return p;
    });
  }
  next.overnight = Object.assign({}, next.overnight || {}, {price:'R 750'});
  return next;
}

function getSiteConfig_() {
  const raw = readPortalConfigValue_(SITE_CONFIG_KEY);
  if (!raw) return {ok:true, config:null};
  try {
    return {ok:true, config:normaliseSitePricing_(JSON.parse(raw))};
  } catch (e) {
    return {ok:false, error:'Stored website configuration is invalid JSON.'};
  }
}

function saveSiteConfig_(config, adminEmail) {
  const clean = normaliseSitePricing_(config || {});
  const raw = JSON.stringify(clean);
  if (raw.length > 48000) throw new Error('Website configuration is too large for one Google Sheets cell. Image uploads must remain URL-based.');
  writePortalConfigValue_(SITE_CONFIG_KEY, raw, adminEmail);
  return {ok:true, saved:true, bytes:raw.length, config:clean};
}
