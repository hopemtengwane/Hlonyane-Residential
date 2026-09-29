/* Browser state with GitHub-backed central configuration overlay. */
(() => {
  window.HLONYANE_TENANT_DATA_API_URL='https://script.google.com/macros/s/AKfycbxmWcEaOSSUJ0Pe9S6fxI7_MCghmcoVXwKJpeVggGapI_qF_XoOoXyQ-ATMdQyxsKF5-g/exec';
  const key='hlonyaneSiteStateV41';
  const configUrl='https://raw.githubusercontent.com/hopemtengwane/Hlonyane-Residential/main/site-config.json';
  const base=()=>({heroPhotos:null,heroText:null,propertyPhotos:{},properties:null,overnight:{},parallax:{},deletedComments:[]});
  const overnightBachelor={name:'Overnight Bachelor Rooms',address:'21 Roode Street',city:'Middelburg EC',count:4,vacant:0,vacancySample:true,beds:null,baths:null,area:null,rent:750,furnished:null,type:'4 bachelor rooms · priced per room',photoGroup:'roode',heroNumber:45,excludeNumbers:[],pricingMode:'nightly',unitLabel:'rooms'};
  const commune={name:'4 Bedroom Commune',address:'21 Roode Street',city:'Middelburg EC',count:4,vacant:0,vacancySample:true,beds:4,baths:2,area:null,rent:600,furnished:null,type:'4 communal rooms · priced per room',photoGroup:'roode-2bed-furnished',heroNumber:11,excludeNumbers:[],pricingMode:'nightly',unitLabel:'rooms'};
  const defaultProperties=[
    {name:'New Flats',address:'4 Van Reenen Street',city:'Middelburg EC',count:7,vacant:2,vacancySample:true,beds:2,baths:1,area:null,rent:6000,furnished:9500,type:'2-bedroom apartments',photoGroup:'new',heroNumber:80,excludeNumbers:[100,101,102,103,104,105,106,107,108,109]},
    {name:'New Flats',address:'4 Van Reenen Street',city:'Middelburg EC',count:17,vacant:4,vacancySample:true,beds:1,baths:1,area:null,rent:4500,furnished:8000,type:'1-bedroom / bachelor apartments',photoGroup:'new',heroNumber:60,excludeNumbers:[76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99]},
    overnightBachelor,
    commune,
    {name:'21 Roode Street',address:'21 Roode Street',city:'Middelburg EC',count:null,vacant:null,beds:2,baths:null,area:null,rent:6000,furnished:9500,type:'2-bedroom apartments',photoGroup:'roode-2bed-furnished',heroNumber:11,excludeNumbers:[]},
    {name:'21 Roode Street',address:'21 Roode Street',city:'Middelburg EC',count:10,vacant:3,vacancySample:true,beds:1,baths:1,area:null,rent:4500,furnished:8000,type:'1-bedroom apartments',photoGroup:'roode',heroNumber:45,excludeNumbers:[11,12,13,14,15,16,17,18,19,20,21]}
  ];

  const applyPricing=props=>Array.isArray(props)?props.map(property=>{
    const p={...property};
    const name=String(p.name||'').toLowerCase(),type=String(p.type||'').toLowerCase(),address=String(p.address||'').toLowerCase();
    if(name.includes('overnight bachelor')||type.includes('bachelor rooms')){p.rent=750;p.furnished=null;p.pricingMode='nightly';p.unitLabel='rooms';return p}
    if(name.includes('4 bedroom commune')||type.includes('communal rooms')){p.rent=600;p.furnished=null;p.pricingMode='nightly';p.unitLabel='rooms';return p}
    const beds=Number(p.beds)||(/2[- ]?bed/i.test(type)?2:/1[- ]?bed|bachelor/i.test(type)?1:0);
    if((address.includes('van reenen')||address.includes('roode'))&&beds===1){p.rent=4500;p.furnished=8000}
    if((address.includes('van reenen')||address.includes('roode'))&&beds===2){p.rent=6000;p.furnished=9500}
    return p;
  }):props;

  const migrateProperties=props=>{
    if(!Array.isArray(props))return props;
    const isOldRoodeSpecial=p=>String(p?.address||'').includes('21 Roode')&&(/4-bedroom house/i.test(String(p?.type||''))||/overnight rooms/i.test(String(p?.name||''))||/4-bachelor/i.test(String(p?.type||''))||/4 bedroom commune/i.test(String(p?.name||''))||/overnight bachelor rooms/i.test(String(p?.name||'')));
    const kept=props.filter(p=>!isOldRoodeSpecial(p));
    const old=props.find(isOldRoodeSpecial)||{};
    const hasBachelor=props.some(p=>/overnight bachelor rooms/i.test(String(p?.name||'')));
    const hasCommune=props.some(p=>/4 bedroom commune/i.test(String(p?.name||'')));
    const bachelor={...overnightBachelor,vacant:Number.isInteger(old.vacant)?old.vacant:overnightBachelor.vacant};
    const communal={...commune,vacant:Number.isInteger(old.vacant)?old.vacant:commune.vacant};
    const insertAt=Math.min(2,kept.length);
    const additions=[];if(!hasBachelor)additions.push(bachelor);if(!hasCommune)additions.push(communal);
    const already=props.filter(p=>/overnight bachelor rooms|4 bedroom commune/i.test(String(p?.name||''))).map(p=>({...p,area:null,pricingMode:'nightly',unitLabel:'rooms',furnished:null,rent:/overnight bachelor/i.test(String(p.name))?750:600}));
    return applyPricing([...kept.slice(0,insertAt),...(already.length?already:additions),...kept.slice(insertAt)].map(p=>({...p,area:null})));
  };

  let state=base();
  try{state={...state,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(e){}
  if(!Array.isArray(state.properties)||!state.properties.length)state.properties=defaultProperties.map(p=>({...p,excludeNumbers:[...(p.excludeNumbers||[])]}));
  else state.properties=migrateProperties(state.properties);
  state.overnight={...(state.overnight||{}),price:'R 750'};
  try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}

  const applyCentral=remote=>{
    try{
      if(!remote||typeof remote!=='object')return;
      const current=JSON.parse(localStorage.getItem(key)||'{}');
      const merged={...current,...remote};
      merged.propertyPhotos={...(current.propertyPhotos||{}),...(remote.propertyPhotos||{})};
      if(remote.heroPhotos?.length)merged.heroPhotos=remote.heroPhotos;
      else if(current.heroPhotos?.length)merged.heroPhotos=current.heroPhotos;
      merged.parallax={...(current.parallax||{}),...(remote.parallax||{})};
      if(Array.isArray(merged.properties))merged.properties=migrateProperties(merged.properties);
      merged.overnight={...(merged.overnight||{}),price:'R 750'};
      const before=JSON.stringify(current),after=JSON.stringify(merged);
      localStorage.setItem(key,after);
      if(before!==after){
        const remoteStamp=String(remote?._meta?.updatedAt||'legacy');
        const applied=sessionStorage.getItem('hlonyaneConfigAppliedStamp');
        if(applied!==remoteStamp){
          sessionStorage.setItem('hlonyaneConfigAppliedStamp',remoteStamp);
          location.reload();
        }
      }
    }catch(e){console.warn('Unable to apply central site configuration',e)}
  };

  fetch(configUrl+'?v='+Date.now(),{cache:'no-store'})
    .then(response=>response.ok?response.json():null)
    .then(applyCentral)
    .catch(()=>{});

  window.SITE_STATE=state;
  window.HLONYANE_CONTACTS={phone:'072 455 9413',email:'msindisi.mtengwane@gmail.com',portalPhone:'072 455 9413',portalEmail:'msindisi.mtengwane@gmail.com',...(state.contacts||{})};
  if(state.heroPhotos&&state.heroPhotos.length)window.PROPERTY_GALLERY=state.heroPhotos;
  if(state.properties&&Array.isArray(state.properties))window.SITE_OVERRIDES={...window.SITE_OVERRIDES,properties:state.properties,propertyPhotos:state.propertyPhotos||{}};
  if(Array.isArray(state.deletedComments)&&Array.isArray(window.TENANT_COMMENTS))window.TENANT_COMMENTS=window.TENANT_COMMENTS.filter((_,i)=>!state.deletedComments.includes(i));
  try{const portal=JSON.parse(localStorage.getItem('hlonyaneTenantPortalV42')||'{}');const approved=(portal.posts||[]).filter(p=>p.status==='Approved');if(approved.length)window.TENANT_COMMENTS=[...(window.TENANT_COMMENTS||[]),...approved.map(p=>({name:p.name||'Tenant',relationship:'Hlonyane Residential tenant',quote:p.text,photo:p.photo||''}))]}catch(e){}
  document.addEventListener('DOMContentLoaded',()=>{
    const text=state.heroText||{};
    const kicker=document.querySelector('.hero .kicker');if(text.kicker&&kicker)kicker.lastChild.textContent=' '+text.kicker;
    const title=document.querySelector('.hero h1');if(text.title&&title)title.innerHTML=text.title.replace(/\n/g,'<br>');
    const intro=document.querySelector('.hero-content>p:not(.kicker)');if(text.intro&&intro)intro.textContent=text.intro;
    const overnight=state.overnight||{};
    const overnightImg=document.querySelector('.overnight-card>img');if(overnight.image&&overnightImg)overnightImg.src=overnight.image;
    const overnightPrice=document.querySelector('.overnight-card .nightly-price');if(overnightPrice)overnightPrice.innerHTML='R 750 <span>per night</span>';
    const overnightLink=document.querySelector('.overnight-card [data-enquiry]');if(overnightLink)overnightLink.dataset.enquiry='Home Away From Home — 21 Roode Street — R 750 per night';
    document.querySelectorAll('.faq-section p').forEach(p=>{if(/listed rate is R500 per night/i.test(p.textContent||''))p.textContent=p.textContent.replace(/R500 per night/i,'R750 per night')});
    const stayEstimate=document.querySelector('#stayEstimate');if(stayEstimate)stayEstimate.textContent=stayEstimate.textContent.replace(/R500 per night/i,'R750 per night');
    const panels=[...document.querySelectorAll('.parallax-panel')];panels.forEach((el,i)=>{const fallback=['property-photos/61.jpg','property-photos/27.jpg','property-photos/78.jpg'][i];const value=state.parallax&&state.parallax[String(i)]||fallback;if(value){el.style.backgroundImage=`url("${value}")`;let mobile=el.querySelector('.parallax-mobile-image');if(!mobile){mobile=document.createElement('img');mobile.className='parallax-mobile-image';mobile.alt=el.getAttribute('aria-label')||'';mobile.loading='lazy';el.append(mobile)}mobile.src=value}});if(!window.matchMedia('(max-width: 800px)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let frame=0;const move=()=>{frame=0;panels.forEach(panel=>{const image=panel.querySelector('.parallax-mobile-image');if(!image)return;const rect=panel.getBoundingClientRect(),distance=(rect.top+rect.height/2-window.innerHeight/2)/window.innerHeight;image.style.transform=`translate3d(0,${Math.max(-285,Math.min(285,distance*-540))}px,0)`})};const onScroll=()=>{if(!frame)frame=requestAnimationFrame(move)};window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);move();
  });
})();
