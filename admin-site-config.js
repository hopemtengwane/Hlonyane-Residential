(() => {
  const KEY='hlonyaneSiteStateV41';
  const API_URL=String(window.HLONYANE_TENANT_DATA_API_URL||'').trim();
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let timer=null;
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)};
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\//i.test(API_URL);
  const isDataUrl=value=>typeof value==='string'&&/^data:/i.test(value);
  const cleanPhoto=photo=>{
    if(typeof photo==='string')return isDataUrl(photo)?null:photo;
    if(!photo||typeof photo!=='object'||!photo.image||isDataUrl(photo.image))return null;
    return {...photo};
  };
  const cleanPhotoList=list=>(Array.isArray(list)?list:[]).map(cleanPhoto).filter(Boolean);
  const cleanPropertyPhotos=value=>Object.fromEntries(Object.entries(value||{}).map(([key,list])=>[key,cleanPhotoList(list)]).filter(([,list])=>list.length));
  const cleanParallax=parallax=>Object.fromEntries(Object.entries(parallax||{}).filter(([,v])=>v&&!isDataUrl(v)));
  const sanitise=state=>{
    const safe={
      heroPhotos:cleanPhotoList(state?.heroPhotos),
      heroText:state?.heroText||null,
      propertyPhotos:cleanPropertyPhotos(state?.propertyPhotos),
      properties:Array.isArray(state?.properties)?state.properties:null,
      overnight:state?.overnight?{...state.overnight,image:isDataUrl(state.overnight.image)?undefined:state.overnight.image}:null,
      parallax:cleanParallax(state?.parallax),
      deletedComments:Array.isArray(state?.deletedComments)?state.deletedComments:[],
      contacts:state?.contacts||null
    };
    if (safe.overnight && safe.overnight.image===undefined) delete safe.overnight.image;
    if (!safe.heroPhotos.length) delete safe.heroPhotos;
    if (!Object.keys(safe.propertyPhotos).length) delete safe.propertyPhotos;
    return safe;
  };
  async function token(){if(!client)throw new Error('Supabase admin session unavailable');const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');return session.access_token}
  function publicConfig(){return new Promise(resolve=>{
    if(!configured())return resolve(null);
    const cb='hlonyaneAdminConfig_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const done=value=>{try{delete window[cb]}catch(e){}script.remove();resolve(value)};
    window[cb]=payload=>done(payload?.ok?payload.config:null);
    script.onerror=()=>done(null);
    script.src=API_URL+'?action=site.getConfig&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.append(script);
    setTimeout(()=>{if(window[cb])done(null)},8000);
  })}
  async function save({quiet=false}={}){
    if(!configured())return;
    try{
      const accessToken=await token();
      let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
      state=window.HLONYANE_APPLY_PRICING_POLICY?window.HLONYANE_APPLY_PRICING_POLICY(state):state;
      localStorage.setItem(KEY,JSON.stringify(state));
      await fetch(API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'admin.saveSiteConfig',accessToken,config:sanitise(state)})});
      if(!quiet)toast('Website settings saved centrally.');
    }catch(error){console.error('Site config sync:',error);if(!quiet)toast(error.message||'Unable to save website settings.')}
  }
  async function bootstrap(){
    let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
    const remote=await publicConfig();
    if(remote&&Object.keys(remote).length){
      // On an Admin browser, preserve the locally edited state if it exists; use the
      // central config as the base so a fresh device still receives all saved settings.
      const merged={...remote,...local};
      merged.propertyPhotos={...(remote.propertyPhotos||{}),...(local.propertyPhotos||{})};
      if(local.heroPhotos?.length)merged.heroPhotos=local.heroPhotos;
      else if(remote.heroPhotos?.length)merged.heroPhotos=remote.heroPhotos;
      merged.parallax={...(remote.parallax||{}),...(local.parallax||{})};
      const priced=window.HLONYANE_APPLY_PRICING_POLICY?window.HLONYANE_APPLY_PRICING_POLICY(merged):merged;
      localStorage.setItem(KEY,JSON.stringify(priced));
      return {source:'sheet+browser',config:priced};
    }
    const priced=window.HLONYANE_APPLY_PRICING_POLICY?window.HLONYANE_APPLY_PRICING_POLICY(local):local;
    localStorage.setItem(KEY,JSON.stringify(priced));
    if(Object.keys(priced).length)await save({quiet:true});
    return {source:'browser',config:priced};
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>save({quiet:true}),500)}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-save],[data-contact-save],#addProperty,[data-property-remove],[data-comment-remove]'))setTimeout(schedule,80);
  },true);
  window.HLONYANE_ADMIN_SITE_CONFIG={bootstrap,save,schedule,sanitise};
})();
