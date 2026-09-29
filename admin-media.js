(() => {
  const KEY='hlonyaneSiteStateV41';
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const UPLOAD_URL='https://aovespfbrgctyxhxssji.supabase.co/functions/v1/hlonyane-admin-media';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let busy=false;

  const toast=message=>{
    const el=document.querySelector('#cmsToast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),3000);
  };

  const readState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}};
  const writeState=state=>localStorage.setItem(KEY,JSON.stringify(state));

  async function token(){
    if(!client)throw new Error('Supabase admin session unavailable.');
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');
    return session.access_token;
  }

  async function upload(file,folder){
    const accessToken=await token();
    const form=new FormData();
    form.append('site','hlonyane');
    form.append('folder',folder);
    form.append('file',file,file.name);
    const response=await fetch(UPLOAD_URL,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`},body:form});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result?.ok)throw new Error(result?.error||`Upload failed (${response.status}).`);
    return result;
  }

  async function uploadSequential(files,folder,onUploaded){
    for(const file of files){
      toast(`Uploading ${file.name} to GitHub…`);
      const result=await upload(file,folder);
      onUploaded(result.path,file,result);
    }
  }

  async function persistAndReload(state,message){
    writeState(state);
    try{await window.HLONYANE_ADMIN_SITE_CONFIG?.save?.({quiet:true})}catch(e){console.warn('Central config save after media upload:',e)}
    toast(message||'Image saved to GitHub.');
    setTimeout(()=>location.reload(),700);
  }

  document.addEventListener('change',async event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=='file'||busy)return;

    const isHero=input.id==='heroUpload';
    const isOvernight=input.id==='overnightUpload';
    const isProperty=input.dataset.propertyUpload!==undefined;
    const isParallax=input.dataset.parallaxUpload!==undefined;
    if(!isHero&&!isOvernight&&!isProperty&&!isParallax)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const files=[...input.files||[]];
    if(!files.length)return;
    busy=true;
    input.disabled=true;

    try{
      const state=readState();
      state.propertyPhotos=state.propertyPhotos||{};
      state.heroPhotos=Array.isArray(state.heroPhotos)?state.heroPhotos:[];
      state.parallax=state.parallax||{};
      state.overnight=state.overnight||{};

      if(isHero){
        await uploadSequential(files,'hero-photos/admin',(path,file)=>{
          state.heroPhotos.push({image:path,number:'admin',title:file.name.replace(/\.[^.]+$/,''),caption:file.name,categories:['hero'],orientation:'landscape'});
        });
        await persistAndReload(state,`${files.length} hero image${files.length===1?'':'s'} saved to GitHub.`);
        return;
      }

      if(isProperty){
        const index=String(input.dataset.propertyUpload);
        const list=Array.isArray(state.propertyPhotos[index])?state.propertyPhotos[index]:[];
        await uploadSequential(files,'property-photos/admin',(path,file)=>{
          list.push({image:path,caption:file.name,categories:[],orientation:'landscape'});
        });
        state.propertyPhotos[index]=list;
        await persistAndReload(state,`${files.length} property image${files.length===1?'':'s'} saved to GitHub.`);
        return;
      }

      if(isParallax){
        const file=files[0];
        const result=await upload(file,'parallax/admin');
        state.parallax[String(input.dataset.parallaxUpload)]=result.path;
        await persistAndReload(state,'Parallax image saved to GitHub.');
        return;
      }

      if(isOvernight){
        const file=files[0];
        const result=await upload(file,'property-photos/admin');
        state.overnight.image=result.path;
        await persistAndReload(state,'Overnight image saved to GitHub.');
      }
    }catch(error){
      console.error('Hlonyane media upload:',error);
      toast(error?.message||'Unable to upload image to GitHub.');
      busy=false;
      input.disabled=false;
      input.value='';
    }
  },true);

  window.HLONYANE_MEDIA={upload};
})();
