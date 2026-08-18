const CFG=window.DLLI_CONFIG||{},API_URL=CFG.API_URL||'', $=s=>document.querySelector(s);
let token=sessionStorage.getItem('dlli_admin_token')||'';
let admin=sessionStorage.getItem('dlli_admin_name')||'';
let adminRole=sessionStorage.getItem('dlli_admin_role')||'';
let registrations=[],reportRows=[],clubs=[];

function ready(){return API_URL&&!API_URL.includes('PASTE_YOUR')}
function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function loadBtn(b,on,t='Please wait'){if(!b)return;if(on){b.dataset.old=b.innerHTML;b.classList.add('loading');b.innerHTML=`<span class="spinner"></span>${t}`}else{b.classList.remove('loading');b.innerHTML=b.dataset.old||b.innerHTML}}
function msg(el,type,text,html=false){if(!el)return;el.className=`status-box show status-${type}`;html?el.innerHTML=text:el.textContent=text}
function toast(text,type='info'){const el=$('#toast');if(!el)return;el.textContent=text;el.className=`toast show toast-${type}`;clearTimeout(window.__dlliToast);window.__dlliToast=setTimeout(()=>el.className='toast',3200)}
function badge(s){const c=String(s||'pending').toLowerCase();return `<span class="badge ${esc(c)}">${esc(s||'PENDING')}</span>`}
function canWrite(){return String(adminRole||'').toUpperCase()!=='VIEWER'}

function configureAttendanceAdmin(s={}){const url=String(s.ATTENDANCE_URL||'').trim(),text=String(s.ATTENDANCE_BUTTON_TEXT||'Attendance').trim()||'Attendance',openNew=String(s.ATTENDANCE_OPEN_NEW_TAB||'YES').toUpperCase()==='YES';const valid=/^https?:\/\//i.test(url);['#attendanceTopBtn'].forEach(sel=>{const el=$(sel);if(!el)return;if(valid){el.href=url;el.target=openNew?'_blank':'_self';el.textContent=text;el.classList.remove('hidden')}else el.classList.add('hidden')});const side=$('#attendanceAdminBtn');if(side){if(valid){side.classList.remove('hidden');side.textContent='Open '+text;side.onclick=()=>openNew?window.open(url,'_blank','noopener'):location.assign(url)}else{side.classList.add('hidden');side.onclick=null}}}

async function get(action,p={}){if(!ready())throw Error('Set Apps Script Web App URL in config.js first.');const u=new URL(API_URL);u.searchParams.set('action',action);if(token)u.searchParams.set('token',token);Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v??''));const r=await fetch(u.toString(),{redirect:'follow'}),j=await r.json();if(!j.ok){if(/expired admin session|unauthorized/i.test(j.message||''))forceLogout();throw Error(j.message||'Request failed')}return j}
async function post(action,d={}){if(!ready())throw Error('Set Apps Script Web App URL in config.js first.');const body=new URLSearchParams({action,...d});if(token)body.set('token',token);const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,redirect:'follow'}),j=await r.json();if(!j.ok){if(/expired admin session|unauthorized/i.test(j.message||''))forceLogout();throw Error(j.message||'Request failed')}return j}
function forceLogout(){sessionStorage.removeItem('dlli_admin_token');sessionStorage.removeItem('dlli_admin_name');sessionStorage.removeItem('dlli_admin_role');token='';admin='';adminRole='';$('#adminView')?.classList.add('hidden');$('#loginView')?.classList.remove('hidden')}

function openAdmin(){
  $('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden');
  $('#adminIdentity').textContent=`${admin}${adminRole?' • '+adminRole:''}`;
  if(!canWrite())document.body.classList.add('viewer-mode');else document.body.classList.remove('viewer-mode');
  loadDashboard();get('adminGetSettings').then(r=>configureAttendanceAdmin(r.settings||{})).catch(()=>{});
}

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('#loginBtn');loadBtn(b,true,'Logging in');try{const d=Object.fromEntries(new FormData(e.currentTarget).entries()),r=await post('adminLogin',d);token=r.token;admin=r.admin.name;adminRole=r.admin.role||'ADMIN';sessionStorage.setItem('dlli_admin_token',token);sessionStorage.setItem('dlli_admin_name',admin);sessionStorage.setItem('dlli_admin_role',adminRole);openAdmin();toast('Login successful.','success')}catch(x){msg($('#loginMsg'),'error',x.message)}finally{loadBtn(b,false)}})
$('#logoutBtn').onclick=async()=>{try{await post('adminLogout')}catch{}forceLogout();location.reload()};

