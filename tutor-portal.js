/* tutor-portal.js
   Tutor Portal for LearnBridge (University of Johannesburg)
   SINGLE STORAGE KEY: 'learnbridge_data' (shared with admin-portal.js & student-portal.js)
   Features implemented:
   - Left-side dashboard (Pending, Upcoming, Completed, Cancelled, Availability, Profile, Notifications)
   - Booking Requests manager (accept/decline/reschedule/complete/no-show)
   - Availability editor (days/time ranges, online/in-person preferences)
   - Profile editor (name, department, modules, bio, contact)
   - Notifications center (in-memory + stored under tutorData[tutorId].notifications)
   - Sessions history and export
   - Uses same unified storage structure and updates tutoringRequests entries
   - Starts empty (0 requests, 0 tutors) if storage empty
*/

(() => {
  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  /* ---------- Utilities ---------- */
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* ---------- Storage helpers ---------- */
  function loadDB(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[],
      "audit":[],
      "sessions":{},
      "tutorData":{},
      "studentData":{},
      "counsellorData":{},
      "tutoringRequests":[],
      "counsellingRequests":[]
    }`);
  }
  function saveDB(db){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

  function loadUsers(){ return loadDB().users || []; }
  function saveUsers(users){ const db = loadDB(); db.users = users; saveDB(db); }

  function loadTutoring(){ const db = loadDB(); db.tutoringRequests = db.tutoringRequests || []; return db.tutoringRequests; }
  function saveTutoring(list){ const db = loadDB(); db.tutoringRequests = list; saveDB(db); }

  function loadTutorData(){ const db = loadDB(); db.tutorData = db.tutorData || {}; return db.tutorData; }
  function saveTutorData(obj){ const db = loadDB(); db.tutorData = Object.assign(db.tutorData || {}, obj); saveDB(db); }

  function recordAudit(action, by='tutor', details=''){
    const db = loadDB(); db.audit = db.audit || []; db.audit.unshift({ id: uid(), action, by, details, time: now() }); saveDB(db);
  }

  /* ---------- Ensure DB exists ---------- */
  if(!localStorage.getItem(STORAGE_KEY)){
    saveDB({ users: [], audit: [], sessions: {}, tutorData:{}, studentData:{}, counsellorData:{}, tutoringRequests:[], counsellingRequests:[] });
  }

  /* ---------- Simple auth simulation (pick a tutor) ---------- */
  // For demo purposes the tutor portal allows selecting one of the existing tutor users to 'sign in'.
  function getFirstTutor(){ return loadUsers().find(u=>u.role==='tutor') || null; }

  /* ---------- Build UI ---------- */
  function buildUI(){
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{ --theme:${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial; }
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(135deg,#001, #061);color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}
        .portal{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.98);box-shadow:0 12px 35px rgba(0,0,0,.18)}
        .side{width:260px;background:linear-gradient(180deg,var(--theme),#222);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:10px 0}
        .side h2{text-align:center;margin:0;padding:12px;font-size:1.05rem;border-bottom:1px solid rgba(255,255,255,.06)}
        .nav{display:flex;flex-direction:column;padding:6px 0}
        .nav button{background:none;border:none;color:#fff;padding:12px 18px;text-align:left;cursor:pointer;font-size:14px;border-top:1px solid rgba(255,255,255,.03)}
        .nav button.active, .nav button:hover{background:rgba(255,255,255,0.06)}
        .content{flex:1;padding:18px;overflow:auto;max-height:calc(100vh - 48px)}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .tag{padding:6px 10px;border-radius:8px;background:#f2f2f2;font-size:13px}
        .card{background:var(--panel);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:14px;margin-bottom:14px}
        .cards{display:flex;gap:12px;flex-wrap:wrap}
        .card .title{font-weight:700;margin-bottom:6px}
        .card .big{font-size:1.6rem;font-weight:800;color:var(--theme)}
        .small-muted{font-size:13px;color:var(--muted)}
        .search-row{display:flex;gap:10px;align-items:center;margin:8px 0}
        input[type="text"], select, input[type="datetime-local"], textarea {padding:8px;border-radius:8px;border:1px solid #ddd}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
        .btn{padding:8px 10px;border-radius:8px;border:none;cursor:pointer}
        .btn.primary{background:var(--theme);color:#fff}
        .btn.ghost{background:transparent;border:1px solid #ddd}
        .btn.warn{background:#ff4d4f;color:#fff}
        .flex{display:flex;gap:8px;align-items:center}
        .tabs{display:flex;gap:8px;margin-bottom:12px}
        .tab{padding:8px 12px;border-radius:8px;background:#f5f5f5;cursor:pointer}
        .tab.active{background:var(--theme);color:#fff}
        .muted{color:var(--muted)}
        .empty{padding:18px;border:2px dashed #eee;border-radius:10px;text-align:center;color:var(--muted)}
        .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999}
        .modal{background:#fff;padding:18px;border-radius:12px;max-width:720px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)}
        .row{display:flex;gap:10px}
        @media(max-width:900px){ .portal{flex-direction:column} .side{width:100%;order:2} .content{order:1} .cards{flex-direction:column} }
      </style>
    `);

    document.body.innerHTML = `
      <div style="width:100%;max-width:1200px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px" onerror="this.style.display='none'"/>
          <div style="color:#fff;font-weight:700;font-size:1.2rem">University of Johannesburg — Tutor Portal</div>
        </div>
      </div>

      <div class="portal" id="portalRoot">
        <aside class="side">
          <div>
            <h2>LearnBridge Tutor</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="requests">🔔 Booking Requests</button>
              <button class="nav-btn" data-view="schedule">📅 Availability</button>
              <button class="nav-btn" data-view="profile">👤 Profile</button>
              <button class="nav-btn" data-view="notifications">🔔 Notifications</button>
              <button class="nav-btn" data-view="history">📚 Sessions History</button>
            </div>
          </div>
          <div style="padding:12px;color:rgba(255,255,255,.85)">
            <div style="margin-bottom:8px">Tutor • UJ</div>
            <div style="font-size:12px">Signed in as: <span id="tutorNameMuted">—</span></div>
            <div style="margin-top:8px"><button id="signOutBtn" class="btn" style="width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);color:#fff">🔒 Sign out</button></div>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Tutor Portal</strong> <span class="muted">— Manage booking requests & availability</span></div>
            <div class="flex">
              <div class="tag">${UNI_KEY.toUpperCase()}</div>
              <div class="tag" id="timeTag">${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    setInterval(()=>{ const el = document.getElementById('timeTag'); if(el) el.textContent = new Date().toLocaleString(); },1000);
  }

  /* ---------- Routing ---------- */
  function render(){
    renderSidebarHandlers();
    // auto sign-in demo: pick first tutor if exists
    const t = getFirstTutor();
    if(t){ signInAsTutor(t.id); }
    showView('dashboard');
  }

  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn=>btn.addEventListener('click', ()=>{ $$('.nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); showView(btn.dataset.view); }));
  }

  function showView(view){ const container = $('#viewContainer'); if(!container) return; if(view==='dashboard') renderDashboard(); else if(view==='requests') renderRequestsView(); else if(view==='schedule') renderAvailabilityView(); else if(view==='profile') renderProfileView(); else if(view==='notifications') renderNotificationsView(); else if(view==='history') renderHistoryView(); else container.innerHTML = `<div class="card"><h3>Coming Soon</h3></div>`; }

  /* ---------- Tutor context ---------- */
  let CURRENT_TUTOR_ID = null;
  function signInAsTutor(tutorId){ CURRENT_TUTOR_ID = tutorId; const users = loadUsers(); const u = users.find(x=>x.id===tutorId) || {}; document.getElementById('tutorNameMuted').textContent = u.name || '—'; ensureTutorProfileExists(tutorId); }
  function signOut(){ CURRENT_TUTOR_ID = null; document.getElementById('tutorNameMuted').textContent = '—'; }

  document.addEventListener('click', (e)=>{ if(e.target && e.target.id==='signOutBtn'){ signOut(); alert('Signed out (demo)'); } });

  function ensureTutorProfileExists(id){ const db = loadDB(); db.tutorData = db.tutorData || {}; if(!db.tutorData[id]){ db.tutorData[id] = { profile:{}, availability:[], notifications:[], stats:{}, settings:{} }; saveDB(db); } }

  /* ---------- DASHBOARD ---------- */
  function renderDashboard(){
    const requests = loadTutoring();
    const myReq = requests.filter(r=>r.personId===CURRENT_TUTOR_ID);
    const counts = {
      pending: myReq.filter(r=>r.status==='pending').length,
      accepted: myReq.filter(r=>r.status==='accepted').length,
      upcoming: myReq.filter(r=>new Date(r.datetime)>new Date() && ['accepted'].includes(r.status)).length,
      completed: myReq.filter(r=>r.status==='completed').length,
      cancelled: myReq.filter(r=>r.status==='cancelled' || r.status==='no-show').length
    };

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <div style="font-size:1.1rem;font-weight:700">Dashboard</div>
            <div class="small-muted">Summary of your tutoring activity</div>
          </div>
          <div class="flex"><button id="openReqBtn" class="btn primary">Manage Requests ➜</button></div>
        </div>

        <div class="cards">
          <div class="card" style="min-width:160px;flex:1"><div class="title">🕒 Pending</div><div class="big">${counts.pending}</div><div class="small-muted">New student requests</div></div>
          <div class="card" style="min-width:160px;flex:1"><div class="title">📅 Upcoming</div><div class="big">${counts.upcoming}</div><div class="small-muted">Accepted sessions</div></div>
          <div class="card" style="min-width:160px;flex:1"><div class="title">✅ Completed</div><div class="big">${counts.completed}</div><div class="small-muted">Finished sessions</div></div>
          <div class="card" style="min-width:140px;flex:0 0 160px"><div class="title">❌ Cancelled</div><div class="big">${counts.cancelled}</div><div class="small-muted">Cancelled / no-shows</div></div>
        </div>
      </div>
    `;

    $('#openReqBtn').onclick = ()=>{ $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='requests')); showView('requests'); };
  }

  /* ---------- Booking Requests View ---------- */
  function renderRequestsView(){
    const all = loadTutoring();
    const mine = all.filter(r=>r.personId===CURRENT_TUTOR_ID).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Booking Requests</div>
          <div class="small-muted">Manage incoming student requests</div>
        </div>
        <button id="backDashReq" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div class="tabs" id="reqTabs">
          <div class="tab active" data-tab="pending">🕒 Pending</div>
          <div class="tab" data-tab="accepted">✅ Accepted</div>
          <div class="tab" data-tab="completed">📚 Completed</div>
          <div class="tab" data-tab="cancelled">❌ Cancelled</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px">
          <input id="reqSearch" placeholder="Search by student, module, date…" style="flex:1" />
          <button id="reqRefresh" class="btn">🔄</button>
        </div>

        <div id="reqBody" style="margin-top:12px"></div>
      </div>
    `;

    $('#backDashReq').onclick = ()=> showView('dashboard');
    $('#reqRefresh').onclick = ()=> drawReqTab(getActiveTab());
    $('#reqSearch').oninput = ()=> drawReqTab(getActiveTab());

    $$('#reqTabs .tab').forEach(t=> t.onclick = ()=>{ $$('#reqTabs .tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); drawReqTab(t.dataset.tab); });

    drawReqTab('pending');

    function getActiveTab(){ const t = $('#reqTabs .tab.active'); return t? t.dataset.tab : 'pending'; }

    function drawReqTab(tab){
      const body = $('#reqBody'); if(!body) return;
      const q = ($('#reqSearch')?.value || '').toLowerCase();
      let list = mine.slice();
      if(tab==='pending') list = list.filter(x=>x.status==='pending');
      if(tab==='accepted') list = list.filter(x=>x.status==='accepted');
      if(tab==='completed') list = list.filter(x=>x.status==='completed');
      if(tab==='cancelled') list = list.filter(x=>x.status==='cancelled' || x.status==='no-show');
      if(q) list = list.filter(x=> (x.studentName + ' ' + (x.module||'') + ' ' + (x.comment||'')).toLowerCase().includes(q));

      if(list.length===0){ body.innerHTML = `<div class="empty">No ${tab} requests.</div>`; return; }

      body.innerHTML = `
        <table>
          <thead><tr><th>Created</th><th>Session</th><th>Student</th><th>Module</th><th>Comment</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(x=>`<tr data-id="${x.id}"><td>${formatDate(x.createdAt)}</td><td>${formatDate(x.datetime)}</td><td>${escapeHtml(x.studentName)}<br><small>${escapeHtml(x.studentId||'')}</small></td><td>${escapeHtml(x.module||'—')}</td><td>${escapeHtml((x.comment||'').slice(0,120))}</td><td>
              ${renderActionsForStatus(x)}
            </td></tr>`).join('')}
          </tbody>
        </table>
      `;

      // attach handlers
      $$('#reqBody button[data-act]').forEach(b=> b.addEventListener('click', () => handleAction(b.dataset.act, b.closest('tr').dataset.id)));
    }

    function renderActionsForStatus(x){
      if(x.status==='pending') return `<button class="btn primary" data-act="accept">Accept</button> <button class="btn" data-act="decline">Decline</button> <button class="btn" data-act="view">View</button>`;
      if(x.status==='accepted') return `<button class="btn primary" data-act="complete">Mark Complete</button> <button class="btn warn" data-act="no-show">No-show</button> <button class="btn" data-act="reschedule">Reschedule</button> <button class="btn" data-act="view">View</button>`;
      return `<button class="btn" data-act="view">View</button>`;
    }

    function handleAction(action, id){
      const all = loadTutoring(); const idx = all.findIndex(a=>a.id===id); if(idx===-1) return alert('Request not found'); const item = all[idx];
      if(action==='accept'){
        all[idx].status = 'accepted'; all[idx].updated = true; saveTutoring(all); recordAudit('Tutor accepted request', CURRENT_TUTOR_ID, id); drawReqTab(getActiveTab()); notifyStudent(item.studentId, `Your tutoring request (${item.module||'—'}) was accepted by tutor.`); alert('Accepted');
      }
      else if(action==='decline'){
        const reason = prompt('Optional reason for decline (will be sent to student)') || 'Declined by tutor'; all[idx].status='cancelled'; all[idx].comment = (all[idx].comment || '') + '\nTutor Decline: ' + reason; saveTutoring(all); recordAudit('Tutor declined request', CURRENT_TUTOR_ID, id); drawReqTab(getActiveTab()); notifyStudent(item.studentId, `Your tutoring request was declined: ${reason}`); alert('Declined'); }
      else if(action==='complete'){
        all[idx].status='completed'; all[idx].completedAt=now(); saveTutoring(all); recordAudit('Tutor marked completed', CURRENT_TUTOR_ID, id); drawReqTab(getActiveTab()); notifyStudent(item.studentId, `Your tutoring session has been marked completed.`); alert('Marked completed'); }
      else if(action==='no-show'){
        all[idx].status='no-show'; saveTutoring(all); recordAudit('Tutor marked no-show', CURRENT_TUTOR_ID, id); drawReqTab(getActiveTab()); notifyStudent(item.studentId, `Session marked as no-show by tutor.`); alert('Marked no-show'); }
      else if(action==='reschedule'){
        const dt = prompt('Enter new date-time (YYYY-MM-DD HH:MM)') || ''; if(!dt) return; const iso = (new Date(dt)).toISOString(); all[idx].datetime = iso; all[idx].status='accepted'; saveTutoring(all); recordAudit('Tutor rescheduled', CURRENT_TUTOR_ID, id); drawReqTab(getActiveTab()); notifyStudent(item.studentId, `Your session was rescheduled to ${formatDate(iso)} by the tutor.`); alert('Rescheduled'); }
      else if(action==='view'){
        showRequestModal(item);
      }
    }

  }

  function showRequestModal(item){
    const m = document.createElement('div'); m.className='modal-back';
    m.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">Request Details</div><button class="btn" id="closeReqX">✖</button></div>
        <div style="margin-top:10px">
          <p><b>Student:</b> ${escapeHtml(item.studentName)} (${escapeHtml(item.studentId||'')})</p>
          <p><b>Module:</b> ${escapeHtml(item.module||'—')}</p>
          <p><b>Date/Time:</b> ${formatDate(item.datetime)}</p>
          <p><b>Duration:</b> ${escapeHtml(item.durationMinutes||'60')} mins</p>
          <p><b>Comment:</b> ${escapeHtml(item.comment||'—')}</p>
          <p><b>Status:</b> ${escapeHtml(item.status)}</p>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn" id="closeReqClose">Close</button></div>
      </div>
    `;
    document.body.appendChild(m);
    $('#closeReqX').onclick = () => m.remove(); $('#closeReqClose').onclick = () => m.remove();
  }

  /* ---------- Notify student (simple) ---------- */
  function notifyStudent(studentId, message){ const db = loadDB(); db.studentData = db.studentData || {}; if(!studentId) return; db.studentData[studentId] = db.studentData[studentId] || {}; db.studentData[studentId].notifications = db.studentData[studentId].notifications || []; db.studentData[studentId].notifications.unshift({ id: uid(), message, time: now(), read:false }); saveDB(db); }

  /* ---------- Availability Editor ---------- */
  function renderAvailabilityView(){
    const tutorData = loadTutorData(); const td = tutorData[CURRENT_TUTOR_ID] || { availability:[], profile:{}};
    const avail = (td.availability || []).slice();

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-size:1.2rem;font-weight:700">Availability</div><div class="small-muted">Set when students can book you</div></div><button id="backDashSch" class="btn ghost">← Dashboard</button></div>
      <div class="card">
        <div style="margin-bottom:10px"><button id="addSlot" class="btn primary">Add Availability Slot</button></div>
        <div id="availBody"></div>
      </div>
    `;

    $('#backDashSch').onclick = ()=> showView('dashboard');
    $('#addSlot').onclick = ()=> openAddAvailModal();

    drawAvailList();

    function drawAvailList(){ const out = $('#availBody'); if(!out) return; if(avail.length===0) { out.innerHTML = `<div class="empty">No availability set. Students will see you as unavailable.</div>`; return; } out.innerHTML = `
        <table><thead><tr><th>Day</th><th>From</th><th>To</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>
          ${avail.map((s, i)=>`<tr data-idx="${i}"><td>${escapeHtml(s.day)}</td><td>${escapeHtml(s.from)}</td><td>${escapeHtml(s.to)}</td><td>${escapeHtml(s.type||'online')}</td><td><button class="btn" data-act="edit" data-idx="${i}">Edit</button> <button class="btn warn" data-act="del" data-idx="${i}">Delete</button></td></tr>`).join('')}
        </tbody></table>
      `; $$('#availBody button[data-act]').forEach(b=> b.onclick = ()=>{ const act = b.dataset.act; const idx = parseInt(b.dataset.idx,10); if(act==='edit') openEditAvailModal(idx); else if(act==='del'){ if(confirm('Delete slot?')){ avail.splice(idx,1); saveAvail(); drawAvailList(); } } }); }

    function saveAvail(){ const db = loadDB(); db.tutorData = db.tutorData || {}; db.tutorData[CURRENT_TUTOR_ID] = db.tutorData[CURRENT_TUTOR_ID] || {}; db.tutorData[CURRENT_TUTOR_ID].availability = avail; saveDB(db); recordAudit('Updated availability', CURRENT_TUTOR_ID); }

    function openAddAvailModal(){ const m=document.createElement('div'); m.className='modal-back'; m.innerHTML = `
        <div class="modal"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">Add Availability</div><button class="btn" id="closeAdd">✖</button></div>
        <div style="margin-top:10px"><label>Day</label><br><select id="a_day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select>
        <div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1"><label>From (HH:MM)</label><br><input id="a_from" type="time" /></div><div style="flex:1"><label>To (HH:MM)</label><br><input id="a_to" type="time" /></div></div>
        <div style="margin-top:8px"><label>Type</label><br><select id="a_type"><option value="online">Online</option><option value="in-person">In person</option><option value="both">Both</option></select></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" id="a_cancel">Cancel</button><button class="btn primary" id="a_save">Save</button></div>
        </div></div>`; document.body.appendChild(m); $('#closeAdd').onclick = ()=> m.remove(); $('#a_cancel').onclick = ()=> m.remove(); $('#a_save').onclick = ()=>{ const slot = { day: $('#a_day').value, from: $('#a_from').value, to: $('#a_to').value, type: $('#a_type').value }; if(!slot.from||!slot.to) return alert('Please enter from/to'); avail.push(slot); saveAvail(); drawAvailList(); m.remove(); } }

    function openEditAvailModal(idx){ const s = avail[idx]; const m=document.createElement('div'); m.className='modal-back'; m.innerHTML = `
      <div class="modal"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">Edit Availability</div><button class="btn" id="closeEdit">✖</button></div>
      <div style="margin-top:10px"><label>Day</label><br><select id="e_day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select>
      <div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1"><label>From (HH:MM)</label><br><input id="e_from" type="time" /></div><div style="flex:1"><label>To (HH:MM)</label><br><input id="e_to" type="time" /></div></div>
      <div style="margin-top:8px"><label>Type</label><br><select id="e_type"><option value="online">Online</option><option value="in-person">In person</option><option value="both">Both</option></select></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" id="e_cancel">Cancel</button><button class="btn primary" id="e_save">Save</button></div>
      </div></div>`; document.body.appendChild(m); $('#e_day').value = s.day; $('#e_from').value = s.from; $('#e_to').value = s.to; $('#e_type').value = s.type||'online'; $('#closeEdit').onclick = ()=> m.remove(); $('#e_cancel').onclick = ()=> m.remove(); $('#e_save').onclick = ()=>{ avail[idx] = { day: $('#e_day').value, from: $('#e_from').value, to: $('#e_to').value, type: $('#e_type').value }; saveAvail(); drawAvailList(); m.remove(); } }

  }

  /* ---------- Profile Editor ---------- */
  function renderProfileView(){
    const users = loadUsers(); const me = users.find(u=>u.id===CURRENT_TUTOR_ID) || {}; const td = loadTutorData(); const pdata = (td[CURRENT_TUTOR_ID] && td[CURRENT_TUTOR_ID].profile) || {};

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-size:1.2rem;font-weight:700">Profile</div><div class="small-muted">Your public tutor profile</div></div><button id="backDashProf" class="btn ghost">← Dashboard</button></div>
      <div class="card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex:1">
            <label>Full name</label><br><input id="p_name" style="width:100%" value="${escapeHtml(me.name||pdata.name||'')}" />
            <div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1"><label>Department</label><br><input id="p_dept" style="width:100%" value="${escapeHtml(me.department||pdata.department||'')}"/></div><div style="flex:1"><label>Modules (comma separated)</label><br><input id="p_mods" style="width:100%" value="${escapeHtml(pdata.modules||me.modules||'')}"/></div></div>
            <div style="margin-top:8px"><label>Bio</label><br><textarea id="p_bio" rows="4" style="width:100%">${escapeHtml(pdata.bio||'')}</textarea></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn" id="p_cancel">Cancel</button><button class="btn primary" id="p_save">Save Profile</button></div>
          </div>
          <div style="width:220px;text-align:center">
            <div class="card" style="padding:12px"><div class="small-muted">Profile preview</div><h3 id="previewName">${escapeHtml(me.name||pdata.name||'—')}</h3><div id="previewDept" class="small-muted">${escapeHtml(me.department||pdata.department||'—')}</div><div style="margin-top:8px" id="previewMods">${escapeHtml(pdata.modules||me.modules||'—')}</div></div>
          </div>
        </div>
      </div>
    `;

    $('#backDashProf').onclick = ()=> showView('dashboard');
    $('#p_cancel').onclick = ()=> renderProfileView();
    $('#p_name').oninput = ()=> $('#previewName').textContent = $('#p_name').value;
    $('#p_dept').oninput = ()=> $('#previewDept').textContent = $('#p_dept').value;
    $('#p_mods').oninput = ()=> $('#previewMods').textContent = $('#p_mods').value;

    $('#p_save').onclick = ()=>{
      const db = loadDB(); db.tutorData = db.tutorData || {}; db.tutorData[CURRENT_TUTOR_ID] = db.tutorData[CURRENT_TUTOR_ID] || {}; db.tutorData[CURRENT_TUTOR_ID].profile = { name: $('#p_name').value, department: $('#p_dept').value, modules: $('#p_mods').value, bio: $('#p_bio').value }; 
      // also update users table if exists
      db.users = db.users || []; const idx = db.users.findIndex(u=>u.id===CURRENT_TUTOR_ID); if(idx!==-1){ db.users[idx].name = $('#p_name').value; db.users[idx].department = $('#p_dept').value; db.users[idx].modules = $('#p_mods').value; }
      saveDB(db); recordAudit('Updated tutor profile', CURRENT_TUTOR_ID); alert('Profile saved'); renderProfileView();
    };
  }

  /* ---------- Notifications View ---------- */
  function renderNotificationsView(){
    const td = loadTutorData(); const my = (td[CURRENT_TUTOR_ID] && td[CURRENT_TUTOR_ID].notifications) || [];
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-size:1.2rem;font-weight:700">Notifications</div><div class="small-muted">Recent alerts and messages</div></div><button id="backDashNot" class="btn ghost">← Dashboard</button></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div></div><div><button id="markAllRead" class="btn">Mark All Read</button></div></div>
        <div id="notBody"></div>
      </div>
    `;

    $('#backDashNot').onclick = ()=> showView('dashboard'); $('#markAllRead').onclick = ()=>{ markAllRead(); renderNotificationsView(); };

    const out = $('#notBody'); if(!out) return; if(my.length===0){ out.innerHTML = `<div class="empty">You have no notifications.</div>`; return; }
    out.innerHTML = `<ul style="list-style:none;padding:0;margin:0">${my.map(n=>`<li style="padding:10px;border-bottom:1px solid #eee"><div style="font-weight:600">${escapeHtml(n.message)}</div><div class="small-muted">${formatDate(n.time)}</div></li>`).join('')}</ul>`;
  }

  function markAllRead(){ const db = loadDB(); db.tutorData = db.tutorData || {}; if(!db.tutorData[CURRENT_TUTOR_ID]) return; (db.tutorData[CURRENT_TUTOR_ID].notifications||[]).forEach(n=>n.read=true); saveDB(db); }

  /* ---------- Sessions History ---------- */
  function renderHistoryView(){
    const all = loadTutoring(); const mine = all.filter(r=>r.personId===CURRENT_TUTOR_ID).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-size:1.2rem;font-weight:700">Sessions History</div><div class="small-muted">All sessions & exports</div></div><button id="backDashHist" class="btn ghost">← Dashboard</button></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div></div><div><button id="exportCSV" class="btn">Export CSV</button></div></div>
        <div id="histBody"></div>
      </div>
    `;

    $('#backDashHist').onclick = ()=> showView('dashboard'); $('#exportCSV').onclick = ()=> exportCSV(mine);

    const out = $('#histBody'); if(!out) return; if(mine.length===0){ out.innerHTML = `<div class="empty">No sessions yet.</div>`; return; }
    out.innerHTML = `
      <table>
        <thead><tr><th>Created</th><th>Session</th><th>Student</th><th>Module</th><th>Status</th></tr></thead>
        <tbody>${mine.map(r=>`<tr><td>${formatDate(r.createdAt)}</td><td>${formatDate(r.datetime)}</td><td>${escapeHtml(r.studentName)}</td><td>${escapeHtml(r.module||'—')}</td><td>${escapeHtml(r.status)}</td></tr>`).join('')}</tbody>
      </table>
    `;
  }

  function exportCSV(list){ if(!list || list.length===0) return alert('No data'); const rows = [ ['id','createdAt','datetime','studentName','studentId','module','durationMinutes','status','comment'] ]; list.forEach(r=> rows.push([r.id, r.createdAt, r.datetime, r.studentName, r.studentId||'', r.module||'', r.durationMinutes||'', r.status, (r.comment||'').replace(/\n/g,' / ')])); const csv = rows.map(r=> r.map(cell=>`"${String(cell||'').replace(/"/g,'""')}"`).join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download = `tutor_sessions_${CURRENT_TUTOR_ID||'me'}.csv`; a.click(); URL.revokeObjectURL(url); }

  /* ---------- Modal helpers ---------- */
  function showSimpleModal(title, html){ const m = document.createElement('div'); m.className='modal-back'; m.innerHTML = `<div class="modal"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">${title}</div><button class="btn" id="closeX">✖</button></div><div style="margin-top:10px">${html}</div></div>`; document.body.appendChild(m); $('#closeX').onclick = ()=> m.remove(); }

  /* ---------- Init ---------- */
  buildUI(); render();

  // Expose small helpers for testing
  window.LearnBridgeTutorPortal = {
    signInAsTutor: (id)=>{ signInAsTutor(id); render(); },
    getCurrentTutor: ()=> CURRENT_TUTOR_ID
  };

})();
