(() => {
  const form=document.getElementById('leaseForm');
  const submit=document.getElementById('submitLeaseShared');
  if(!form||!submit)return;
  const API='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const readJSON=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=readJSON('hlonyaneTenantSession',{});
  const status=document.getElementById('saveStatus');

  const formDataObject=()=>{const d=Object.fromEntries(new FormData(form).entries());d.termsAccepted=!!form.elements.termsAccepted?.checked;return d};
  const signature=()=>{
    const src=document.getElementById('tenantCanvas');
    if(!src)return '';
    const small=document.createElement('canvas');small.width=350;small.height=95;
    small.getContext('2d').drawImage(src,0,0,350,95);
    return small.toDataURL('image/png');
  };
  const jsonp=params=>new Promise((resolve,reject)=>{
    const cb='hlonyaneLeaseVerify_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    const timer=setTimeout(()=>{cleanup();reject(new Error('Lease verification timed out.'));},10000);
    function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}
    window[cb]=data=>{cleanup();resolve(data)};
    s.src=API+'?'+new URLSearchParams({...params,callback:cb,_:Date.now().toString()});
    s.onerror=()=>{cleanup();reject(new Error('Unable to verify the shared lease.'));};
    document.head.append(s);
  });
  const delay=ms=>new Promise(r=>setTimeout(r,ms));

  async function verifySaved(){
    for(let i=0;i<6;i++){
      await delay(i===0?900:1000);
      const r=await jsonp({action:'tenant.getLease',email:session.email,tenantId:session.tenantId||session.id});
      if(r?.ok===false)throw new Error(r.error||'Lease backend rejected the verification request.');
      if(r?.lease?.status==='Tenant signed'||r?.lease?.status==='Fully signed')return r.lease;
    }
    throw new Error('The lease was not saved to the shared register. Please ask the property manager to update the Apps Script deployment, then submit again.');
  }

  submit.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!form.reportValidity())return;
    const data=formDataObject();
    if(!data.termsAccepted){form.elements.termsAccepted?.focus();return;}
    const sig=signature();
    if(!sig&&!String(data.typedSignature||'').trim()){
      if(status)status.textContent='Please add your signature before submitting.';
      return;
    }
    submit.disabled=true;submit.textContent='Submitting…';
    if(status)status.textContent='Submitting signed lease to the shared register…';
    try{
      await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'tenant.submitLease',email:session.email,tenantId:session.tenantId||session.id,form:data,tenantSignature:sig})});
      await verifySaved();
      submit.textContent='Signed & sent';
      if(status)status.textContent='Tenant signature saved centrally. Awaiting landlord signature.';
      setTimeout(()=>location.reload(),700);
    }catch(error){
      console.error('Shared lease submission failed:',error);
      submit.disabled=false;submit.textContent='Sign & send to landlord';
      if(status)status.textContent=error?.message||'Unable to save the signed lease centrally.';
    }
  },true);
})();
