(() => {
  const KEY='hlonyaneSiteStateV41';
  const defaults=[
    {name:'New Flats',address:'4 Van Reenen Street',city:'Middelburg EC',count:7,vacant:2,vacancySample:true,beds:2,baths:1,area:null,rent:6000,furnished:9000,type:'2-bedroom apartments',photoGroup:'new',heroNumber:80,excludeNumbers:[100,101,102,103,104,105,106,107,108,109]},
    {name:'New Flats',address:'4 Van Reenen Street',city:'Middelburg EC',count:17,vacant:4,vacancySample:true,beds:1,baths:1,area:null,rent:4500,furnished:6000,type:'1-bedroom / bachelor apartments',photoGroup:'new',heroNumber:60,excludeNumbers:[76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99]},
    {name:'Overnight Bachelor Rooms',address:'21 Roode Street',city:'Middelburg EC',count:4,vacant:0,vacancySample:true,beds:null,baths:null,area:null,rent:750,furnished:null,type:'4 bachelor rooms · priced per room',photoGroup:'roode',heroNumber:45,excludeNumbers:[],pricingMode:'nightly',unitLabel:'rooms'},
    {name:'4 Bedroom Commune',address:'21 Roode Street',city:'Middelburg EC',count:4,vacant:0,vacancySample:true,beds:4,baths:2,area:null,rent:600,furnished:null,type:'4 communal rooms · priced per room',photoGroup:'roode-2bed-furnished',heroNumber:11,excludeNumbers:[],pricingMode:'nightly',unitLabel:'rooms'},
    {name:'21 Roode Street',address:'21 Roode Street',city:'Middelburg EC',count:null,vacant:null,beds:2,baths:null,area:null,rent:6000,furnished:9000,type:'2-bedroom apartments',photoGroup:'roode-2bed-furnished',heroNumber:11,excludeNumbers:[]},
    {name:'21 Roode Street',address:'21 Roode Street',city:'Middelburg EC',count:10,vacant:3,vacancySample:true,beds:1,baths:1,area:null,rent:4500,furnished:6000,type:'1-bedroom apartments',photoGroup:'roode',heroNumber:45,excludeNumbers:[11,12,13,14,15,16,17,18,19,20,21]}
  ];
  try{
    const state=JSON.parse(localStorage.getItem(KEY)||'{}');
    const props=Array.isArray(state.properties)?state.properties:[];
    const special=p=>String(p?.address||'').includes('21 Roode')&&(/4-bedroom house/i.test(String(p?.type||''))||/overnight rooms/i.test(String(p?.name||''))||/4-bachelor/i.test(String(p?.type||''))||/overnight bachelor rooms/i.test(String(p?.name||''))||/4 bedroom commune/i.test(String(p?.name||'')));
    if(!props.length){state.properties=defaults;}
    else{
      const old=props.find(special)||{};
      const kept=props.filter(p=>!special(p)).map(p=>({...p,area:null}));
      const current=props.filter(p=>/overnight bachelor rooms|4 bedroom commune/i.test(String(p?.name||'')));
      const bachelors=current.find(p=>/overnight bachelor/i.test(String(p.name)))||{...defaults[2],vacant:Number.isInteger(old.vacant)?old.vacant:0};
      const commune=current.find(p=>/4 bedroom commune/i.test(String(p.name)))||{...defaults[3],vacant:Number.isInteger(old.vacant)?old.vacant:0};
      Object.assign(bachelors,{area:null,pricingMode:'nightly',unitLabel:'rooms',furnished:null,rent:Number(bachelors.rent)||750});
      Object.assign(commune,{area:null,pricingMode:'nightly',unitLabel:'rooms',furnished:null,rent:Number(commune.rent)||600});
      state.properties=[...kept.slice(0,2),bachelors,commune,...kept.slice(2)];
    }
    localStorage.setItem(KEY,JSON.stringify(state));
  }catch(e){}

  const relabel=()=>document.querySelectorAll('.property-editor').forEach(editor=>{
    const name=(editor.querySelector('[data-field="name"]')?.value||'').toLowerCase();
    if(!name.includes('overnight bachelor rooms')&&!name.includes('4 bedroom commune'))return;
    const set=(field,text)=>{const label=editor.querySelector(`[data-field="${field}"]`)?.closest('label');if(label?.firstChild)label.firstChild.nodeValue=text;return label};
    set('rent','Nightly rate (R)');
    const furnished=set('furnished','Furnished rent');if(furnished)furnished.style.display='none';
    set('count','Total rooms');set('vacant','Available rooms');
  });
  document.addEventListener('DOMContentLoaded',()=>{
    relabel();
    const host=document.querySelector('#propertyEditors');
    if(host)new MutationObserver(relabel).observe(host,{childList:true,subtree:true});
  });
})();
