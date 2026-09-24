(() => {
  const gallery=document.getElementById('gallery');
  const toggle=document.getElementById('galleryPlay');
  const next=document.getElementById('galleryNext');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motion.matches;
  let timer;
  function schedule() {
    clearInterval(timer);
    toggle.textContent=paused?'Play':'Pause';
    toggle.setAttribute('aria-label',paused?'Play gallery slideshow':'Pause gallery slideshow');
    if(paused||document.hidden)return;
    timer=setInterval(()=>{
      if(document.getElementById('galleryTrack').contains(document.activeElement)||document.querySelector('dialog[open]'))return;
      next.click();
    },2500);
  }
  toggle.addEventListener('click',()=>{paused=!paused;schedule();});
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',event=>{paused=event.matches;schedule();});
  schedule();
})();
