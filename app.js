const CFG = window.DLLI_CONFIG || {};
const API_URL = CFG.API_URL || '';
const $ = s => document.querySelector(s);
let publicClubs = [];
let currentSettings = {};

function apiReady(){return API_URL && !API_URL.includes('PASTE_YOUR');}
function esc(v){return String(v ?? '').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function setBtnLoading(btn,on,text){if(!btn)return;if(on){btn.dataset.old=btn.innerHTML;btn.classList.add('loading');btn.innerHTML=`<span class="spinner"></span>${text||'Please wait'}`;}else{btn.classList.remove('loading');btn.innerHTML=btn.dataset.old||btn.innerHTML;}}
function showBox(el,type,msg){if(!el)return;el.className=`status-box show status-${type}`;el.innerHTML=msg;}
function toast(msg,type='info'){const el=$('#toast');if(!el)return;el.textContent=msg;el.className=`toast show toast-${type}`;clearTimeout(window.__dlliToast);window.__dlliToast=setTimeout(()=>el.className='toast',3200);}
function validHttpUrl(v){return /^https?:\/\//i.test(String(v||'').trim());}
function digits(v){return String(v||'').replace(/\D/g,'');}
function setText(sel,value,fallback=''){const el=$(sel);if(el)el.textContent=value||fallback;}

function finishInitialPageLoad(){
  document.body.classList.remove('dlli-data-loading');
  const loader=document.getElementById('dlliInitialLoader');
  if(loader)loader.remove();
}


async function apiGet(action,params={}){if(!apiReady())throw new Error('API URL is not configured in config.js');const u=new URL(API_URL);u.searchParams.set('action',action);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v??''));const r=await fetch(u.toString(),{redirect:'follow'});const j=await r.json();if(!j.ok)throw new Error(j.message||'Request failed');return j;}
async function apiPost(action,data={}){if(!apiReady())throw new Error('API URL is not configured in config.js');const body=new URLSearchParams({action,...data});const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,redirect:'follow'});const j=await r.json();if(!j.ok)throw new Error(j.message||'Request failed');return j;}

function applyMarqueeSettings(s){
  const box=$('#marqueeBox'), track=$('#noticeMarquee'); if(!box||!track)return;
  const speed=Math.max(5,Number(s.MARQUEE_SPEED||65));
  const size=Math.max(10,Math.min(36,Number(s.MARQUEE_FONT_SIZE||17)));
  box.style.background=s.MARQUEE_BG_COLOR||'#FFF4E5';
  track.style.color=s.MARQUEE_TEXT_COLOR||'#B00020';
  track.style.fontWeight=String(s.MARQUEE_BOLD||'YES').toUpperCase()==='YES'?'800':'400';
  track.style.fontSize=size+'px';
  track.style.animationDuration=speed+'s';
  track.style.animationName=String(s.MARQUEE_DIRECTION||'LEFT').toUpperCase()==='RIGHT'?'scrollRight':'scrollLeft';
}

function configureAttendance(s){
  const url=String(s.ATTENDANCE_URL||'').trim();
  const text=String(s.ATTENDANCE_BUTTON_TEXT||'Attendance').trim()||'Attendance';
  const openNew=String(s.ATTENDANCE_OPEN_NEW_TAB||'YES').toUpperCase()==='YES';
  ['#attendanceNavBtn','#attendanceHeroBtn'].forEach(sel=>{
    const el=$(sel); if(!el)return;
    if(validHttpUrl(url)){
      el.href=url; el.classList.remove('hidden');
      el.target=openNew?'_blank':'_self';
      el.textContent=sel.includes('Hero')?`Open ${text}`:text;
    }else{
      el.classList.add('hidden'); el.removeAttribute('href');
    }
  });
}

function configureBranding(s){
  const logo=validHttpUrl(s.LOGO_URL)?String(s.LOGO_URL).trim():'logo.png';
  document.querySelectorAll('[data-dlli-logo]').forEach(img=>{img.src=logo;img.onerror=()=>{img.onerror=null;img.src='logo.png';};});
  const institute=s.INSTITUTE_NAME||'District Lions Leadership Institute';
  const district=s.DISTRICT_NAME||'Lions International District 325 F';
  setText('#heroTitle',institute);
  setText('#brandTitle',institute);
  setText('#districtNameTop',district);
  setText('#footerDistrict',district);
  setText('#systemStatusText',s.SYSTEM_NAME||'DLLI Management System');
}

