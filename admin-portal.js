/* admin-portal.js
   Admin Dashboard with Unified LearnBridge Storage
   SINGLE STORAGE KEY: 'learnbridge_data'
   Structure:
   {
     users: [],
     audit: [],
     sessions: {},
     tutorData: {},
     studentData: {},
     counsellorData: {},
   }
*/

(() => {

  /* ---------- Unified Storage ---------- */
  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[],
      "audit":[],
      "sessions":{},
      "tutorData":{},
      "studentData":{},
      "counsellorData":{}
    }`);
  }

  function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  /* Users */
  function loadUsers(){
    return loadDB().users || [];
  }

  function saveUsers(users){
    const db = loadDB();
    db.users = users;
    saveDB(db);
  }

  /* Audit */
  function loadAudit(){
    return loadDB().audit || [];
  }

  function saveAudit(a){
    const db = loadDB();
    db.audit = a;
    saveDB(db);
  }

  function recordAudit(action, by='admin', details=''){
    const db = loadDB();
    db.audit.unshift({
      id: uid(),
      action,
      by,
      details,
      time: now()
    });
    saveDB(db);
  }

   /* ---------- RATINGS STORAGE ---------- */

function loadRatings(){
  const db = loadDB();
  db.ratings = db.ratings || [];
  return db.ratings;
}

function saveRatings(list){
  const db = loadDB();
  db.ratings = list;
  saveDB(db);
}


  /* ---------- Utility ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';

  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/[&<>"']/g, c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  /* ---------- Initialize Single DB if empty ---------- */
  if(!localStorage.getItem(STORAGE_KEY)){
    saveDB({
      users: [],
      audit: [],
      sessions: {},
      tutorData: {},
      studentData: {},
      counsellorData: {},
      ratings: []
    });
  }

  /* ---------- Replace Page with Dashboard UI ---------- */
  function buildUI(){
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{ --theme:${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(135deg,#001, #061);color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;}
        .admin-dashboard{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.97);box-shadow:0 12px 35px rgba(0,0,0,.18);}
        .side{width:260px;background:linear-gradient(180deg,var(--theme),#222);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:12px 0}
        .side h2{text-align:center;margin:0;padding:12px;font-size:1.05rem;border-bottom:1px solid rgba(255,255,255,.06)}
        .nav{display:flex;flex-direction:column;padding:6px 0}
        .nav button{background:none;border:none;color:#fff;padding:12px 18px;text-align:left;cursor:pointer;font-size:14px;border-top:1px solid rgba(255,255,255,.03)}
        .nav button.active, .nav button:hover{background:rgba(255,255,255,0.06)}
        .content{flex:1;padding:18px;overflow:auto;max-height:calc(100vh - 48px)}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .mini{display:flex;gap:10px;align-items:center}
        .tag{padding:6px 10px;border-radius:8px;background:#f2f2f2;font-size:13px}
        .card{background:var(--panel);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:14px;margin-bottom:14px}
        .cards{display:flex;gap:12px;flex-wrap:wrap}
        .card .title{font-weight:700;margin-bottom:6px}
        .card .big{font-size:1.6rem;font-weight:800;color:var(--theme)}
        .small-muted{font-size:13px;color:var(--muted)}
        .search-row{display:flex;gap:10px;align-items:center;margin:8px 0}
        input[type="text"], select {padding:8px;border-radius:8px;border:1px solid #ddd}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
        th.sortable{cursor:pointer}
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
        @media(max-width:900px){ .admin-dashboard{flex-direction:column} .side{width:100%;order:2} .content{order:1} .cards{flex-direction:column} }
      </style>
    `);

    document.body.innerHTML = `
      <div style="width:100%;max-width:1200px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px" onerror="this.style.display='none'"/>
          <div style="color:#fff;font-weight:700;font-size:1.2rem">University of Johannesburg — Admin Portal</div>
        </div>
      </div>

      <div class="admin-dashboard" id="adminDashboardRoot">
        <aside class="side">
          <div>
            <h2>LearnBridge Admin</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="manage-users">👥 Manage Users</button>
              <button class="nav-btn" data-view="reports">🧾 Reports</button>
              <button class="nav-btn" data-view="settings">⚙️ Settings</button>
            </div>
          </div>
          <div style="padding:12px;">
            <div style="margin-bottom:8px;color:rgba(255,255,255,.85)">Admin • UJ</div>
            <button id="logoutBtn" class="btn" style="width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);color:#fff">🔒 Logout</button>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Admin Portal</strong> <span class="muted">—Manage Users, Activity & System Status</span></div>
            <div class="mini">
              <div class="tag">${UNI_KEY.toUpperCase()}</div>
              <div class="tag" id="timeTag">${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    // Update time every 1 second (live clock)
    setInterval(()=>{ const el = document.getElementById('timeTag'); if(el) el.textContent = new Date().toLocaleString(); },1000);
  }

  /* ---------- Rendering Views ---------- */
  function render(){
    renderSidebarHandlers();
    showView('dashboard');
  }

  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        showView(view);
      });
    });
   
   
  }

  function showView(view, opts = {}){
    const container = $('#viewContainer');
    if(!container) return;
    if(view === 'dashboard') renderDashboard();
    else if(view === 'manage-users') renderManageUsers(opts && opts.tab ? opts.tab : 'all');
    else if (view === 'tutoring-requests') showTutoringRequestsView();
    else if (view === 'counselling-requests') showCounsellingRequestsView();
    else if (view === 'ratings') showRatingsView();
    else container.innerHTML = `<div class="card"><h3>Coming Soon</h3><p class="muted">Reports & settings will be added later.</p></div>`;
  }

  /* ---------- DASHBOARD ---------- */
  function renderDashboard(){
    const users = loadUsers();
    const counts = {
      students: users.filter(u=>u.role==='student').length,
      tutors: users.filter(u=>u.role==='tutor').length,
      counsellors: users.filter(u=>u.role==='counsellor').length,
      suspended: users.filter(u=>u.suspended).length,
      newThisWeek: users.filter(u=>{
        if(!u.created) return false;
        const created = new Date(u.created);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
        return created >= weekAgo;
      }).length
    };

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <div style="font-size:1.1rem;font-weight:700">Dashboard</div>
            <div class="small-muted">Summary of platform usage and performance</div>
          </div>
          <div class="flex">
            <button id="openManageBtn" class="btn primary">Go to Manage Users ➜</button>
          </div>
        </div>

        <div class="cards">
          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="students">
            <div class="title">👩‍🎓 Students</div>
            <div class="big">${counts.students}</div>
            <div class="small-muted">${counts.newThisWeek} new this week</div>
          </div>

          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="tutors">
            <div class="title">🧑‍🏫 Tutors</div>
            <div class="big">${counts.tutors}</div>
            <div class="small-muted">${counts.newThisWeek>0?counts.newThisWeek+' new':'0 new'}</div>
          </div>

          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="counsellors">
            <div class="title">💬 Counsellors</div>
            <div class="big">${counts.counsellors}</div>
            <div class="small-muted">Monitoring & support</div>
          </div>

          <div class="card" style="min-width:140px;flex:0 0 160px;cursor:pointer" data-target="suspended">
            <div class="title">⛔ Suspended</div>
            <div class="big">${counts.suspended}</div>
            <div class="small-muted">Review suspensions</div>
          </div>

          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="ratings">
          <div class="title">⭐ Ratings</div>
          <div class="big">${loadRatings().length}</div>
          <div class="small-muted">New student reviews</div>
          </div>

        </div>
      </div>
       ` ;


    // card click -> open Manage Users with tab and filter
    $$('.card[data-target]').forEach(c=>{
      c.addEventListener('click', () => {
        const t = c.dataset.target;
        // map to tabs: students -> students, tutors -> tutors, counsellors -> counsellors, suspended -> all (with suspended filter)
        if(t === 'suspended') showView('manage-users', {tab:'all', q:'', filter:{suspended:true}});
        else showView('manage-users', {tab:'all', q:'', filter:{role:t.slice(0,-1) || t}}); // crude mapping
        // activate sidebar manage-users
        $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='manage-users'));
      });
    });

    $('#openManageBtn').addEventListener('click', () => {
      showView('manage-users', {tab:'all'});
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='manage-users'));
    });

  renderTutoringSmallBox();
  renderCounsellingSmallBox();


  }


   /* ---------- TUTORING REQUESTS MODULE (EMPTY / CLEAN VERSION) ---------- */
