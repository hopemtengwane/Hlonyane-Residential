(() => {
  const saveSoon = (() => {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await window.HLONYANE_ADMIN_SITE_CONFIG?.save?.({quiet:true});
        } catch (error) {
          console.error('Unable to save Admin changes centrally:', error);
        }
      }, 120);
    };
  })();

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-save],[data-contact-save],[data-comment-remove],[data-property-remove],#addProperty');
    if (!target) return;
    // Loaded after admin-app.js so its own click handlers update localStorage first.
    setTimeout(saveSoon, 0);
  });

  window.HLONYANE_SAVE_SITE_CENTRALLY = saveSoon;
})();