document.querySelectorAll('.side-menu button[data-panel]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.side-menu button[data-panel]').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));$('#panel-'+b.dataset.panel).classList.add('active');
  $('#topTitle').textContent=b.textContent;
  if(b.dataset.panel==='dashboard')loadDashboard();
  if(b.dataset.panel==='registrations')loadRegistrations();
  if(b.dataset.panel==='clubs')loadClubs();
  if(b.dataset.panel==='sessions')loadSessions();
  if(b.dataset.panel==='faculty')loadFaculty();
  if(b.dataset.panel==='reports')loadReports();
  if(b.dataset.panel==='settings')loadSettings();
});

async function loadDashboard(){
  try{
    const r=await get('adminDashboard'),s=r.stats;
    $('#stTotal').textContent=s.total;$('#stPending').textContent=s.pending;$('#stApproved').textContent=s.approved;$('#stWaiting').textContent=s.waiting;$('#stRejected').textContent=s.rejected;
    renderBreakdown('#genderBreakdown',r.gender);renderBreakdown('#regionBreakdown',r.region);renderBreakdown('#zoneBreakdown',r.zone);renderBreakdown('#clubBreakdown',r.club);
    $('#recentBody').innerHTML=(r.recent||[]).map(x=>`<tr><td>${esc(x.Registration_ID)}</td><td>${esc(x.Full_Name)}</td><td>${esc(x.Club_Name)}</td><td>${esc(x.Mobile)}</td><td>${badge(x.Status)}</td></tr>`).join('')||'<tr><td colspan="5">No registrations yet.</td></tr>';
  }catch(e){toast(e.message,'error')}
}
function renderBreakdown(sel,rows=[]){const el=$(sel);el.innerHTML=rows.length?rows.map(x=>`<div class="breakdown-row"><span title="${esc(x.label)}">${esc(x.label)}</span><strong>${esc(x.count)}</strong></div>`).join(''):'<div class="hint">No data yet.</div>'}

