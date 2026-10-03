(() => {
  const SESSION_KEY='hlonyaneTenantSession';
  const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch(_){return {}}};
  const toast=message=>{const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)};

  async function persistPresence(awayFrom,awayTo){
    const session=readSession();
    const email=String(session.email||'').trim().toLowerCase();
    const tenantId=String(session.tenantId||session.id||'').trim();
    if(!email||!tenantId){toast('Please sign in again before updating Home & Away.');return;}
    try{
      await fetch(APPS_SCRIPT_URL,{
        method:'POST',
        mode:'no-cors',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'tenant.setPresence',email,tenantId,awayFrom,awayTo})
      });
      toast(awayTo?'Home & Away dates saved and shared with the property team.':'You are marked as home and the property team has been updated.');
    }catch(error){
      console.error('[Hlonyane Home & Away sync]',error);
      toast('Dates were saved in the portal, but could not be shared with the property team. Please try again.');
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('#saveAway,#clearAway');
    if(!button)return;
    setTimeout(()=>{
      const session=readSession();
      if(button.id==='clearAway')persistPresence('','');
      else persistPresence(String(session.awayFrom||document.querySelector('#awayFrom')?.value||''),String(session.awayTo||document.querySelector('#awayTo')?.value||''));
    },0);
  },true);
})();
