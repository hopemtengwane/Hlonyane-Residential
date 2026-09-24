/* Browser-local preview content managed from Admin. */
(() => {
  const key='hlonyaneSiteStateV41';
  const base=()=>({heroPhotos:null,heroText:null,propertyPhotos:{},properties:null,overnight:{},parallax:{},deletedComments:[]});
  let state=base();
  try{state={...state,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(e){}
  window.SITE_STATE=state;
  window.HLONYANE_CONTACTS={phone:'072 455 9413',email:'msindisi.mtengwane@gmail.com',portalPhone:'072 455 9413',portalEmail:'msindisi.mtengwane@gmail.com',...(state.contacts||{})};
  if(state.heroPhotos&&state.heroPhotos.length)window.PROPERTY_GALLERY=state.heroPhotos;
  if(state.properties&&Array.isArray(state.properties))window.SITE_OVERRIDES={...window.SITE_OVERRIDES,properties:state.properties,propertyPhotos:state.propertyPhotos||{}};
 if(Array.isArray(state.deletedComments)&&Array.isArray(window.TENANT_COMMENTS))window.TENANT_COMMENTS=window.TENANT_COMMENTS.filter((_,i)=>!state.deletedComments.includes(i));
 try{const portal=JSON.parse(localStorage.getItem('hlonyaneTenantPortalV42')||'{}');const approved=(portal.posts||[]).filter(p=>p.status==='Approved');if(approved.length)window.TENANT_COMMENTS=[...(window.TENANT_COMMENTS||[]),...approved.map(p=>({name:p.name||'Tenant',relationship:'Hlonyane Residential tenant',quote:p.text,photo:p.photo||''}))]}catch(e){}
  document.addEventListener('DOMContentLoaded',()=>{
    const text=state.heroText||{};
    const kicker=document.querySelector('.hero .kicker'); if(text.kicker&&kicker) kicker.lastChild.textContent=' '+text.kicker;
    const title=document.querySelector('.hero h1'); if(text.title&&title) title.innerHTML=text.title.replace(/\n/g,'<br>');
    const intro=document.querySelector('.hero-content>p:not(.kicker)'); if(text.intro&&intro) intro.textContent=text.intro;
    const overnight=state.overnight||{};
    const overnightImg=document.querySelector('.overnight-card>img'); if(overnight.image&&overnightImg) overnightImg.src=overnight.image;
    const overnightPrice=document.querySelector('.overnight-card .nightly-price'); if(overnight.price&&overnightPrice) overnightPrice.innerHTML=overnight.price+' <span>per night</span>';
    const panels=[...document.querySelectorAll('.parallax-panel')];panels.forEach((el,i)=>{const fallback=['property-photos/61.jpg','property-photos/27.jpg','property-photos/78.jpg'][i];const value=state.parallax&&state.parallax[String(i)]||fallback;if(value){el.style.backgroundImage=`url("${value}")`;let mobile=el.querySelector('.parallax-mobile-image');if(!mobile){mobile=document.createElement('img');mobile.className='parallax-mobile-image';mobile.alt=el.getAttribute('aria-label')||'';mobile.loading='lazy';el.append(mobile)}mobile.src=value}});if(!window.matchMedia('(max-width: 800px)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let frame=0;const move=()=>{frame=0;panels.forEach(panel=>{const image=panel.querySelector('.parallax-mobile-image');if(!image)return;const rect=panel.getBoundingClientRect(),distance=(rect.top+rect.height/2-window.innerHeight/2)/window.innerHeight;image.style.transform=`translate3d(0,${Math.max(-285,Math.min(285,distance*-540))}px,0)`})};const onScroll=()=>{if(!frame)frame=requestAnimationFrame(move)};window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);move();
  });
})();