async function loadRegistrations(){try{const r=await get('adminListRegistrations');registrations=r.rows||[];renderRegs()}catch(e){toast(e.message,'error')}}
function renderRegs(){const f=$('#regFilter').value,q=$('#regSearch').value.toLowerCase();const rows=registrations.filter(x=>(f==='ALL'||x.Status===f)&&(!q||[x.Full_Name,x.Lions_ID,x.Club_Name,x.Mobile,x.Registration_ID,x.DLLI_ID].join(' ').toLowerCase().includes(q)));$('#regsBody').innerHTML=rows.map(x=>`<tr><td>${esc(x.Registration_ID)}${x.DLLI_ID?`<br><small>${esc(x.DLLI_ID)}</small>`:''}</td><td>${esc(x.Full_Name)}</td><td>${esc(x.Lions_ID)}</td><td>${esc(x.Club_Name)}</td><td>${esc(x.Mobile)}</td><td>${badge(x.Status)}</td><td><div class="row-actions"><button class="btn btn-outline mini" onclick="viewReg('${esc(x.Registration_ID)}')">View / Edit</button>${canWrite()?`<button class="btn btn-success mini" onclick="setReg('${esc(x.Registration_ID)}','APPROVED')">Approve</button><button class="btn btn-light mini" onclick="setReg('${esc(x.Registration_ID)}','WAITING_LIST')">Waiting</button><button class="btn btn-danger mini" onclick="setReg('${esc(x.Registration_ID)}','REJECTED')">Reject</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="7">No matching registrations.</td></tr>'}
$('#regFilter').onchange=renderRegs;$('#regSearch').oninput=renderRegs;
window.setReg=async(id,status)=>{if(!canWrite()){toast('Viewer account cannot make changes.','error');return}let rejectedReason='';if(status==='REJECTED'){rejectedReason=prompt('Reason for rejection (optional):','')||'';}if(!confirm(`Change ${id} to ${status}?`))return;try{const r=await post('adminUpdateRegistration',{registrationId:id,status,rejectedReason});toast(status==='APPROVED'&&r.dlliId?`Approved • ${r.dlliId}`:`Status changed to ${status}`,'success');await loadRegistrations();await loadDashboard()}catch(e){toast(e.message,'error')}};

window.viewReg=async id=>{
  try{
    if(!clubs.length){const cr=await get('adminListClubs');clubs=cr.rows||[];}
    const r=await get('adminGetRegistration',{registrationId:id}),x=r.registration,p=r.participant||{};
    $('#editRegistrationId').value=id;
    const fields=[
      {l:'Lions ID',n:'lionsId',v:x.Lions_ID,ro:true},{l:'Full Name',n:'fullName',v:x.Full_Name},{l:'Club Name',n:'clubName',v:x.Club_Name,type:'club'},
      {l:'Current Position',n:'currentPosition',v:p.Current_Position},{l:'Mobile',n:'mobile',v:x.Mobile},{l:'Email',n:'email',v:x.Email,type:'email'},
      {l:'Gender',n:'gender',v:p.Gender,type:'select',opts:['','Male','Female','Other']},{l:'T-shirt Size',n:'tshirtSize',v:p.Tshirt_Size,type:'select',opts:['','S','M','L','XL','XXL','XXXL']},
      {l:'Food Preference',n:'foodPreference',v:p.Food_Preference,type:'select',opts:['','Vegetarian','Non-Vegetarian','Other']},{l:'Accommodation',n:'accommodationRequired',v:p.Accommodation_Required||'NO',type:'select',opts:['NO','YES']},
      {l:'Emergency Contact Name',n:'emergencyName',v:p.Emergency_Contact_Name},{l:'Emergency Contact Number',n:'emergencyNumber',v:p.Emergency_Contact_Number},
      {l:'Previous Leadership Training',n:'previousTraining',v:p.Previous_Leadership_Training,full:true},{l:'Remarks',n:'remarks',v:x.Remarks,full:true}
    ];
    $('#regDetailFields').innerHTML=fields.map(f=>fieldHtml(f)).join('')+`<div class="field full"><label>Current Status</label><div>${badge(x.Status)} ${x.DLLI_ID?`<strong style="margin-left:8px">${esc(x.DLLI_ID)}</strong>`:''}</div></div>`;
    $('#registrationModal').classList.add('show');$('#regModalMsg').className='status-box';
  }catch(e){toast(e.message,'error')}
};
function fieldHtml(f){let control;if(f.type==='select')control=`<select name="${f.n}" ${!canWrite()?'disabled':''}>${f.opts.map(o=>`<option value="${esc(o)}" ${String(o)===String(f.v||'')?'selected':''}>${esc(o||'Select')}</option>`).join('')}</select>`;else if(f.type==='club')control=`<select name="${f.n}" ${!canWrite()?'disabled':''}>${clubsForSelect(f.v)}</select>`;else if(f.full&&f.n==='remarks')control=`<textarea name="${f.n}" ${!canWrite()?'readonly':''}>${esc(f.v)}</textarea>`;else control=`<input name="${f.n}" type="${f.type||'text'}" value="${esc(f.v)}" ${f.ro||!canWrite()?'readonly':''}>`;return `<div class="field ${f.full?'full':''}"><label>${esc(f.l)}</label>${control}</div>`}
function clubsForSelect(current){const source=clubs.length?clubs:[];if(!source.length)return `<option selected>${esc(current||'')}</option>`;return source.filter(x=>!x.Status||x.Status==='ACTIVE').sort((a,b)=>a.Club_Name.localeCompare(b.Club_Name)).map(x=>`<option value="${esc(x.Club_Name)}" ${x.Club_Name===current?'selected':''}>${esc(x.Club_Name)}</option>`).join('')}
$('#regModalClose').onclick=()=>$('#registrationModal').classList.remove('show');
$('#regEditForm').addEventListener('submit',async e=>{e.preventDefault();if(!canWrite())return;const b=$('#saveRegEdit');loadBtn(b,true,'Saving');try{const d=Object.fromEntries(new FormData(e.currentTarget).entries());await post('adminEditRegistration',d);toast('Registration updated.','success');await loadRegistrations();$('#registrationModal').classList.remove('show')}catch(x){msg($('#regModalMsg'),'error',x.message)}finally{loadBtn(b,false)}});
$('#approveFromModal').onclick=()=>modalSetStatus('APPROVED');$('#waitingFromModal').onclick=()=>modalSetStatus('WAITING_LIST');$('#rejectFromModal').onclick=()=>modalSetStatus('REJECTED');
async function modalSetStatus(status){const id=$('#editRegistrationId').value;if(!id)return;$('#registrationModal').classList.remove('show');await window.setReg(id,status)}

$('#refreshDashboard').onclick=loadDashboard;$('#refreshRegs').onclick=loadRegistrations;

async function loadClubs(){try{const r=await get('adminListClubs');clubs=r.rows||[];renderClubSummary(r.summary||{});$('#clubsBody').innerHTML=clubs.map(x=>`<tr><td>${esc(x.Club_ID)}</td><td>${esc(x.Club_Name)}</td><td>${esc(x.Club_Number)}</td><td>${esc(x.Region)}</td><td>${esc(x.Zone)}</td><td>${badge(x.Status||'ACTIVE')}</td></tr>`).join('')||'<tr><td colspan="6">No clubs found.</td></tr>'}catch(e){toast(e.message,'error')}}
function renderClubSummary(s){$('#clubTotal').textContent=s.total||0;$('#clubActive').textContent=s.active||0;$('#clubMissing').textContent=s.missingId||0;$('#clubMissingStatus').textContent=s.missingStatus||0;const warns=[];if((s.duplicateClubNumbers||[]).length)warns.push(`Duplicate Club Number: ${s.duplicateClubNumbers.join(', ')}`);if((s.duplicateClubNames||[]).length)warns.push(`Duplicate Club Name: ${s.duplicateClubNames.join(', ')}`);if((s.duplicateClubIds||[]).length)warns.push(`Duplicate Club ID: ${s.duplicateClubIds.join(', ')}`);if(warns.length)msg($('#clubWarnings'),'warning',warns.map(esc).join('<br>'),true);else{$('#clubWarnings').className='status-box';$('#clubWarnings').innerHTML=''}}
$('#refreshClubs').onclick=loadClubs;
$('#setupClubsBtn').onclick=async()=>{if(!canWrite()){toast('Viewer account cannot make changes.','error');return}if(!confirm('Fill only missing Club_ID, Status and Created_At? Existing club data will not be changed.'))return;const b=$('#setupClubsBtn');loadBtn(b,true,'Updating');try{const r=await post('adminSetupClubs');toast(`Done: ${r.idsCreated} Club IDs, ${r.statusesFilled} statuses, ${r.createdDatesFilled} dates filled.`,'success');await loadClubs()}catch(e){toast(e.message,'error')}finally{loadBtn(b,false)}};

async function loadSessions(){try{const r=await get('adminListSessions');$('#sessionsBody').innerHTML=(r.rows||[]).map(x=>`<tr><td>${esc(x.Session_Number)}</td><td>${esc(x.Session_Title)}</td><td>${esc(x.Date)}</td><td>${esc(x.Start_Time)} - ${esc(x.End_Time)}</td><td>${esc(x.Faculty_Name)}</td><td>${esc(x.Hall)}</td><td>${badge(x.Status)}</td></tr>`).join('')||'<tr><td colspan="7">No sessions.</td></tr>'}catch(e){toast(e.message,'error')}}
async function loadFaculty(){try{const r=await get('adminListFaculty');$('#facultyBody').innerHTML=(r.rows||[]).map(x=>`<tr><td>${esc(x.Faculty_ID)}</td><td>${esc(x.Faculty_Name)}</td><td>${esc(x.Designation)}</td><td>${esc(x.Club_Name)}</td><td>${esc(x.Phone)}</td><td>${badge(x.Status)}</td></tr>`).join('')||'<tr><td colspan="6">No faculty.</td></tr>'}catch(e){toast(e.message,'error')}}

async function loadSettings(){try{const r=await get('adminGetSettings');const keys=['SYSTEM_NAME','INSTITUTE_NAME','INSTITUTE_YEAR','INSTITUTE_DATE_FROM','INSTITUTE_DATE_TO','VENUE','VENUE_MAP_URL','REGISTRATION_OPEN','REGISTRATION_DEADLINE','MAX_PARTICIPANTS','CONTACT_PHONE','CONTACT_EMAIL','WHATSAPP_NUMBER','LOGO_URL','NOTICE_MARQUEE','MARQUEE_SPEED','MARQUEE_BOLD','MARQUEE_TEXT_COLOR','MARQUEE_BG_COLOR','MARQUEE_FONT_SIZE','MARQUEE_DIRECTION','ATTENDANCE_URL','ATTENDANCE_BUTTON_TEXT','ATTENDANCE_OPEN_NEW_TAB','SYSTEM_STATUS','VERSION'];$('#settingsGrid').innerHTML=keys.map(k=>`<div class="field"><label>${esc(k.replaceAll('_',' '))}</label>${['REGISTRATION_OPEN','SYSTEM_STATUS','MARQUEE_BOLD','MARQUEE_DIRECTION','ATTENDANCE_OPEN_NEW_TAB'].includes(k)?selectSetting(k,r.settings[k]||''): `<input data-setting="${k}" value="${esc(r.settings[k]||'')}" ${k==='VERSION'?'readonly':''}>`}</div>`).join('');configureAttendanceAdmin(r.settings||{});if(!canWrite())document.querySelectorAll('[data-setting]').forEach(x=>x.disabled=true)}catch(e){toast(e.message,'error')}}
function selectSetting(k,v){let opts;if(k==='SYSTEM_STATUS')opts=['ACTIVE','MAINTENANCE'];else if(k==='MARQUEE_DIRECTION')opts=['LEFT','RIGHT'];else opts=['YES','NO'];return `<select data-setting="${k}" ${!canWrite()?'disabled':''}>${opts.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select>`}
$('#saveSettingsBtn').onclick=async()=>{if(!canWrite()){toast('Viewer account cannot make changes.','error');return}const b=$('#saveSettingsBtn'),obj={};document.querySelectorAll('[data-setting]').forEach(x=>obj[x.dataset.setting]=x.value);loadBtn(b,true,'Saving');try{await post('adminSaveSettings',{settings:JSON.stringify(obj)});configureAttendanceAdmin(obj);toast('Settings saved.','success')}catch(e){toast(e.message,'error')}finally{loadBtn(b,false)}};

function openModal(title,fields,onSave){if(!canWrite()){toast('Viewer account cannot make changes.','error');return}$('#modalTitle').textContent=title;$('#modalFields').innerHTML=fields.map(f=>`<div class="field ${f.full?'full':''}"><label>${esc(f.label)}</label>${f.type==='select'?`<select name="${f.name}">${f.options.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`:f.type==='textarea'?`<textarea name="${f.name}"></textarea>`:`<input name="${f.name}" type="${f.type||'text'}" ${f.required?'required':''}>`}</div>`).join('');$('#dataModal').classList.add('show');$('#modalMsg').className='status-box';$('#modalForm').onsubmit=async e=>{e.preventDefault();const b=$('#modalSave');loadBtn(b,true,'Saving');try{await onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));$('#dataModal').classList.remove('show');e.currentTarget.reset();toast('Saved successfully.','success')}catch(x){msg($('#modalMsg'),'error',x.message)}finally{loadBtn(b,false)}}}
$('#modalClose').onclick=()=>$('#dataModal').classList.remove('show');
$('#addSessionBtn').onclick=()=>openModal('Add Session',[{label:'Session Number',name:'sessionNumber',required:true},{label:'Session Title',name:'sessionTitle',required:true},{label:'Description',name:'sessionDescription',type:'textarea',full:true},{label:'Date',name:'date',type:'date',required:true},{label:'Start Time',name:'startTime',type:'time',required:true},{label:'End Time',name:'endTime',type:'time'},{label:'Faculty Name',name:'facultyName'},{label:'Hall',name:'hall'},{label:'Attendance Required',name:'attendanceRequired',type:'select',options:['YES','NO']},{label:'Status',name:'status',type:'select',options:['ACTIVE','INACTIVE','COMPLETED','CANCELLED']}],async d=>{await post('adminSaveSession',d);await loadSessions()});
$('#addFacultyBtn').onclick=()=>openModal('Add Faculty',[{label:'Lions ID',name:'lionsId'},{label:'Faculty Name',name:'facultyName',required:true},{label:'Designation',name:'designation'},{label:'Club Name',name:'clubName'},{label:'Phone',name:'phone'},{label:'Email',name:'email',type:'email'},{label:'Biography',name:'biography',type:'textarea',full:true},{label:'Status',name:'status',type:'select',options:['ACTIVE','INACTIVE']}],async d=>{await post('adminSaveFaculty',d);await loadFaculty()});

async function loadReports(){try{const r=await get('adminReportData');reportRows=r.rows||[];fillReportFilters();renderReports()}catch(e){toast(e.message,'error')}}
function fillReportFilters(){const fill=(sel,vals)=>{const el=$(sel),cur=el.value;el.innerHTML='<option value="ALL">All</option>'+[...new Set(vals.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if([...el.options].some(o=>o.value===cur))el.value=cur};fill('#reportRegion',reportRows.map(x=>x.Region));fill('#reportZone',reportRows.map(x=>x.Zone))}
function filteredReports(){const st=$('#reportStatus').value,rg=$('#reportRegion').value,zn=$('#reportZone').value,q=$('#reportSearch').value.toLowerCase();return reportRows.filter(x=>(st==='ALL'||x.Status===st)&&(rg==='ALL'||x.Region===rg)&&(zn==='ALL'||x.Zone===zn)&&(!q||[x.Full_Name,x.Club_Name,x.Lions_ID,x.DLLI_ID,x.Mobile].join(' ').toLowerCase().includes(q)))}
function renderReports(){const rows=filteredReports();$('#reportCount').textContent=`Showing ${rows.length} of ${reportRows.length} records`;$('#reportsBody').innerHTML=rows.map(x=>`<tr><td>${esc(x.DLLI_ID)}</td><td>${esc(x.Full_Name)}</td><td>${esc(x.Lions_ID)}</td><td>${esc(x.Club_Name)}</td><td>${esc(x.Region)}</td><td>${esc(x.Zone)}</td><td>${esc(x.Current_Position)}</td><td>${esc(x.Mobile)}</td><td>${badge(x.Status)}</td></tr>`).join('')||'<tr><td colspan="9">No matching records.</td></tr>'}
['#reportStatus','#reportRegion','#reportZone'].forEach(s=>$(s).onchange=renderReports);$('#reportSearch').oninput=renderReports;
$('#exportExcelBtn').onclick=()=>{const rows=filteredReports();if(!rows.length){toast('No records to export.','error');return}if(typeof XLSX==='undefined'){toast('Excel library could not load.','error');return}const exportData=rows.map(x=>({
  'Registration ID':x.Registration_ID,'DLLI ID':x.DLLI_ID,'Status':x.Status,'Lions ID':x.Lions_ID,'Full Name':x.Full_Name,'Club Name':x.Club_Name,'Club ID':x.Club_ID,'Region':x.Region,'Zone':x.Zone,'Current Position':x.Current_Position,'Mobile':x.Mobile,'Email':x.Email,'Gender':x.Gender,'T-shirt Size':x.Tshirt_Size,'Food Preference':x.Food_Preference,'Accommodation':x.Accommodation_Required,'Submitted At':x.Submitted_At,'Approved By':x.Approved_By,'Approved At':x.Approved_At,'Remarks':x.Remarks
}));const ws=XLSX.utils.json_to_sheet(exportData),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'DLLI Report');XLSX.writeFile(wb,`DLLI_Report_${new Date().toISOString().slice(0,10)}.xlsx`);toast('Excel report generated.','success')};

(async()=>{if(token){try{const r=await get('adminValidate');admin=r.admin.name;adminRole=r.admin.role||adminRole||'ADMIN';sessionStorage.setItem('dlli_admin_role',adminRole);openAdmin()}catch{forceLogout()}}})();
