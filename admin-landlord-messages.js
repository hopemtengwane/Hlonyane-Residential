(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const EDGE=SUPABASE_URL+'/functions/v1/hlonyane-admin-media';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;

  const toast=message=>{
    const el=document.querySelector('#cmsToast');
    if(!el)return alert(message);
    el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);
  };

  async function token(){
    if(!client)throw new Error('Admin sign-in service is unavailable.');
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session?.access_token)throw new Error('Admin session expired. Please sign in again.');
    return session.access_token;
  }

  async function sendCentral(payload){
    const accessToken=await token();
    const response=await fetch(EDGE,{
      method:'POST',
      headers:{Authorization:`Bearer ${accessToken}`,apikey:SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({site:'hlonyane',action:'sendPortalMessage',...payload}),
      cache:'no-store'
    });
    const text=await response.text();
    let result;
    try{result=JSON.parse(text)}catch(_){throw new Error('Portal message service returned an invalid response.');}
    if(!response.ok||!result?.ok)throw new Error(result?.error||`Unable to send portal message (${response.status}).`);
    return result;
  }

  function addCategoryField(section){
    if(section.querySelector('#messageCategory'))return;
    const subject=section.querySelector('#messageSubject')?.closest('label');
    if(!subject)return;
    const label=document.createElement('label');
    label.innerHTML='Category<select id="messageCategory"><option>General</option><option>Maintenance</option><option>Payments</option><option>Lease / documents</option><option>Property notice</option><option>Other</option></select>';
    subject.insertAdjacentElement('beforebegin',label);
  }

  function removeAttachmentField(section){
    const input=section.querySelector('#messageAttachments');
    const label=input?.closest('label');
    if(label)label.remove();
  }

  function wire(){
    const section=document.querySelector('[data-message-section]');
    const send=section?.querySelector('#sendPortalMessage');
    if(!section||!send||send.dataset.centralLandlordWired)return false;
    send.dataset.centralLandlordWired='1';
    addCategoryField(section);
    removeAttachmentField(section);
    const note=document.createElement('p');
    note.className='admin-note';
    note.textContent='Messages are delivered inside the Tenant Portal. Property recipients send the same message to every active tenant assigned to that property.';
    send.insertAdjacentElement('afterend',note);

    send.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const recipient=section.querySelector('#messageRecipient')?.value||'';
      const category=section.querySelector('#messageCategory')?.value||'General';
      const subject=section.querySelector('#messageSubject')?.value.trim()||'';
      const message=section.querySelector('#messageBody')?.value.trim()||'';
      if(!recipient)return toast('Choose a tenant, property or all tenants.');
      if(!subject)return toast('Add a subject first.');
      if(!message)return toast('Write a message first.');
      send.disabled=true;
      const old=send.textContent;
      send.textContent='Sending…';
      try{
        const result=await sendCentral({recipient,category,subject,message});
        section.querySelector('#messageSubject').value='';
        section.querySelector('#messageBody').value='';
        toast(`Message sent to ${result.count||1} tenant${Number(result.count||1)===1?'':'s'}.`);
      }catch(error){
        alert(error.message||'Unable to send the message.');
      }finally{
        send.disabled=false;send.textContent=old;
      }
    },true);
    return true;
  }

  async function init(){
    for(let i=0;i<40;i++){
      if(wire())return;
      await new Promise(r=>setTimeout(r,100));
    }
  }

  window.HLONYANE_ADMIN_LANDLORD_MESSAGES_READY=init();
})();
