(() => {
  const KEY='hlonyaneSiteStateV41';
  const REPAIR_FLAG='hlonyaneHeroAppendRepairV1';
  const heroTextDefaults={
    kicker:'Residential spaces, thoughtfully managed',
    title:'A place to live.\nA place to belong.',
    intro:'Flats to call home and accommodation for an overnight stay. Discover Hlonyane Residential in Middelburg, Eastern Cape.'
  };
  const overnightDefaults={price:'R 750',image:'property-photos/1.jpg'};
  let state={};
  try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){state={}}
  if(!state.heroText||typeof state.heroText!=='object')state.heroText={...heroTextDefaults};
  else state.heroText={...heroTextDefaults,...state.heroText};
  if(!state.overnight||typeof state.overnight!=='object')state.overnight={...overnightDefaults};
  else state.overnight={...overnightDefaults,...state.overnight,price:'R 750'};
  if(!state.propertyPhotos||typeof state.propertyPhotos!=='object')state.propertyPhotos={};
  if(!state.parallax||typeof state.parallax!=='object')state.parallax={};
  if(!Array.isArray(state.deletedComments))state.deletedComments=[];

  // One-time repair for the first GitHub-backed hero upload. The buggy uploader
  // started an empty heroPhotos array, so adding one image replaced the existing
  // slideshow. Restore the original repository gallery and keep any Admin uploads.
  try{
    const current=Array.isArray(state.heroPhotos)?state.heroPhotos:[];
    const adminOnly=current.length>0&&current.every(photo=>String(photo?.number||'')==='admin'||String(photo?.image||'').includes('/admin/'));
    const base=Array.isArray(window.PROPERTY_GALLERY)?window.PROPERTY_GALLERY:[];
    if(!localStorage.getItem(REPAIR_FLAG)&&adminOnly&&base.length>1){
      const seen=new Set();
      const merged=[...base,...current].filter(photo=>{
        const key=String(photo?.image||'');
        if(!key||seen.has(key))return false;
        seen.add(key);
        return true;
      }).map(photo=>({...photo}));
      state.heroPhotos=merged;
      localStorage.setItem(REPAIR_FLAG,'1');
      setTimeout(()=>window.HLONYANE_ADMIN_SITE_CONFIG?.save?.({quiet:true}).catch?.(()=>{}),250);
    }
  }catch(e){console.warn('Hero slideshow repair skipped',e)}

  if(window.HLONYANE_APPLY_PRICING_POLICY)state=window.HLONYANE_APPLY_PRICING_POLICY(state);
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
})();