/*
   Works with unified storage "learnbridge_data"
   NO SAMPLE DATA — starts 100% empty
*/

/* ---------- Tutoring Storage ---------- */

function loadTutoring(){
  const db = loadDB();
  db.tutoringRequests = db.tutoringRequests || [];
  return db.tutoringRequests;
}

function saveTutoring(list){
  const db = loadDB();
  db.tutoringRequests = list;
  saveDB(db);
}

/* ---------- Initialize Tutoring Module ---------- */

function initTutoringModule(){

  // ensure tutoringRequests array exists (empty)
  const db = loadDB();
  if (!db.tutoringRequests) {
    db.tutoringRequests = [];
    saveDB(db);
  }

  // Add sidebar button once UI loads
  setTimeout(() => {
    const nav = document.querySelector('.side .nav');
    if (!nav) return;

    if (!nav.querySelector('[data-view="tutoring-requests"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.view = 'tutoring-requests';
      btn.textContent = '📚 Tutoring Requests';
      nav.appendChild(btn);
      renderSidebarHandlers();
    }

    // Show empty tutoring box in dashboard
    renderTutoringSmallBox();
  }, 150);
}

/* ---------- Small Dashboard Box ---------- */

function renderTutoringSmallBox(){
  const container = document.querySelector('#viewContainer');
  if(!container) return;

  const cards = container.querySelector('.cards');
  if(!cards) return;

  const old = cards.querySelector('.tutoring-small-box');
  if(old) old.remove();

  const data = loadTutoring();

  const counts = {
    pending: data.filter(x=>x.status==='pending').length,
    cancelled: data.filter(x=>x.status==='cancelled' || x.status==='no-show').length,
    completed: data.filter(x=>x.status==='completed').length,
    upcoming: data.filter(x=>new Date(x.datetime) > new Date()).length,
    followUp: data.filter(x=>x.followUp).length,
    updated: data.filter(x=>x.updated).length,
  };

  const card = document.createElement('div');
  card.className = 'card tutoring-small-box';
  card.style.minWidth = "220px";
  card.style.cursor = "pointer";

  card.innerHTML = `
    <div class="title">📚 Tutoring Requests</div>
    <div style="margin-top:10px;font-size:0.9rem;">
      <div><b>${counts.pending}</b> pending</div>
      <div><b>${counts.cancelled}</b> cancelled / no-show</div>
      <div><b>${counts.completed}</b> completed</div>
      <div><b>${counts.upcoming}</b> upcoming</div>
      <div><b>${counts.followUp}</b> follow-up</div>
      <div><b>${counts.updated}</b> updated</div>
    </div>
    <div class="small-muted" style="margin-top:8px">Click to manage ➜</div>
  `;

  card.onclick = () => {
    $$('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view==='tutoring-requests')
    );
    showView('tutoring-requests');
  };

  cards.appendChild(card);
}

/* ---------- Compute Remaining Time ---------- */

function computeRemaining(iso){
  if(!iso) return "—";
  const nowD = new Date();
  const t = new Date(iso);
  const diff = t - nowD;
  if(diff <= 0) return "Now or past";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

/* ---------- Main Tutoring View ---------- */

function showTutoringRequestsView(){
  const c = document.querySelector('#viewContainer');
  if(!c) return;

  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div>
        <div style="font-size:1.2rem;font-weight:700">Tutoring Requests</div>
        <div class="small-muted">Manage all tutoring session requests</div>
      </div>

      <button id="backDashX" class="btn ghost">← Dashboard</button>
    </div>

    <div class="card">

      <div class="tabs" id="tutTabs">
        <div class="tab active" data-tab="pending">🕒 Pending</div>
        <div class="tab" data-tab="completed">✅ Completed</div>
        <div class="tab" data-tab="cancelled">❌ Cancelled</div>
        <div class="tab" data-tab="upcoming">📅 Upcoming</div>
        <div class="tab" data-tab="followup">🔁 Follow-up</div>
        <div class="tab" data-tab="updated">✏️ Updated</div>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="tutSearch" placeholder="Search…" style="flex:1" />
        <select id="tutFilterType">
          <option value="">All types</option>
          <option value="online">Online</option>
          <option value="in-person">In person</option>
        </select>
        <button id="tutRefresh" class="btn">🔄</button>
        <button id="tutDownload" class="btn">⬇️ Download</button>
      </div>

      <div id="tutBody" style="margin-top:10px"></div>
    </div>
  `;

  $('#backDashX').onclick = () => showView('dashboard');
  $('#tutRefresh').onclick = () => drawTutTab(getActiveTab());
  $('#tutDownload').onclick = () => openTutDownloadPopup();
  $('#tutSearch').oninput = () => drawTutTab(getActiveTab());

  $$('#tutTabs .tab').forEach(t =>
    t.onclick = () => {
      $$('#tutTabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      drawTutTab(t.dataset.tab);
    }
  );

  drawTutTab("pending");

  function getActiveTab(){
    const t = $('#tutTabs .tab.active');
    return t ? t.dataset.tab : "pending";
  }
}

/* ---------- Table Renderer ---------- */

function drawTutTab(tab){
  const body = document.querySelector('#tutBody');
  if(!body) return;

  const search = ($('#tutSearch')?.value || "").toLowerCase();
  const typeF = $('#tutFilterType')?.value || "";

  let list = loadTutoring().slice();

  // filters
  if(typeF) list = list.filter(x=> (x.sessionType||"") === typeF);
  if(search){
    list = list.filter(x =>
      [x.studentName,x.studentNumber,x.tutorName,x.tutorEmail,x.module,x.comment]
      .join(" ").toLowerCase().includes(search)
    );
  }

  // tab filter (list will be empty for now)
  if(tab==="pending")   list = list.filter(x=>x.status==="pending");
  if(tab==="completed") list = list.filter(x=>x.status==="completed");
  if(tab==="cancelled") list = list.filter(x=>x.status==="cancelled" || x.status==="no-show");
  if(tab==="upcoming")  list = list.filter(x=>new Date(x.datetime)>new Date());
  if(tab==="followup")  list = list.filter(x=>x.followUp===true);
  if(tab==="updated")   list = list.filter(x=>x.updated===true);

  if(list.length===0){
    body.innerHTML = `<div class="empty" style="padding:25px;text-align:center;">No ${tab} tutoring requests.</div>`;
    return;
  }

  // (same table rendering as before)
  body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Created</th><th>Session</th><th>Tutor</th><th>Student</th>
          <th>Module</th><th>Type</th><th>Comment</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(x=>`
          <tr data-id="${x.id}">
            <td>${formatDate(x.createdAt)}</td>
            <td>${formatDate(x.datetime)}</td>
            <td>${x.tutorName}<br><small>${x.tutorEmail}</small></td>
            <td>${x.studentName}<br><small>${x.studentNumber}</small></td>
            <td>${x.module}</td>
            <td>${x.sessionType}${x.sessionType==='in-person' ? `<br><small>Venue: ${x.venue}</small>`:''}</td>
            <td>${escapeHtml(x.comment||'')}</td>
            <td>
              <button class="btn" data-act="view">👁️</button>
              <button class="btn" data-act="complete">✔️</button>
              <button class="btn warn" data-act="delete">🗑️</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* ---------- Modal Viewer (unchanged) ---------- */

function showTutoringModal(item){
  const m = document.createElement('div');
  m.className = "modal-back";
  m.innerHTML = `
    <div class="modal">
      <div style="display:flex;justify-content:space-between;">
        <div style="font-weight:700">Tutoring Request</div>
        <button class="btn" id="closeX">✖</button>
      </div>
      <div style="margin-top:10px">
        <p><b>Student:</b> ${item.studentName} (${item.studentNumber})</p>
        <p><b>Tutor:</b> ${item.tutorName} &lt;${item.tutorEmail}&gt;</p>
        <p><b>Module:</b> ${item.module}</p>
        <p><b>Type:</b> ${item.sessionType} ${item.sessionType==='in-person' ? '• '+item.venue : ''}</p>
        <p><b>Date/Time:</b> ${formatDate(item.datetime)}</p>
        <p><b>Status:</b> ${item.status}</p>
        <p><b>Comment:</b> ${escapeHtml(item.comment || '—')}</p>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
        <button class="btn primary" id="markC">Mark Completed</button>
        <button class="btn warn" id="markX">Mark Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);
  $('#closeX').onclick = ()=> m.remove();

  $('#markC').onclick = () => {
    const all = loadTutoring();
    const idx = all.findIndex(x=>x.id===item.id);
    if(idx !== -1){
      all[idx].status="completed";
      all[idx].updated=true;
      saveTutoring(all);
      recordAudit("Completed tutoring request","admin","id:"+item.id);
    }
    m.remove();
    showTutoringRequestsView();
    renderTutoringSmallBox();
  };

  $('#markX').onclick = () => {
    const reason = prompt("Reason?") || "No reason";
    const all = loadTutoring();
    const idx = all.findIndex(x=>x.id===item.id);
    if(idx !== -1){
      all[idx].status="cancelled";
      all[idx].comment = (all[idx].comment||"") + "\n" + "Cancel: " + reason;
      all[idx].updated=true;
      saveTutoring(all);
      recordAudit("Cancelled tutoring request","admin","id:"+item.id);
    }
    m.remove();
    showTutoringRequestsView();
    renderTutoringSmallBox();
  };
}

/* ---------- Add Tutoring Request (public) ---------- */

function addTutoringRequest(obj){
  const list = loadTutoring();
  const item = Object.assign({
    id: uid(),
    status:'pending',
    createdAt: now(),
    updated:false,
    followUp:false
  }, obj);
  list.unshift(item);
  saveTutoring(list);
  recordAudit("Added tutoring request","admin","id:"+item.id);
  renderTutoringSmallBox();
}

function openTutDownloadPopup(){
  const m = document.createElement('div');
  m.className = "modal-back";

  m.innerHTML = `
    <div class="modal" style="max-width:380px">
      <div style="display:flex;justify-content:space-between;">
        <div style="font-weight:700;font-size:1.1rem">Download Tutoring Data</div>
        <button class="btn" id="closeTutDL">✖</button>
      </div>

      <div style="margin-top:15px">
        <label><b>Select category:</b></label>
        <select id="tutDlCategory" style="width:100%;margin-top:5px">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="upcoming">Upcoming</option>
          <option value="followup">Follow-up</option>
          <option value="updated">Updated</option>
          <option value="all">All</option>
        </select>
      </div>

      <div style="margin-top:15px">
        <label><b>Date range:</b></label>
        <input id="tutDlFrom" type="datetime-local" style="width:100%;margin-top:5px">
        <input id="tutDlTo" type="datetime-local" style="width:100%;margin-top:5px">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button class="btn warn" id="tutDlCancel">Cancel</button>
        <button class="btn primary" id="tutDlStart">Download</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);

  $('#closeTutDL').onclick = () => m.remove();
  $('#tutDlCancel').onclick = () => m.remove();

  $('#tutDlStart').onclick = () => {
    const cat = $('#tutDlCategory').value;
    const from = $('#tutDlFrom').value;
    const to = $('#tutDlTo').value;
    downloadTutoringData(cat, from, to);
    m.remove();
  };
}

function downloadTutoringData(category, from, to){
  let list = loadTutoring();

  // filter by category
  if(category !== "all"){
    if(category === "pending") list = list.filter(x=>x.status==="pending");
    if(category === "completed") list = list.filter(x=>x.status==="completed");
    if(category === "cancelled") list = list.filter(x=>x.status==="cancelled" || x.status==="no-show");
    if(category === "upcoming") list = list.filter(x=>new Date(x.datetime)>new Date());
    if(category === "followup") list = list.filter(x=>x.followUp===true);
    if(category === "updated") list = list.filter(x=>x.updated===true);
  }

  // filter by date range
  if(from){
    const f = new Date(from);
    list = list.filter(x=>new Date(x.datetime) >= f);
  }
  if(to){
    const t = new Date(to);
    list = list.filter(x=>new Date(x.datetime) <= t);
  }

  if(list.length === 0){
    alert("No tutoring data available for chosen filters.");
    return;
  }

  // Convert to CSV
  let csv = "Created,Session Date,Student Name,Student Number,Tutor Name,Tutor Email,Module,Type,Venue,Status,Comment\n";

  list.forEach(x=>{
    csv += [
      formatDate(x.createdAt),
      formatDate(x.datetime),
      x.studentName,
      x.studentNumber,
      x.tutorName,
      x.tutorEmail,
      x.module,
      x.sessionType,
      x.venue || "",
      x.status,
      (x.comment || "").replace(/\n/g," ")
    ].map(v=>`"${v}"`).join(",") + "\n";
  });

  // Download
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tutoring_${category}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- END MODULE ---------- */

/* ---------- COUNSELLING REQUESTS MODULE (EMPTY / CLEAN VERSION) ---------- */
/*
   Works with unified storage "learnbridge_data"
   NO SAMPLE DATA — starts 100% empty
*/

/* ---------- Counselling Storage ---------- */

function loadCounselling(){
  const db = loadDB();
  db.counsellingRequests = db.counsellingRequests || [];
  return db.counsellingRequests;
}

function saveCounselling(list){
  const db = loadDB();
  db.counsellingRequests = list;
  saveDB(db);
}

/* ---------- Initialize Counselling Module ---------- */

function initCounsellingModule(){

  // ensure counsellingRequests array exists (empty)
  const db = loadDB();
  if (!db.counsellingRequests) {
    db.counsellingRequests = [];
    saveDB(db);
  }

  // Add sidebar button once UI loads
  setTimeout(() => {
    const nav = document.querySelector('.side .nav');
    if (!nav) return;

    if (!nav.querySelector('[data-view="counselling-requests"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.view = 'counselling-requests';
      btn.textContent = '🧑‍⚕️ Counselling Requests';
      nav.appendChild(btn);
      renderSidebarHandlers();
    }

    // Show empty counselling box in dashboard
    renderCounsellingSmallBox();
  }, 150);
}

/* ---------- Small Dashboard Box ---------- */

function renderCounsellingSmallBox(){
  const container = document.querySelector('#viewContainer');
  if(!container) return;

  const cards = container.querySelector('.cards');
  if(!cards) return;

  const old = cards.querySelector('.counselling-small-box');
  if(old) old.remove();

  const data = loadCounselling();

  const counts = {
    pending: data.filter(x=>x.status==='pending').length,
    cancelled: data.filter(x=>x.status==='cancelled' || x.status==='no-show').length,
    completed: data.filter(x=>x.status==='completed').length,
    upcoming: data.filter(x=>new Date(x.datetime) > new Date()).length,
    followUp: data.filter(x=>x.followUp).length,
    updated: data.filter(x=>x.updated).length,
  };

  const card = document.createElement('div');
  card.className = 'card counselling-small-box';
  card.style.minWidth = "220px";
  card.style.cursor = "pointer";

  card.innerHTML = `
    <div class="title">🧑‍⚕️ Counselling Requests</div>
    <div style="margin-top:10px;font-size:0.9rem;">
      <div><b>${counts.pending}</b> pending</div>
      <div><b>${counts.cancelled}</b> cancelled / no-show</div>
      <div><b>${counts.completed}</b> completed</div>
      <div><b>${counts.upcoming}</b> upcoming</div>
      <div><b>${counts.followUp}</b> follow-up</div>
      <div><b>${counts.updated}</b> updated</div>
    </div>
    <div class="small-muted" style="margin-top:8px">Click to manage ➜</div>
  `;

  card.onclick = () => {
    $$('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view==='counselling-requests')
    );
    showView('counselling-requests');
  };

  cards.appendChild(card);
}

/* ---------- Compute Remaining Time ---------- */

function computeRemaining(iso){
  if(!iso) return "—";
  const nowD = new Date();
  const t = new Date(iso);
  const diff = t - nowD;
  if(diff <= 0) return "Now or past";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

/* ---------- Main Counselling View ---------- */

function showCounsellingRequestsView(){
  const c = document.querySelector('#viewContainer');
  if(!c) return;

  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div>
        <div style="font-size:1.2rem;font-weight:700">Counselling Requests</div>
        <div class="small-muted">Manage all counselling session requests</div>
      </div>

      <button id="backDashX" class="btn ghost">← Dashboard</button>
    </div>

    <div class="card">

      <div class="tabs" id="counTabs">
        <div class="tab active" data-tab="pending">🕒 Pending</div>
        <div class="tab" data-tab="completed">✅ Completed</div>
        <div class="tab" data-tab="cancelled">❌ Cancelled</div>
        <div class="tab" data-tab="upcoming">📅 Upcoming</div>
        <div class="tab" data-tab="followup">🔁 Follow-up</div>
        <div class="tab" data-tab="updated">✏️ Updated</div>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="counSearch" placeholder="Search…" style="flex:1" />
        <select id="counFilterType">
          <option value="">All types</option>
          <option value="online">Online</option>
          <option value="in-person">In person</option>
        </select>
        <button id="counRefresh" class="btn">🔄</button>
        <button id="counDownload" class="btn">⬇️ Download</button>
      </div>

      <div id="counBody" style="margin-top:10px"></div>
    </div>
  `;

  $('#backDashX').onclick = () => showView('dashboard');
  $('#counRefresh').onclick = () => drawCounTab(getActiveTab());
  $('#counDownload').onclick = () => openCounDownloadPopup();
  $('#counSearch').oninput = () => drawCounTab(getActiveTab());

  $$('#counTabs .tab').forEach(t =>
    t.onclick = () => {
      $$('#counTabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      drawCounTab(t.dataset.tab);
    }
  );

  drawCounTab("pending");

  function getActiveTab(){
    const t = $('#counTabs .tab.active');
    return t ? t.dataset.tab : "pending";
  }
}

/* ---------- Table Renderer ---------- */

function drawCounTab(tab){
  const body = document.querySelector('#counBody');
  if(!body) return;

  const search = ($('#counSearch')?.value || "").toLowerCase();
  const typeF = $('#counFilterType')?.value || "";

  let list = loadCounselling().slice();

  // filters
  if(typeF) list = list.filter(x=> (x.sessionType||"") === typeF);
  if(search){
    list = list.filter(x =>
      [x.studentName,x.studentNumber,x.counsellorName,x.counsellorEmail,x.module,x.comment]
      .join(" ").toLowerCase().includes(search)
    );
  }

  // tab filter (list will be empty for now)
  if(tab==="pending")   list = list.filter(x=>x.status==="pending");
  if(tab==="completed") list = list.filter(x=>x.status==="completed");
  if(tab==="cancelled") list = list.filter(x=>x.status==="cancelled" || x.status==="no-show");
  if(tab==="upcoming")  list = list.filter(x=>new Date(x.datetime)>new Date());
  if(tab==="followup")  list = list.filter(x=>x.followUp===true);
  if(tab==="updated")   list = list.filter(x=>x.updated===true);

  if(list.length===0){
    body.innerHTML = `<div class="empty" style="padding:25px;text-align:center;">No ${tab} counselling requests.</div>`;
    return;
  }

  // (same table rendering as before)
  body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Created</th><th>Session</th><th>Counsellor</th><th>Student</th>
          <th>Module</th><th>Type</th><th>Comment</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(x=>`
          <tr data-id="${x.id}">
            <td>${formatDate(x.createdAt)}</td>
            <td>${formatDate(x.datetime)}</td>
            <td>${x.counsellorName}<br><small>${x.counsellorEmail}</small></td>
            <td>${x.studentName}<br><small>${x.studentNumber}</small></td>
            <td>${x.module}</td>
            <td>${x.sessionType}${x.sessionType==='in-person' ? `<br><small>Venue: ${x.venue}</small>`:''}</td>
            <td>${escapeHtml(x.comment||'')}</td>
            <td>
              <button class="btn" data-act="view">👁️</button>
              <button class="btn" data-act="complete">✔️</button>
              <button class="btn warn" data-act="delete">🗑️</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* ---------- Modal Viewer (unchanged) ---------- */

function showCounsellingModal(item){
  const m = document.createElement('div');
  m.className = "modal-back";
  m.innerHTML = `
    <div class="modal">
      <div style="display:flex;justify-content:space-between;">
        <div style="font-weight:700">Counselling Request</div>
        <button class="btn" id="closeX">✖</button>
      </div>
      <div style="margin-top:10px">
        <p><b>Student:</b> ${item.studentName} (${item.studentNumber})</p>
        <p><b>Counsellor:</b> ${item.counsellorName} &lt;${item.counsellorEmail}&gt;</p>
        <p><b>Module:</b> ${item.module}</p>
        <p><b>Type:</b> ${item.sessionType} ${item.sessionType==='in-person' ? '• '+item.venue : ''}</p>
        <p><b>Date/Time:</b> ${formatDate(item.datetime)}</p>
        <p><b>Status:</b> ${item.status}</p>
        <p><b>Comment:</b> ${escapeHtml(item.comment || '—')}</p>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
        <button class="btn primary" id="markC">Mark Completed</button>
        <button class="btn warn" id="markX">Mark Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);
  $('#closeX').onclick = ()=> m.remove();

  $('#markC').onclick = () => {
    const all = loadCounselling();
    const idx = all.findIndex(x=>x.id===item.id);
    if(idx !== -1){
      all[idx].status="completed";
      all[idx].updated=true;
      saveCounselling(all);
      recordAudit("Completed counselling request","admin","id:"+item.id);
    }
    m.remove();
    showCounsellingRequestsView();
    renderCounsellingSmallBox();
  };

  $('#markX').onclick = () => {
    const reason = prompt("Reason?") || "No reason";
    const all = loadCounselling();
    const idx = all.findIndex(x=>x.id===item.id);
    if(idx !== -1){
      all[idx].status="cancelled";
      all[idx].comment = (all[idx].comment||"") + "\n" + "Cancel: " + reason;
      all[idx].updated=true;
      saveCounselling(all);
      recordAudit("Cancelled counselling request","admin","id:"+item.id);
    }
    m.remove();
    showCounsellingRequestsView();
    renderCounsellingSmallBox();
  };
}

/* ---------- Add Counselling Request (public) ---------- */

function addCounsellingRequest(obj){
  const list = loadCounselling();
  const item = Object.assign({
    id: uid(),
    status:'pending',
    createdAt: now(),
    updated:false,
    followUp:false
  }, obj);
  list.unshift(item);
  saveCounselling(list);
  recordAudit("Added counselling request","admin","id:"+item.id);
  renderCounsellingSmallBox();
}


function openCounDownloadPopup(){
  const m = document.createElement('div');
  m.className = "modal-back";

  m.innerHTML = `
    <div class="modal" style="max-width:380px">
      <div style="display:flex;justify-content:space-between;">
        <div style="font-weight:700;font-size:1.1rem">Download Counselling Data</div>
        <button class="btn" id="closeDL">✖</button>
      </div>

      <div style="margin-top:15px">
        <label><b>Select category:</b></label>
        <select id="dlCategory" style="width:100%;margin-top:5px">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="upcoming">Upcoming</option>
          <option value="followup">Follow-up</option>
          <option value="updated">Updated</option>
          <option value="all">All</option>
        </select>
      </div>

      <div style="margin-top:15px">
        <label><b>Date range:</b></label>
        <input id="dlFrom" type="datetime-local" style="width:100%;margin-top:5px">
        <input id="dlTo" type="datetime-local" style="width:100%;margin-top:5px">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button class="btn warn" id="dlCancel">Cancel</button>
        <button class="btn primary" id="dlStart">Download</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);

  $('#closeDL').onclick = () => m.remove();
  $('#dlCancel').onclick = () => m.remove();

  $('#dlStart').onclick = () => {
    const cat = $('#dlCategory').value;
    const from = $('#dlFrom').value;
    const to = $('#dlTo').value;
    downloadCounsellingData(cat, from, to);
    m.remove();
  };
}

function downloadCounsellingData(category, from, to){
  let list = loadCounselling();

  // filter by category
  if(category !== "all"){
    if(category === "pending") list = list.filter(x=>x.status==="pending");
    if(category === "completed") list = list.filter(x=>x.status==="completed");
    if(category === "cancelled") list = list.filter(x=>x.status==="cancelled" || x.status==="no-show");
    if(category === "upcoming") list = list.filter(x=>new Date(x.datetime)>new Date());
    if(category === "followup") list = list.filter(x=>x.followUp===true);
    if(category === "updated") list = list.filter(x=>x.updated===true);
  }

  // filter by date
  if(from){
    const f = new Date(from);
    list = list.filter(x=>new Date(x.datetime) >= f);
  }
  if(to){
    const t = new Date(to);
    list = list.filter(x=>new Date(x.datetime) <= t);
  }

  if(list.length === 0){
    alert("No data available for chosen filters.");
    return;
  }

  // Convert to CSV
  let csv = "Created,Session Date,Student Name,Student Number,Counsellor Name,Counsellor Email,Module,Type,Venue,Status,Comment\n";

  list.forEach(x=>{
    csv += [
      formatDate(x.createdAt),
      formatDate(x.datetime),
      x.studentName,
      x.studentNumber,
      x.counsellorName,
      x.counsellorEmail,
      x.module,
      x.sessionType,
      x.venue || "",
      x.status,
      (x.comment || "").replace(/\n/g," ")
    ].map(v=>`"${v}"`).join(",") + "\n";
  });

  // Download
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `counselling_${category}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- END MODULE ---------- */


 /* ============================================================
   ⭐ RATINGS MODULE
   Student → Tutor/Counsellor Ratings
   ============================================================ */

/* ---------- Init Ratings Module ---------- */

function initRatingsModule(){

  // ensure ratings array exists
  const db = loadDB();
  if (!db.ratings){
    db.ratings = [];
    saveDB(db);
  }

  // Add sidebar button
  setTimeout(() => {
    const nav = document.querySelector('.side .nav');
    if (!nav) return;

    if (!nav.querySelector('[data-view="ratings"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.view = 'ratings';
      btn.textContent = '⭐ Ratings';
      nav.appendChild(btn);
      renderSidebarHandlers();
    }

    // dashboard rating box
    renderRatingsSmallBox();
  }, 150);
}

/* ---------- Dashboard Small Box ---------- */

function renderRatingsSmallBox(){
  const container = document.querySelector('#viewContainer');
  if(!container) return;

  const cards = container.querySelector('.cards');
  if(!cards) return;

  const old = cards.querySelector('.ratings-small-box');
  if(old) old.remove();

  const data = loadRatings();

  const card = document.createElement('div');
  card.className = 'card ratings-small-box';
  card.style.minWidth = "200px";
  card.style.cursor = "pointer";

  card.innerHTML = `
    <div class="title">⭐ Ratings</div>
    <div class="big">${data.length}</div>
    <div class="small-muted">${data.length===0 ? 'No ratings yet' : 'Student reviews'}</div>
  `;

  card.onclick = () => {
    $$('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view==='ratings')
    );
    showView('ratings');
  };

  cards.appendChild(card);
}

/* ---------- Ratings Page ---------- */

function showRatingsView(){
  const c = document.querySelector('#viewContainer');
  if(!c) return;

  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div>
        <div style="font-size:1.2rem;font-weight:700">⭐ Ratings</div>
        <div class="small-muted">Student reviews for tutors & counsellors</div>
      </div>

      <button id="backRR" class="btn ghost">← Dashboard</button>
    </div>

    <div class="card">

      <div style="display:flex;gap:10px;margin-bottom:10px">
        <input id="rateSearch" placeholder="Search by name / module…" style="flex:1">
        <select id="rateFilterRole">
          <option value="">All</option>
          <option value="tutor">Tutor</option>
          <option value="counsellor">Counsellor</option>
        </select>
        <button id="rateSort" class="btn">⬇ Sort by Stars</button>
        <button id="rateDownload" class="btn primary">⬇ Download</button>
      </div>

      <div id="ratingsBody"></div>
    </div>
  `;

  $('#backRR').onclick = () => showView('dashboard');

  $('#rateSearch').oninput = () => renderRatingsTable();
  $('#rateFilterRole').onchange = () => renderRatingsTable();
  $('#rateSort').onclick = () => renderRatingsTable(true);

  $('#rateDownload').onclick = () => showRatingsDownloadModal();

  renderRatingsTable();
}

/* ---------- Render Ratings Table ---------- */

function renderRatingsTable(sort=false){
  const body = $('#ratingsBody');
  let list = loadRatings().slice();

  const search = ($('#rateSearch').value || "").toLowerCase();
  const roleF = $('#rateFilterRole').value;

  if(search){
    list = list.filter(x =>
      [x.studentName,x.ratedName,x.module,x.comment].join(" ").toLowerCase().includes(search)
    );
  }

  if(roleF){
    list = list.filter(x => x.role === roleF);
  }

  if(sort){
    list.sort((a,b)=>b.stars - a.stars);
  }

  if(list.length===0){
    body.innerHTML = `<div class="empty" style="padding:20px;text-align:center;">No ratings available.</div>`;
    return;
  }

  body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Rated Person</th>
          <th>Module</th>
          <th>Stars</th>
          <th>Comment</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(r=>`
          <tr>
            <td>${r.studentName}<br><small>${r.studentNumber}</small></td>
            <td>${r.ratedName}<br><small>${r.role}</small></td>
            <td>${r.module}</td>
            <td>${"⭐".repeat(r.stars)}</td>
            <td>${escapeHtml(r.comment)}</td>
            <td>${formatDate(r.date)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/* ---------- Download Ratings Modal ---------- */

function showRatingsDownloadModal(){
  const m = document.createElement('div');
  m.className = "modal-back";

  m.innerHTML = `
    <div class="modal">
      <h3>Select Date Range</h3>
      <label>From:</label>
      <input id="rateFrom" type="date">
      <label>To:</label>
      <input id="rateTo" type="date">
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
        <button class="btn" id="cancelR">Cancel</button>
        <button class="btn primary" id="confirmDownloadR">Download</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);

  $('#cancelR').onclick = () => m.remove();
  $('#confirmDownloadR').onclick = () => {
    downloadRatings();
    m.remove();
  };
}

/* ---------- Download Ratings CSV ---------- */

function downloadRatings(){
  let list = loadRatings();

  const f = $('#rateFrom').value;
  const t = $('#rateTo').value;

  if(f) list = list.filter(x => new Date(x.date) >= new Date(f));
  if(t) list = list.filter(x => new Date(x.date) <= new Date(t));

  let csv = "Student,Student Number,Rated Person,Role,Module,Stars,Comment,Date\n";

  list.forEach(r => {
    csv += `"${r.studentName}","${r.studentNumber}","${r.ratedName}","${r.role}","${r.module}",${r.stars},"${r.comment}","${r.date}"\n`;
  });

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = "ratings.csv";
  a.click();
}


   
  /* ---------- MANAGE USERS ---------- */
  function renderManageUsers(initialTab = 'all', extra = {}) {
    const users = loadUsers();
    const audit = loadAudit();

    // Build UI
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:1.1rem">Manage Users</div>
          <div class="small-muted">All users, new registrations, and activity logs</div>
        </div>
        <div class="flex">
          <button id="backToDash" class="btn ghost">← Dashboard</button>
          <button id="newUserBtn" class="btn primary">➕ New User</button>
        </div>
      </div>

      <div class="card">
        <div class="tabs" id="manageTabs">
          <div class="tab active" data-tab="all">All Users</div>
          <div class="tab" data-tab="new">New Registrations</div>
          <div class="tab" data-tab="activity">Activity Logs</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          <div class="search-row" style="flex:1">
            <input id="searchInput" placeholder="Search by name, email, or role..." type="text"/>
            <select id="filterRole">
              <option value="">All roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="counsellor">Counsellors</option>
            </select>
            <select id="filterStatus">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div style="display:flex;gap:8px">
            <button id="refreshBtn" class="btn">🔄 Refresh</button>
            <button id="downloadBtn" class="btn primary">⬇️ Download</button>
          </div>
        </div>

        <div id="manageBody"></div>
      </div>
    `;

    // Tabs handlers
    $$('#manageTabs .tab').forEach(t => t.addEventListener('click', () => {
      $$('#manageTabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      drawManageBody(t.dataset.tab);
    }));

    $('#backToDash').addEventListener('click', () => {
      showView('dashboard');
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='dashboard'));
    });
    $('#newUserBtn').addEventListener('click', ()=>openUserModal('create'));
    $('#refreshBtn').addEventListener('click', ()=>drawManageBody(getActiveTab()));

    $('#searchInput').addEventListener('input', ()=>drawManageBody(getActiveTab()));
    $('#filterRole').addEventListener('change', ()=>drawManageBody(getActiveTab()));
    $('#filterStatus').addEventListener('change', ()=>drawManageBody(getActiveTab()));

 $('#downloadBtn').addEventListener('click', () => {
  const container = document.getElementById('manageBody');
  if (!container) return;

  const table = container.querySelector('table');
  if (!table) { 
    alert('No table data to download'); 
    return; 
  }

  // Clone table and remove the Actions column
  const clone = table.cloneNode(true);
  const ths = clone.querySelectorAll('th');
  let actionColIndex = -1;

  // Find Actions column
  ths.forEach((th, idx) => {
    if (th.textContent.trim().toLowerCase() === 'actions') actionColIndex = idx;
  });

  if (actionColIndex !== -1) {
    // Remove <th> from header
    ths[actionColIndex].remove();
    // Remove corresponding <td> in each row
    clone.querySelectorAll('tr').forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds[actionColIndex]) tds[actionColIndex].remove();
    });
  }

  // Wrap in HTML document
  const htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Exported Table</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background-color: #eee; }
      </style>
    </head>
    <body>
      ${clone.outerHTML}
    </body>
    </html>
  `;

  const blob = new Blob([htmlDoc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learnbridge_${getActiveTab()}.html`;
  a.click();
  URL.revokeObjectURL(url);
});


    // start with requested tab
    setTimeout(()=> {
      const tab = initialTab === 'new' ? 'new' : (initialTab === 'activity' ? 'activity' : 'all');
      $$('#manageTabs .tab').forEach(x=>x.classList.toggle('active', x.dataset.tab===tab));
      drawManageBody(tab, extra.filter || {});
    }, 0);

    /* ---------- Helper: active tab ---------- */
    function getActiveTab(){ const act = $('.tab.active', $('#manageTabs')); return act ? act.dataset.tab : 'all'; }

    /* ---------- drawManageBody ---------- */
    function drawManageBody(tab, prefilter = {}) {
      const users = loadUsers();
      const audit = loadAudit();
      const q = $('#searchInput').value.trim().toLowerCase();
      const roleFilter = $('#filterRole').value || '';
      const statusFilter = $('#filterStatus').value || '';

      if(tab === 'activity'){
        const rows = audit.map(a=>`<tr>
          <td>${formatDate(a.time)}</td><td>${a.by}</td><td>${a.action}</td><td class="muted">${a.details||''}</td>
        </tr>`).join('') || `<tr><td colspan="4" class="empty">No activity recorded yet.</td></tr>`;
        $('#manageBody').innerHTML = `<table><thead><tr><th>Time</th><th>By</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>`;
        return;
      }

      // Filter users for 'all' or 'new'
      let list = users.slice();

      // prefilter (from dashboard card)
      if(prefilter && typeof prefilter === 'object'){
        if(prefilter.role) list = list.filter(u => u.role === prefilter.role);
        if(prefilter.suspended) list = list.filter(u => u.suspended === true);
      }

      if(tab === 'new'){
        // consider new = created within last 7 days or flagged unverified
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
        list = list.filter(u => {
          const created = u.created ? new Date(u.created) : null;
          return (!u.verified) || (created && created >= weekAgo);
        });
      }

      if(q) {
        list = list.filter(u => [u.name, u.email, u.role, u.department].join(' ').toLowerCase().includes(q));
      }
      if(roleFilter) list = list.filter(u => u.role === roleFilter);
      if(statusFilter) {
        if(statusFilter === 'suspended') list = list.filter(u => u.suspended);
        else list = list.filter(u => !u.suspended);
      }

      if(list.length === 0){
        $('#manageBody').innerHTML = `<div class="empty">No users match this view. There are no users at the moment.</div>`;
        return;
      }

      // Build table
      const rows = list.map(u => `
        <tr data-id="${u.id}">
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.role)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.department||'—')}</td>
          <td>${formatDate(u.created)}</td>
          <td>${u.suspended ? '<span style="color:#ff4d4f">Suspended</span>' : 'Active'}</td>
          <td>
            <div class="flex">
              <button class="btn" data-action="view">👁️ View</button>
              <button class="btn" data-action="edit">✏️ Edit</button>
              <button class="btn" data-action="${u.suspended ? 'reinstate' : 'suspend'}">${u.suspended ? '↺ Reinstate' : '⛔ Suspend'}</button>
              <button class="btn warn" data-action="delete">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      $('#manageBody').innerHTML = `<table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;

      // attach actions
      $$('#manageBody button').forEach(btn => btn.addEventListener('click', (ev) => {
        const tr = ev.target.closest('tr');
        const id = tr.dataset.id;
        const action = btn.dataset.action;
        if(action === 'view') openUserModal('view', id);
        if(action === 'edit') openUserModal('edit', id);
        if(action === 'suspend') handleSuspend(id);
        if(action === 'reinstate') handleReinstate(id);
        if(action === 'delete') handleDelete(id);
      }));
    } // drawManageBody

    /* ---------- actions ---------- */
    function handleSuspend(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Suspend ${u.name}?`)){
        u.suspended = true;
        saveUsers(users);
        recordAudit(`Suspended user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
    function handleReinstate(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Reinstate ${u.name}?`)){
        u.suspended = false;
        saveUsers(users);
        recordAudit(`Reinstated user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
    function handleDelete(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Permanently delete ${u.name}? This cannot be undone.`)){
        const remaining = users.filter(x=>x.id!==id);
        saveUsers(remaining);
        recordAudit(`Deleted user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
  } // renderManageUsers

  /* ---------- Modals: View / Edit / Create ---------- */
  function openUserModal(mode='view', id=null){
    // mode: view | edit | create
    const users = loadUsers();
    const user = id ? users.find(u=>u.id===id) : null;

    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700">${mode==='create' ? 'Create User' : mode==='edit' ? 'Edit User' : 'User Details'}</div>
          <div><button class="btn" id="closeModal">✖️ Close</button></div>
        </div>
        <div id="modalBody">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
              <label class="small-muted">Full name</label>
              <input id="m_name" type="text" value="${escapeHtml(user?user.name:'')}" />
            </div>
            <div style="width:180px">
              <label class="small-muted">Role</label>
              <select id="m_role">
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="counsellor">Counsellor</option>
              </select>
            </div>
            <div style="flex:1;min-width:220px">
              <label class="small-muted">Email</label>
              <input id="m_email" type="text" value="${escapeHtml(user?user.email:'')}" />
            </div>

            <div style="flex:1;min-width:220px">
            <label class="small-muted">Temporary Password</label>
            <input id="m_password" type="text" placeholder="Set temporary password" 
             value="${user ? escapeHtml(user.password || '') : ''}" />
             </div>

            <div style="flex:1;min-width:180px">
              <label class="small-muted">Department</label>
              <input id="m_dept" type="text" value="${escapeHtml(user?user.department||'':'')}" />
            </div>

            <div style="flex-basis:100%;height:8px"></div>

            <div style="flex:1">
              <label class="small-muted">Notes</label>
              <textarea id="m_notes" rows="3">${escapeHtml(user?user.notes||'':'')}</textarea>
            </div>

            <div style="width:220px">
              <label class="small-muted">Created</label>
              <div style="padding:8px;background:#f7f7f7;border-radius:8px">${user?formatDate(user.created):formatDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          ${mode==='view' ? `<button class="btn" id="editFromView">✏️ Edit</button>` : ''}
          ${mode!=='view' ? `<button class="btn" id="saveUser" class="btn primary">💾 Save</button>` : ''}
          <button class="btn" id="closeModal2">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // set role option
    if(user) $('#m_role', modal).value = user.role;

    // handlers
    $('#closeModal', modal).addEventListener('click', ()=>modal.remove());
    $('#closeModal2', modal).addEventListener('click', ()=>modal.remove());
    if(mode==='view'){
      $('#editFromView', modal).addEventListener('click', ()=>{
        modal.remove();
        openUserModal('edit', id);
      });
    } else {
      $('#saveUser', modal).addEventListener('click', ()=>{
        const name = $('#m_name').value.trim();
        const role = $('#m_role').value;
        const email = $('#m_email').value.trim();
        const department = $('#m_dept').value.trim();
        const notes = $('#m_notes').value.trim();
        if(!name || !email){ alert('Name and email are required'); return; }

        if(mode==='create'){
          const users = loadUsers();
          const newUser = {
            id: uid(),
            name,
            role, 
            email, 
            department,
            notes,
            password: $('#m_password').value.trim(),
            created: now(),
            verified: true,
            suspended: false,
            stats: {avgLoginsWeek:0}
          };
          users.unshift(newUser);
          saveUsers(users);
          recordAudit(`Created user ${name}`, 'admin', `id:${newUser.id}`);
          modal.remove();
          showView('manage-users', {tab:'all'});
        } else if(mode==='edit' && user){
          const users = loadUsers();
          const idx = users.findIndex(u=>u.id===user.id);
          if(idx === -1) { alert('User not found'); modal.remove(); return; }
          users[idx] = {...users[idx], name, role, email, department, notes};
          saveUsers(users);
          recordAudit(`Edited user ${name}`, 'admin', `id:${users[idx].id}`);
          modal.remove();
          showView('manage-users', {tab:'all'});
        }
      });
    }
  }

  /* ---------- Logout ---------- */
  function logout(){
    // clear any session flags (if you have them) and redirect
    try {
      // if you maintain an auth flag, remove it here. For now just redirect
      window.location.href = 'login.html';
      setTimeout(()=> location.reload(), 700);
    } catch(e){
      location.reload();
    }
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  /* ---------- INIT ---------- */
  buildUI();
  render();
  initTutoringModule();
  initCounsellingModule();


   
})();  


