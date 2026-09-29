(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const API_URL=String(window.HLONYANE_TENANT_DATA_API_URL||'').trim();
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  const TENANT_KEY='hlonyaneTenantRegisterV1';
  let timer=null;
  let syncing=false;
  let pending=false;
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\//i.test(API_URL);
  const isDemoTenant=t=>{
    const email=String(t?.email||'').trim().toLowerCase();
    const mobile=String(t?.mobile||'').trim();
    const property=String(t?.property||'').trim();
    const password=String(t?.password||'').trim();
    if(email==='thabiso@example.com'||email==='roode.tenant@example.com')return true;
    if(email==='msindisi.mtengwane@gmail.com'&&(password==='13592468'||mobile==='+27 72 000 0000'||(/Unit 7/i.test(property)&&String(t?.furnishing||'')==='Furnished')))return true;
    return false;
  };
  function cleanStoredRegister(){
    try{
      const list=JSON.parse(localStorage.getItem(TENANT_KEY)||'[]');
      if(!Array.isArray(list))return;
      const cleaned=list.filter(t=>!isDemoTenant(t)).map(t=>{const copy={...t};delete copy.password;return copy});
      if(JSON.stringify(cleaned)!==JSON.stringify(list))localStorage.setItem(TENANT_KEY,JSON.stringify(cleaned));
    }catch(e){}
  }
  function removeDemoRows(){
    document.querySelectorAll('#tenantRegister .tenant-row').forEach(row=>{
      const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';
      if(isDemoTenant({email:value('email'),mobile:value('mobile'),property:value('property'),furnishing:value('furnishing'),password:value('password')}))row.remove();
    });
    document.querySelectorAll('.tenant-sheet-status').forEach(el=>el.remove());
  }
  cleanStoredRegister();
  async function token(){if(!client)throw new Error('Supabase admin session unavailable');const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');return session.access_token}
  function rows(){removeDemoRows();return [...document.querySelectorAll('#tenantRegister .tenant-row')].map(row=>{const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';const noticeText=row.dataset.tenantNotice||'';return{name:value('name'),email:value('email').toLowerCase(),mobile:value('mobile'),property:value('property'),furnishing:value('furnishing')||'Unfurnished',awayFrom:value('awayFrom'),awayTo:value('awayTo'),notice:noticeText==='none'?null:{status:noticeText}}}).filter(t=>t.email&&!isDemoTenant(t))}
  async function post(action,payload={}){
    if(!configured())throw new Error('Google Sheets API is not connected yet.');
    const accessToken=await token();
    await fetch(API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,accessToken,...payload})});
    return {ok:true,count:Array.isArray(payload.tenants)?payload.tenants.length:0};
  }
  async function syncNow({quiet=false}={}){if(syncing){pending=true;return}syncing=true;try{const list=rows();const result=await post('replaceTenants',{tenants:list});if(!quiet)toast(`Tenant register sent to Google Sheets · ${result.count} tenant${result.count===1?'':'s'}`);document.documentElement.dataset.tenantSheetSync='ok'}catch(error){console.error('Tenant sheet sync:',error);document.documentElement.dataset.tenantSheetSync='error';if(!quiet)toast(error.message||'Unable to sync tenant register.')}finally{syncing=false;if(pending){pending=false;syncNow({quiet:true})}}}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>syncNow({quiet:true}),900)}

  document.addEventListener('change',event=>{
    const target=event.target;
    if(!target?.dataset?.tenant)return;
    const row=target.closest('#tenantRegister .tenant-row');
    if(!row||!row.open)return;
    const rowIndex=[...document.querySelectorAll('#tenantRegister .tenant-row')].indexOf(row);
    if(rowIndex<0)return;
    setTimeout(()=>{removeDemoRows();const replacement=document.querySelectorAll('#tenantRegister .tenant-row')[rowIndex];if(replacement)replacement.open=true;},0);
  },true);

  document.addEventListener('input',event=>{if(event.target.closest('#tenantRegister')&&event.target.dataset.tenant)schedule()});
  document.addEventListener('change',event=>{if(event.target.closest('#tenantRegister')&&event.target.dataset.tenant)schedule()});
  document.addEventListener('click',event=>{if(event.target.id==='addTenant'||event.target.dataset.tenantRemove!==undefined)setTimeout(()=>{removeDemoRows();syncNow({quiet:false})},0);if(event.target.id==='saveTenantRegister')setTimeout(()=>{removeDemoRows();syncNow({quiet:false})},0)},true);
  const observer=new MutationObserver(()=>removeDemoRows());observer.observe(document.documentElement,{childList:true,subtree:true});
  removeDemoRows();
  window.HLONYANE_TENANT_SHEET={sync:syncNow,rows,post,configured};
})();
