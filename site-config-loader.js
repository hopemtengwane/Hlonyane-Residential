(() => {
  const KEY='hlonyaneSiteStateV41';
  const mergeObjects=(local,remote)=>{
    const merged={...(local||{}),...(remote||{})};
    if (local?.propertyPhotos && !remote?.propertyPhotos) merged.propertyPhotos=local.propertyPhotos;
    if (local?.heroPhotos && !remote?.heroPhotos) merged.heroPhotos=local.heroPhotos;
    if (local?.parallax || remote?.parallax) merged.parallax={...(local?.parallax||{}),...(remote?.parallax||{})};
    return merged;
  };
  window.hlonyaneSiteConfigLoaded = payload => {
    if (!payload?.ok || !payload.config) return;
    try {
      const local=JSON.parse(localStorage.getItem(KEY)||'{}');
      const merged=mergeObjects(local,payload.config);
      localStorage.setItem(KEY,JSON.stringify(merged));
      window.HLONYANE_REMOTE_SITE_CONFIG=payload.config;
    } catch (e) { console.warn('Unable to apply central Hlonyane site configuration',e); }
  };
})();
