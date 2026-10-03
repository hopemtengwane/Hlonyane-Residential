(() => {
  const SESSION_KEY='hlonyaneTenantSession';
  const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch(_){return {}}};
  const toast=message=>{const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3400)};

  async function persistNotice(startsOn){
    const session=readSession();
    const email=String(session.email||'').trim().toLowerCase();
    const tenantId=String(session.tenantId||session.id||'').trim();
    if(!email||!tenantId){toast('Please sign in again before submitting notice.');return;}
    try{
      await fetch(APPS_SCRIPT_URL,{
        method:'POST',
        mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'tenant.submitNotice',email,tenantId,startsOn})
      });
      toast(`Notice starting ${startsOn} has been shared with the property team.`);
    }catch(error){
      console.error('[Hlonyane notice sync]',error);
      toast('Notice was saved in the portal, but could not be shared with the property team. Please try again.');
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('#submitNotice');
    if(!button)return;
    setTimeout(()=>{
      const session=readSession();
      const startsOn=String(session.notice?.startsOn||document.querySelector('#noticeStart')?.value||'').trim();
      if(startsOn)persistNotice(startsOn);
    },0);
  },true);
})();
