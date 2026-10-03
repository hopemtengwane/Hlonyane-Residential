(() => {
  const SESSION_KEY='hlonyaneTenantSession';
  const PHOTO_KEY='hlonyaneProfilePhotoV1';
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch(_){return {}}};

  function updateGreeting(){
    const session=readSession();
    const name=String(session.name||'Tenant').trim();
    const first=name.split(/\s+/)[0]||'Tenant';
    const hour=new Date().getHours();
    const part=hour<12?'morning':hour<18?'afternoon':'evening';
    const heading=document.querySelector('main > header h1');
    if(heading)heading.textContent=`Good ${part}, ${first}`;
  }

  function paintPhoto(dataUrl){
    document.querySelectorAll('.profile-head .avatar,.header-actions .avatar').forEach(avatar=>{
      if(!dataUrl)return;
      avatar.innerHTML=`<img src="${dataUrl}" alt="Profile picture">`;
      avatar.classList.add('has-photo');
    });
  }

  function ensurePhotoControl(){
    const card=document.querySelector('#profile .profile-card');
    const head=card?.querySelector('.profile-head');
    if(!card||!head||card.querySelector('#profilePhotoInput'))return;

    const controls=document.createElement('div');
    controls.className='profile-photo-controls';
    controls.innerHTML=`<label class="outline-btn" for="profilePhotoInput">Choose profile photo</label><input id="profilePhotoInput" type="file" accept="image/*" hidden><button type="button" class="text-btn" id="removeProfilePhoto">Remove photo</button><small class="muted">JPG, PNG or WEBP. The photo is stored on this device.</small>`;
    head.appendChild(controls);

    const input=controls.querySelector('#profilePhotoInput');
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(!file.type.startsWith('image/'))return;
      if(file.size>3*1024*1024){alert('Please choose an image smaller than 3 MB.');input.value='';return;}
      const reader=new FileReader();
      reader.onload=()=>{
        const data=String(reader.result||'');
        localStorage.setItem(PHOTO_KEY,data);
        paintPhoto(data);
      };
      reader.readAsDataURL(file);
    });

    controls.querySelector('#removeProfilePhoto').addEventListener('click',()=>{
      localStorage.removeItem(PHOTO_KEY);
      location.reload();
    });
  }

  function run(){
    updateGreeting();
    const existing=localStorage.getItem(PHOTO_KEY)||'';
    if(existing)paintPhoto(existing);
    ensurePhotoControl();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
