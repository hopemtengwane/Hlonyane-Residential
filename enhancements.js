// Tenant feedback and enquiry interactions. The standalone gallery has been removed.
(() => {
 const comments=window.TENANT_COMMENTS || [], grid=document.getElementById('tenantComments');
 comments.forEach(comment=>{const card=document.createElement('blockquote');card.className='tenant-comment';const heading=document.createElement('div');heading.className='tenant-comment-heading';const avatar=document.createElement('img');avatar.className='tenant-avatar';avatar.src=comment.photo||'assets/profile-avatar.svg';avatar.alt=comment.photo?'Profile picture of '+comment.name:'Generic profile avatar';avatar.width=56;avatar.height=56;const cite=document.createElement('cite');cite.textContent=comment.name+' · '+comment.relationship;heading.append(avatar,cite);const quote=document.createElement('p');quote.className='tenant-quote';const open=document.createElement('span'),close=document.createElement('span');open.className=close.className='comment-mark';open.setAttribute('aria-hidden','true');close.setAttribute('aria-hidden','true');open.textContent='“';close.textContent='”';quote.append(open,document.createTextNode(' '+comment.quote+' '),close);card.append(heading,quote);grid.append(card);});
 document.getElementById('communityEmpty').hidden=comments.length>0;
 const feedback=document.getElementById('feedbackDialog');
 document.getElementById('openFeedback').onclick=()=>feedback.showModal();
 document.getElementById('closeFeedback').onclick=()=>feedback.close();
 function saveText(filename,text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 document.getElementById('feedbackForm').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);saveText('hlonyane-feedback.txt',`FEEDBACK DRAFT — NOT SUBMITTED\nName: ${data.get('displayName')}\nConnection: ${data.get('relationship')}\n\n${data.get('comment')}\n\nPermission for review and possible publication: Yes`);feedback.close();});
 const form=document.getElementById('enquiryForm'),type=document.getElementById('enquiryType'),property=document.getElementById('enquiryProperty');
 const checkIn=document.getElementById('checkIn'),checkOut=document.getElementById('checkOut');
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 checkIn.min=today;checkOut.min=today;
 function syncType(){const overnight=type.value==='overnight';document.getElementById('overnightFields').hidden=!overnight;document.getElementById('apartmentFields').hidden=overnight;[checkIn,checkOut].forEach(el=>{el.disabled=!overnight;el.required=overnight;});document.querySelectorAll('#apartmentFields input,#apartmentFields select').forEach(el=>el.disabled=overnight);if(overnight)property.value='Home Away From Home — 21 Roode Street';else if(property.value.startsWith('Home Away'))property.value='';estimate();}
 function estimate(){checkOut.setCustomValidity('');checkOut.min=checkIn.value||today;const nights=(Date.parse(checkOut.value)-Date.parse(checkIn.value))/86400000;const out=document.getElementById('stayEstimate');if(checkIn.value&&checkOut.value&&(!Number.isFinite(nights)||nights<1)){checkOut.setCustomValidity('Check-out must be after check-in.');out.textContent='Please select a check-out date after check-in.';}else if(Number.isFinite(nights)&&nights>0){out.textContent=`${nights} night${nights===1?'':'s'} × R500 = R${(nights*500).toLocaleString('en-ZA')} estimated. Confirm availability, rate basis and final amount before booking.`;}else out.textContent='Choose your dates for a guide at R500 per night. Availability and the final booking amount must be confirmed.';}
 type.onchange=syncType;checkIn.oninput=estimate;checkOut.oninput=estimate;
 property.onchange=()=>{if(property.value.startsWith('Home Away'))type.value='overnight';else if(type.value==='overnight')type.value='apartment';syncType();};
 document.addEventListener('click',e=>{const a=e.target.closest('[data-enquiry]');if(!a)return;const text=a.dataset.enquiry;type.value=text.startsWith('Home Away')?'overnight':'apartment';syncType();if(text.includes('Van Reenen'))property.selectedIndex=text.includes('2-bedroom')?1:2;else if(text.includes('21 Roode')&&text.includes('2-bedroom'))property.selectedIndex=3;else if(!text.startsWith('Home Away'))property.selectedIndex=4;});
 syncType();
})();

// Contact details are managed from Admin and reflected in Section 8.
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '.contact-details{margin-top:22px}.contact-details a{color:#e5b849;text-decoration:none;font-weight:700}.contact-details a:hover{text-decoration:underline}';
    document.head.append(style);
    let contacts = {phone:'072 455 9413', email:'msindisi.mtengwane@gmail.com'};
    try { contacts = {...contacts, ...(JSON.parse(localStorage.getItem('hlonyaneSiteStateV41') || '{}').contacts || {})}; } catch (e) {}
    const host = document.querySelector('#contact .contact-box > div');
    if (!host) return;
    let details = host.querySelector('.contact-details');
    if (!details) { details = document.createElement('p'); details.className = 'contact-details'; host.append(details); }
    details.innerHTML = `<a class="contact-phone" href="tel:${String(contacts.phone).replace(/\D/g,'')}">Call or WhatsApp: ${contacts.phone}</a><br><a class="contact-email" href="mailto:${contacts.email}">${contacts.email}</a>`;
  });
})();