function configureVenueAndContact(s){
  const mapBtn=$('#venueMapBtn');
  if(mapBtn){
    if(validHttpUrl(s.VENUE_MAP_URL)){mapBtn.href=String(s.VENUE_MAP_URL).trim();mapBtn.classList.remove('hidden');mapBtn.target='_blank';}
    else{mapBtn.classList.add('hidden');mapBtn.removeAttribute('href');}
  }

  const phone=String(s.CONTACT_PHONE||'').trim();
  const email=String(s.CONTACT_EMAIL||'').trim();
  const whatsapp=String(s.WHATSAPP_NUMBER||'').trim();
  const contactSection=$('#contact');
  let visible=false;

  const phoneWrap=$('#phoneContact');
  if(phoneWrap){
    if(phone){visible=true;phoneWrap.classList.remove('hidden');$('#contactPhoneText').textContent=phone;$('#contactPhoneLink').href='tel:'+digits(phone);}
    else phoneWrap.classList.add('hidden');
  }

  const emailWrap=$('#emailContact');
  if(emailWrap){
    if(email){visible=true;emailWrap.classList.remove('hidden');$('#contactEmailText').textContent=email;$('#contactEmailLink').href='mailto:'+email;}
    else emailWrap.classList.add('hidden');
  }

  const waWrap=$('#whatsappContact');
  if(waWrap){
    if(whatsapp){
      visible=true;waWrap.classList.remove('hidden');$('#contactWhatsappText').textContent=whatsapp;
      const href=validHttpUrl(whatsapp)?whatsapp:'https://wa.me/'+digits(whatsapp);
      $('#contactWhatsappLink').href=href;$('#contactWhatsappLink').target='_blank';
    } else waWrap.classList.add('hidden');
  }
  if(contactSection)contactSection.classList.toggle('hidden',!visible);
  const contactNav=$('#contactNavBtn'); if(contactNav)contactNav.classList.toggle('hidden',!visible);
}

function configureCapacity(stats,s){
  stats=stats||{};
  const max=Number(stats.maxParticipants||s.MAX_PARTICIPANTS||0);
  const approved=Number(stats.approved||0);
  const pending=Number(stats.pending||0);
  const remaining=stats.remaining===null||stats.remaining===undefined?(max>0?Math.max(0,max-approved):null):Number(stats.remaining);
  setText('#maxParticipants',max>0?String(max):'Open');
  setText('#approvedCount',String(approved));
  setText('#remainingSeats',remaining===null?'Open':String(remaining));
  setText('#remainingSeatsMini',remaining===null?'Open':String(remaining));
  setText('#pendingCount',String(pending));

  const summary=$('#capacitySummary');
  if(summary){
    summary.classList.remove('hidden');
    summary.innerHTML=max>0
      ? `<strong>Participant Capacity:</strong> ${esc(max)} &nbsp;•&nbsp; <strong>Approved:</strong> ${esc(approved)} &nbsp;•&nbsp; <strong>Remaining:</strong> ${esc(remaining)}${pending?` &nbsp;•&nbsp; <strong>Pending:</strong> ${esc(pending)}`:''}`
      : `<strong>Participant Capacity:</strong> Open`;
  }
}

function configureSystemStatus(s,stats){
  const maintenance=String(s.SYSTEM_STATUS||'ACTIVE').toUpperCase()==='MAINTENANCE';
  const registrationOpen=String(s.REGISTRATION_OPEN||'YES').toUpperCase()==='YES';
  const max=Number(stats?.maxParticipants||s.MAX_PARTICIPANTS||0);
  const approved=Number(stats?.approved||0);
  const full=max>0 && approved>=max;
  const btn=$('#submitBtn');
  const registerHero=$('#registerHeroBtn');
  const banner=$('#maintenanceBanner');

  if(banner){banner.classList.toggle('hidden',!maintenance);}
  let status='Open';
  if(maintenance)status='Maintenance'; else if(full)status='Full'; else if(!registrationOpen)status='Closed';
  setText('#regStatus',status);

  if(btn){
    const disabled=maintenance||!registrationOpen||full;
    btn.disabled=disabled;
    btn.textContent=maintenance?'System Under Maintenance':full?'Participant Capacity Full':!registrationOpen?'Registration Closed':'Submit Registration';
  }
  if(registerHero){
    registerHero.classList.toggle('disabled-link',maintenance||!registrationOpen||full);
    registerHero.setAttribute('aria-disabled',maintenance||!registrationOpen||full?'true':'false');
  }
}

