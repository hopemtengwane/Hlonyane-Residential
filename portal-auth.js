(() => {
  const login=document.querySelector('#tenantLogin');
  if(!login)return;
  const email=document.querySelector('.tenant-login input[name="email"]');
  const password=document.querySelector('.tenant-login input[name="password"]');
  const defaults=[
    {name:'Thabiso Molotwa',email:'thabiso@example.com',mobile:'+27 72 000 0000',emergency:'Nomsa Molotwa · +27 73 000 0000',propertyIndex:0,password:'Demo1234',furnishing:'Furnished',property:'4 Van Reenen Street · Unit 7',awayFrom:'',awayTo:''},
    {name:'Msindisi Mtengwane',email:'msindisi.mtengwane@gmail.com',mobile:'+27 72 000 0000',emergency:'Nomsa Mtengwane · +27 73 000 0000',propertyIndex:0,password:'13592468',furnishing:'Furnished',property:'4 Van Reenen Street · Unit 7',awayFrom:'',awayTo:''},
    {name:'Roode Flats Tenant',email:'roode.tenant@example.com',mobile:'+27 73 000 0000',emergency:'Emergency contact · +27 74 000 0000',propertyIndex:3,password:'Demo1234',furnishing:'Unfurnished',property:'21 Roode Street · Unit 3',awayFrom:'',awayTo:''}
  ];
  const registerKey='hlonyaneTenantRegisterV1';let accounts={};try{const saved=JSON.parse(localStorage.getItem(registerKey)||'null');const list=Array.isArray(saved)&&saved.length?saved:defaults;list.forEach(a=>accounts[(a.email||'').toLowerCase()]={...a,propertyIndex:a.propertyIndex??(a.property&&a.property.includes('Roode')?2:0)});if(!saved)localStorage.setItem(registerKey,JSON.stringify(list))}catch(e){defaults.forEach(a=>accounts[a.email]=a)}
  login.addEventListener('click',event=>{
    event.preventDefault();
    const entered=(email?.value||'').trim().toLowerCase()||'thabiso@example.com';
    const account=accounts[entered];
    if(!account){password?.setCustomValidity('This email is not enrolled yet. Ask the property team to add you to the tenant register.');password?.reportValidity();setTimeout(()=>password?.setCustomValidity(''),2800);return;}
    if(!password?.value || password.value!==account.password){
      password?.setCustomValidity('Incorrect password for this tenant account.');password?.reportValidity();setTimeout(()=>password?.setCustomValidity(''),2500);return;
    }
    localStorage.setItem('hlonyaneTenantSession',JSON.stringify(account));
    localStorage.setItem('hlonyaneTenantPortalV42',JSON.stringify({profile:{name:account.name,email:account.email,mobile:account.mobile,emergency:account.emergency},tenant:{propertyIndex:account.propertyIndex}}));
    location.href=login.getAttribute('href')||'tenant-portal/index.html';
  });
})();
