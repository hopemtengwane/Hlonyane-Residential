(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const API_URL=String(window.HLONYANE_TENANT_DATA_API_URL||'').trim();
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let timer=null;
  let syncing=false;
  let pending=false;
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\//i.test(API_URL);
  async function token(){if(!client)throw new Error('Supabase admin session unavailable');const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');return session.access_token}
  function rows(){return [...document.querySelectorAll('#tenantRegister .tenant-row')].map(row=>{const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';const noticeText=row.dataset.tenantNotice||'';return{name:value('name'),email:value('email').toLowerCase(),mobile:value('mobile'),property:value('property'),furnishing:value('furnishing')||'Unfurnished',awayFrom:value('awayFrom'),awayTo:value('awayTo'),notice:noticeText==='none'?null:{status:noticeText}}}).filter(t=>t.email)}
  async function post(action,payload={}){
    if(!configured())throw new Error('Google Sheets API is not connected yet.');
    const accessToken=await token();
    // Apps Script web apps redirect POST responses through googleusercontent.com.
    // Browsers can reject that redirected response under CORS even though the
    // Apps Script request itself is valid. no-cors lets the write reach Apps Script.
    await fetch(API_URL,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,accessToken,...payload})
    });
    return {ok:true,count:Array.isArray(payload.tenants)?payload.tenants.length:0};
  }
  async function syncNow({quiet=false}={}){if(syncing){pending=true;return}syncing=true;try{const list=rows();const result=await post('replaceTenants',{tenants:list});if(!quiet)toast(`Tenant register sent to Google Sheets · ${result.count} tenant${result.count===1?'':'s'}`);document.documentElement.dataset.tenantSheetSync='ok'}catch(error){console.error('Tenant sheet sync:',error);document.documentElement.dataset.tenantSheetSync='error';if(!quiet)toast(error.message||'Unable to sync tenant register.')}finally{syncing=false;if(pending){pending=false;syncNow({quiet:true})}}}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>syncNow({quiet:true}),900)}
  function addStatus(){const section=document.querySelector('#tenantRegister')?.closest('.cms-section');if(!section||section.querySelector('.tenant-sheet-status'))return;const note=document.createElement('p');note.className='admin-note tenant-sheet-status';note.textContent=configured()?'Google Sheets sync is connected. Tenant additions, edits and removals are mirrored automatically.':'Google Sheets sync is waiting for the Apps Script deployment URL.';section.querySelector('.cms-section-head')?.after(note)}

  // admin-app redraws a tenant row after a field change. Preserve the exact open row
  // by position so a new tenant does not collapse before an email address exists.
  document.addEventListener('change',event=>{
    const target=event.target;
    if(!target?.dataset?.tenant)return;
    const row=target.closest('#tenantRegister .tenant-row');
    if(!row||!row.open)return;
    const rowIndex=[...document.querySelectorAll('#tenantRegister .tenant-row')].indexOf(row);
    if(rowIndex<0)return;
    setTimeout(()=>{
      const replacement=document.querySelectorAll('#tenantRegister .tenant-row')[rowIndex];
      if(replacement)replacement.open=true;
    },0);
  },true);

  document.addEventListener('input',event=>{if(event.target.closest('#tenantRegister')&&event.target.dataset.tenant)schedule()});
  document.addEventListener('change',event=>{if(event.target.closest('#tenantRegister')&&event.target.dataset.tenant)schedule()});
  document.addEventListener('click',event=>{if(event.target.id==='addTenant'||event.target.dataset.tenantRemove!==undefined)setTimeout(()=>syncNow({quiet:false}),0);if(event.target.id==='saveTenantRegister')setTimeout(()=>syncNow({quiet:false}),0)},true);
  const observer=new MutationObserver(()=>addStatus());observer.observe(document.documentElement,{childList:true,subtree:true});addStatus();window.HLONYANE_TENANT_SHEET={sync:syncNow,rows,post,configured};
})();