async function loadPublic(){
  try{
    const r=await apiGet('getPublicData');
    const s=r.settings||{}; currentSettings=s;
    publicClubs=r.clubs||[];
    configureBranding(s);
    $('#noticeMarquee').textContent=s.NOTICE_MARQUEE||'Welcome to District Lions Leadership Institute';
    $('#venue').textContent=s.VENUE||'To be announced';
    $('#deadline').textContent=s.REGISTRATION_DEADLINE||'To be announced';
    const f=s.INSTITUTE_DATE_FROM||'',t=s.INSTITUTE_DATE_TO||'';
    $('#instituteDate').textContent=f?(t&&t!==f?`${f} – ${t}`:f):'To be announced';
    applyMarqueeSettings(s);
    configureAttendance(s);
    configureVenueAndContact(s);
    configureCapacity(r.registrationStats||{},s);
    configureSystemStatus(s,r.registrationStats||{});

    const select=$('#clubSelect');
    select.innerHTML='<option value="">Select Club</option>';
    publicClubs.forEach(c=>{const o=document.createElement('option');o.value=c.Club_Name;o.textContent=c.Club_Name;select.appendChild(o);});
    renderSchedule(r.sessions||[]);
  }catch(e){console.warn(e.message);toast(e.message,'error');}
  finally{finishInitialPageLoad();}
}

function renderSchedule(rows){const b=$('#scheduleBody');if(!rows.length){b.innerHTML='<tr><td colspan="6">No schedule published yet.</td></tr>';return;}b.innerHTML=rows.map(x=>`<tr><td>${esc(x.Session_Number)}</td><td>${esc(x.Session_Title)}</td><td>${esc(x.Date)}</td><td>${esc(x.Start_Time)}${x.End_Time?' - '+esc(x.End_Time):''}</td><td>${esc(x.Faculty_Name)}</td><td>${esc(x.Hall)}</td></tr>`).join('');}

$('#clubSelect').addEventListener('change',e=>{const c=publicClubs.find(x=>x.Club_Name===e.target.value)||{};$('#regionDisplay').value=c.Region||'';$('#zoneDisplay').value=c.Zone||'';});

$('#registrationForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,btn=$('#submitBtn'),box=$('#registrationMessage');
  if(btn.disabled)return;
  if(!form.reportValidity())return;
  setBtnLoading(btn,true,'Submitting');
  try{
    const d=Object.fromEntries(new FormData(form).entries());
    const r=await apiPost('registerParticipant',d);
    showBox(box,'success',`<strong>Registration submitted successfully.</strong><br>Registration ID: <strong>${esc(r.registrationId)}</strong><br>Status: ${esc(r.status)}<br><small>Please save your Registration ID for future reference.</small>`);
    toast('Registration submitted successfully.','success');
    form.reset();$('#regionDisplay').value='';$('#zoneDisplay').value='';
    box.scrollIntoView({behavior:'smooth',block:'center'});
    loadPublic();
  }catch(err){showBox(box,'error',esc(err.message));toast(err.message,'error');}
  finally{setBtnLoading(btn,false);}
});

$('#checkBtn').addEventListener('click',async()=>{
  const key=$('#checkKey').value.trim(),btn=$('#checkBtn'),box=$('#checkResult');
  if(!key){showBox(box,'warning','Please enter Lions ID, mobile number, Registration ID or DLLI ID.');return;}
  setBtnLoading(btn,true,'Checking');
  try{
    const r=await apiGet('checkRegistration',{key});const x=r.registration;
    const type=x.Status==='APPROVED'?'success':x.Status==='REJECTED'?'error':'info';
    showBox(box,type,`<strong>${esc(x.Full_Name)}</strong><br>Club: ${esc(x.Club_Name)}<br>Registration ID: ${esc(x.Registration_ID)}<br>Status: <strong>${esc(x.Status)}</strong>${x.DLLI_ID?`<br>DLLI ID: <strong>${esc(x.DLLI_ID)}</strong>`:''}${x.Rejected_Reason?`<br>Reason: ${esc(x.Rejected_Reason)}`:''}`);
  }catch(err){showBox(box,'error',esc(err.message));}
  finally{setBtnLoading(btn,false);}
});

$('#checkKey').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#checkBtn').click();}});
document.addEventListener('DOMContentLoaded',loadPublic);
