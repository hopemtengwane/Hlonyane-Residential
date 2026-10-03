(() => {
  const KEY='hlonyaneSiteStateV41';
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const CONFIG_WRITE_URL='https://aovespfbrgctyxhxssji.supabase.co/functions/v1/hlonyane-admin-media';
  const CONFIG_READ_URL='https://raw.githubusercontent.com/hopemtengwane/Hlonyane-Residential/main/site-config.json';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let timer=null;

  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const isDataUrl=value=>typeof value==='string'&&/^data:/i.test(value);
  const cleanPhoto=photo=>{
    if(typeof photo==='string')return isDataUrl(photo)?null:photo;
    if(!photo||typeof photo!=='object'||!photo.image||isDataUrl(photo.image))return null;
    return {...photo};
  };
  const cleanPhotoList=list=>(Array.isArray(list)?list:[]).map(cleanPhoto).filter(Boolean);
  const cleanPropertyPhotos=value=>Object.fromEntries(Object.entries(value||{}).map(([key,list])=>[key,cleanPhotoList(list)]).filter(([,list])=>list.length));
  const cleanParallax=parallax=>Object.fromEntries(Object.entries(parallax||{}).filter(([,v])=>v&&!isDataUrl(v)));
  const cleanCommunityPosts=list=>(Array.isArray(list)?list:[]).map(post=>({
    id:String(post?.id||''),
    name:String(post?.name||'Tenant'),
    relationship:String(post?.relationship||'Current tenant'),
    text:String(post?.text||post?.quote||''),
    date:String(post?.date||''),
    approvedAt:String(post?.approvedAt||'')
  })).filter(post=>post.text);

  const sanitise=state=>{
    const safe={
      heroPhotos:cleanPhotoList(state?.heroPhotos),
      heroText:state?.heroText||null,
      propertyPhotos:cleanPropertyPhotos(state?.propertyPhotos),
      properties:Array.isArray(state?.properties)?state.properties:null,
      overnight:state?.overnight?{...state.overnight,image:isDataUrl(state.overnight.image)?undefined:state.overnight.image}:null,
      parallax:cleanParallax(state?.parallax),
      deletedComments:Array.isArray(state?.deletedComments)?state.deletedComments:[],
      communityPosts:cleanCommunityPosts(state?.communityPosts),
      contacts:state?.contacts||null,
      _meta:{updatedAt:Date.now()}
    };
    if(safe.overnight&&safe.overnight.image===undefined)delete safe.overnight.image;
    if(!safe.heroPhotos.length)delete safe.heroPhotos;
    if(!Object.keys(safe.propertyPhotos).length)delete safe.propertyPhotos;
    return safe;
  };

  async function token(){
    if(!client)throw new Error('Supabase admin session unavailable.');
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');
    return session.access_token;
  }

  async function publicConfig(){
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),1800);
      const response=await fetch(CONFIG_READ_URL+'?v='+Date.now(),{cache:'no-store',signal:controller.signal});
      clearTimeout(timeout);
      if(!response.ok)return null;
      const config=await response.json();
      return config&&typeof config==='object'?config:null;
    }catch(e){return null}
  }

  async function save({quiet=false}={}){
    try{
      const accessToken=await token();
      let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
      state=window.HLONYANE_APPLY_PRICING_POLICY?window.HLONYANE_APPLY_PRICING_POLICY(state):state;
      const config=sanitise(state);
      const localState={...state,_meta:config._meta};
      localStorage.setItem(KEY,JSON.stringify(localState));
      const response=await fetch(CONFIG_WRITE_URL,{
        method:'POST',
        headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'saveSiteConfig',site:'hlonyane',config})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result?.ok)throw new Error(result?.error||`Central save failed (${response.status}).`);
      if(!quiet)toast('Website settings saved centrally.');
      return result;
    }catch(error){
      console.error('Site config sync:',error);
      if(!quiet)toast(error?.message||'Unable to save website settings.');
      throw error;
    }
  }

  async function bootstrap(){
    let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
    const remote=await publicConfig();
    if(!remote||!Object.keys(remote).length)return {source:'browser',config:local};

    const localStamp=Number(local?._meta?.updatedAt||0);
    const remoteStamp=Number(remote?._meta?.updatedAt||0);
    const remoteWins=remoteStamp>localStamp;
    const primary=remoteWins?remote:local;
    const secondary=remoteWins?local:remote;
    const merged={...secondary,...primary};
    merged.propertyPhotos={...(secondary.propertyPhotos||{}),...(primary.propertyPhotos||{})};
    if(primary.heroPhotos?.length)merged.heroPhotos=primary.heroPhotos;
    else if(secondary.heroPhotos?.length)merged.heroPhotos=secondary.heroPhotos;
    merged.parallax={...(secondary.parallax||{}),...(primary.parallax||{})};
    const priced=window.HLONYANE_APPLY_PRICING_POLICY?window.HLONYANE_APPLY_PRICING_POLICY(merged):merged;
    localStorage.setItem(KEY,JSON.stringify(priced));
    return {source:remoteWins?'github':'browser',config:priced};
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(()=>save({quiet:true}).catch(()=>{}),180)}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-save],[data-contact-save],#addProperty,[data-property-remove],[data-comment-remove]'))setTimeout(schedule,80);
  },true);

  window.HLONYANE_ADMIN_SITE_CONFIG={bootstrap,save,schedule,sanitise,publicConfig};
})();
