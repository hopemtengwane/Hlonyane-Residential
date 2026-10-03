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

  function ensureStyles(){
    if(document.querySelector('#profilePhotoEditorStyles'))return;
    const style=document.createElement('style');
    style.id='profilePhotoEditorStyles';
    style.textContent=`
      .profile-photo-editor{position:relative!important;width:112px!important;height:112px!important;min-width:112px!important;border-radius:50%!important;overflow:hidden!important;cursor:pointer!important;border:2px solid rgba(255,255,255,.9)!important;background:#8d9296!important;display:grid!important;place-items:center!important;color:#fff!important;box-shadow:0 2px 10px rgba(0,0,0,.12)!important}
      .profile-photo-editor img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important}
      .profile-photo-overlay{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;background:rgba(25,29,31,.44);color:#fff;opacity:1;transition:background .18s ease;pointer-events:none;padding:15px;box-sizing:border-box;font:600 12px/1.2 Arial,sans-serif}
      .profile-photo-overlay .camera{font-size:23px;line-height:1;filter:grayscale(1) brightness(4)}
      .profile-photo-editor:hover .profile-photo-overlay,.profile-photo-editor:focus .profile-photo-overlay{background:rgba(16,20,22,.62)}
      .profile-photo-editor:focus{outline:3px solid #d3a42b;outline-offset:3px}
      .profile-photo-remove{margin-top:8px;border:0;background:transparent;color:#8a5c00;text-decoration:underline;cursor:pointer;font:600 13px Arial,sans-serif;padding:0}
      @media(max-width:700px){.profile-photo-editor{width:96px!important;height:96px!important;min-width:96px!important}.profile-photo-overlay{font-size:11px}.profile-photo-overlay .camera{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function getInitials(){
    const session=readSession();
    return String(session.name||'Tenant').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'T';
  }

  function paintPhoto(dataUrl){
    const initials=getInitials();
    document.querySelectorAll('.header-actions .avatar').forEach(avatar=>{
      if(dataUrl){
        avatar.innerHTML=`<img src="${dataUrl}" alt="Profile picture">`;
        avatar.classList.add('has-photo');
      }else{
        avatar.textContent=initials;
        avatar.classList.remove('has-photo');
      }
    });

    const editor=document.querySelector('.profile-photo-editor');
    if(editor){
      editor.querySelector('img')?.remove();
      [...editor.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());
      if(dataUrl){
        const img=document.createElement('img');
        img.src=dataUrl;
        img.alt='Profile picture';
        editor.prepend(img);
      }else{
        const initialsNode=document.createElement('span');
        initialsNode.className='profile-photo-initials';
        initialsNode.textContent=initials;
        editor.prepend(initialsNode);
      }
    }
  }

  function ensurePhotoControl(){
    const card=document.querySelector('#profile .profile-card');
    const head=card?.querySelector('.profile-head');
    const avatar=head?.querySelector('.avatar.large');
    if(!card||!head||!avatar)return;

    ensureStyles();

    let input=card.querySelector('#profilePhotoInput');
    if(!input){
      input=document.createElement('input');
      input.id='profilePhotoInput';
      input.type='file';
      input.accept='image/jpeg,image/png,image/webp';
      input.hidden=true;
      card.appendChild(input);
    }

    avatar.classList.add('profile-photo-editor');
    avatar.setAttribute('role','button');
    avatar.setAttribute('tabindex','0');
    avatar.setAttribute('aria-label','Update profile picture');
    avatar.title='Update profile picture';

    if(!avatar.querySelector('.profile-photo-overlay')){
      const overlay=document.createElement('span');
      overlay.className='profile-photo-overlay';
      overlay.innerHTML='<span>Update Profile<br>Picture</span><span class="camera" aria-hidden="true">📷</span>';
      avatar.appendChild(overlay);
    }

    const openPicker=()=>input.click();
    avatar.onclick=openPicker;
    avatar.onkeydown=event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();openPicker();}
    };

    if(!card.querySelector('#removeProfilePhoto')){
      const nameBlock=head.querySelector('div:not(.avatar)');
      const remove=document.createElement('button');
      remove.type='button';
      remove.id='removeProfilePhoto';
      remove.className='profile-photo-remove';
      remove.textContent='Remove profile photo';
      nameBlock?.appendChild(remove);
      remove.addEventListener('click',()=>{
        localStorage.removeItem(PHOTO_KEY);
        paintPhoto('');
        remove.hidden=true;
      });
    }

    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
        alert('Please choose a JPG, PNG or WEBP image.');
        input.value='';
        return;
      }
      if(file.size>3*1024*1024){
        alert('Please choose an image smaller than 3 MB.');
        input.value='';
        return;
      }
      const reader=new FileReader();
      reader.onload=()=>{
        const data=String(reader.result||'');
        localStorage.setItem(PHOTO_KEY,data);
        paintPhoto(data);
        const remove=card.querySelector('#removeProfilePhoto');
        if(remove)remove.hidden=false;
        input.value='';
      };
      reader.readAsDataURL(file);
    };

    const existing=localStorage.getItem(PHOTO_KEY)||'';
    paintPhoto(existing);
    const remove=card.querySelector('#removeProfilePhoto');
    if(remove)remove.hidden=!existing;
  }

  function run(){
    updateGreeting();
    ensurePhotoControl();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
