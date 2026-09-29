(() => {
  const KEY='hlonyaneTenantRegisterV1';
  const isDemo=t=>{
    const email=String(t?.email||'').trim().toLowerCase();
    const mobile=String(t?.mobile||'').trim();
    const property=String(t?.property||'').trim();
    const furnishing=String(t?.furnishing||'').trim();
    const password=String(t?.password||'').trim();
    if(email==='thabiso@example.com'||email==='roode.tenant@example.com')return true;
    return email==='msindisi.mtengwane@gmail.com'&&(
      password==='13592468'||
      mobile==='+27 72 000 0000'||
      (/Unit 7/i.test(property)&&furnishing==='Furnished')
    );
  };

  function cleanStorage(){
    try{
      const list=JSON.parse(localStorage.getItem(KEY)||'[]');
      if(!Array.isArray(list))return;
      const clean=list.filter(t=>!isDemo(t)).map(t=>{const c={...t};delete c.password;return c});
      if(JSON.stringify(clean)!==JSON.stringify(list))localStorage.setItem(KEY,JSON.stringify(clean));
    }catch(e){}
  }

  function rowTenant(row){
    const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';
    return {
      email:value('email'),
      mobile:value('mobile'),
      property:value('property'),
      furnishing:value('furnishing'),
      password:value('password')
    };
  }

  function cleanRows(){
    document.querySelectorAll('#tenantRegister .tenant-row').forEach(row=>{
      if(isDemo(rowTenant(row)))row.remove();
    });
    const host=document.querySelector('#tenantRegister');
    if(host&&!host.querySelector('.tenant-row')&&!host.querySelector('.admin-note')){
      host.insertAdjacentHTML('beforeend','<p class="admin-note">No enrolled tenants yet.</p>');
    }
  }

  cleanStorage();
  cleanRows();
  const observer=new MutationObserver(()=>cleanRows());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.HLONYANE_TENANT_DEMO_CLEANUP={run:()=>{cleanStorage();cleanRows()}};
})();
