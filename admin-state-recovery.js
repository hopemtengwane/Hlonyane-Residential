(() => {
  const KEY='hlonyaneSiteStateV41';
  const heroTextDefaults={
    kicker:'Residential spaces, thoughtfully managed',
    title:'A place to live.\nA place to belong.',
    intro:'Flats to call home and accommodation for an overnight stay. Discover Hlonyane Residential in Middelburg, Eastern Cape.'
  };
  const overnightDefaults={price:'R 750',image:'property-photos/1.jpg'};
  let state={};
  try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){state={}}
  if(!state.heroText||typeof state.heroText!=='object')state.heroText={...heroTextDefaults};
  else state.heroText={...heroTextDefaults,...state.heroText};
  if(!state.overnight||typeof state.overnight!=='object')state.overnight={...overnightDefaults};
  else state.overnight={...overnightDefaults,...state.overnight,price:'R 750'};
  if(!state.propertyPhotos||typeof state.propertyPhotos!=='object')state.propertyPhotos={};
  if(!state.parallax||typeof state.parallax!=='object')state.parallax={};
  if(!Array.isArray(state.deletedComments))state.deletedComments=[];
  if(window.HLONYANE_APPLY_PRICING_POLICY)state=window.HLONYANE_APPLY_PRICING_POLICY(state);
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
})();
