(() => {
  const KEY='hlonyaneSiteStateV41';
  const correctProperty = property => {
    const p={...property};
    const name=String(p.name||'').toLowerCase();
    const type=String(p.type||'').toLowerCase();
    const address=String(p.address||'').toLowerCase();

    if (name.includes('overnight bachelor') || type.includes('bachelor rooms')) {
      p.rent=750; p.furnished=null; p.pricingMode='nightly'; p.unitLabel='rooms';
      return p;
    }
    if (name.includes('4 bedroom commune') || type.includes('communal rooms')) {
      p.rent=600; p.furnished=null; p.pricingMode='nightly'; p.unitLabel='rooms';
      return p;
    }

    const bedrooms=Number(p.beds)||(/\b2[- ]?bed/i.test(type)?2:/\b1[- ]?bed|bachelor/i.test(type)?1:0);
    if (bedrooms===1 && (address.includes('van reenen') || address.includes('roode'))) {
      p.rent=4500; p.furnished=8000;
    }
    if (bedrooms===2 && (address.includes('van reenen') || address.includes('roode'))) {
      p.rent=6000; p.furnished=9500;
    }
    return p;
  };

  const apply = state => {
    const next={...(state||{})};
    if (Array.isArray(next.properties)) next.properties=next.properties.map(correctProperty);
    next.overnight={...(next.overnight||{}),price:'R 750'};
    return next;
  };

  try {
    const current=JSON.parse(localStorage.getItem(KEY)||'{}');
    const next=apply(current);
    if (JSON.stringify(next)!==JSON.stringify(current)) localStorage.setItem(KEY,JSON.stringify(next));
  } catch (e) {}

  if (window.SITE_OVERRIDES && Array.isArray(window.SITE_OVERRIDES.properties)) {
    window.SITE_OVERRIDES.properties=window.SITE_OVERRIDES.properties.map(correctProperty);
  }
  if (window.SITE_STATE) window.SITE_STATE=apply(window.SITE_STATE);
  window.HLONYANE_APPLY_PRICING_POLICY=apply;
})();
