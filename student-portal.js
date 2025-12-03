/* student-portal.js
   Student Portal UI for LearnBridge (University of Johannesburg)
   SINGLE STORAGE KEY: 'learnbridge_data' (shared with admin-portal.js)
   - Mirrors the admin structure and uses the same unified storage
   - Provides: Dashboard (left), Tutor Booking small box + full booking flow,
     Tutor Book menu on left, Counsellor Book (identical behavior) copied structure
   - Starts empty: no tutors signed in, no requests -> counts show 0
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

  /* ---------- Storage helpers w/ unified schema ---------- */
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

  function loadCounselling(){ const db = loadDB(); db.counsellingRequests = db.counsellingRequests || []; return db.counsellingRequests; }
  function saveCounselling(list){ const db = loadDB(); db.counsellingRequests = list; saveDB(db); }

  function recordAudit(action, by='student', details=''){
    const db = loadDB(); db.audit = db.audit || []; db.audit.unshift({ id: uid(), action, by, details, time: now() }); saveDB(db);
  }

  /* ---------- Ensure DB exists ---------- */
  if(!localStorage.getItem(STORAGE_KEY)){
    saveDB({ users: [], audit: [], sessions: {}, tutorData:{}, studentData:{}, counsellorData:{}, tutoringRequests:[], counsellingRequests:[] });
  }

  /* ---------- Build UI ---------- */
  function buildUI(){
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{ --theme:${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial; }
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(135deg,#001, #061);color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}
        .portal{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.98);box-shadow:0 12px 35px rgba(0,0,0,.18)}
        .side{width:240px;background:linear-gradient(180deg,var(--theme),#222);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:10px 0}
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
          <div style="color:#fff;font-weight:700;font-size:1.2rem">University of Johannesburg — Student Portal</div>
        </div>
      </div>

      <div class="portal" id="portalRoot">
        <aside class="side">
          <div>
            <h2>LearnBridge</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="tutoring">📚 Tutor Book</button>
              <button class="nav-btn" data-view="counselling">💬 Counsellor Book</button>
              <button class="nav-btn" data-view="requests">🔔 My Requests</button>
            </div>
          </div>
          <div style="padding:12px;color:rgba(255,255,255,.85)">
            <div style="margin-bottom:8px">Student • UJ</div>
            <div style="font-size:12px">Status: <span id="loginState">Not signed in</span></div>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Student Portal</strong> <span class="muted">— Find tutors & counsellors, make bookings</span></div>
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

  /* ---------- Routing / Handlers ---------- */
  function render(){
    renderSidebarHandlers();
    showView('dashboard');
  }

  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      });
    });
  }

  function showView(view){
    const container = $('#viewContainer'); if(!container) return;
    if(view==='dashboard') renderDashboard();
    else if(view==='tutoring') renderTutoringSearchView();
    else if(view==='counselling') renderCounsellingSearchView();
    else if(view==='requests') renderMyRequestsView();
    else container.innerHTML = `<div class="card"><h3>Coming Soon</h3></div>`;
  }

  /* ---------- Dashboard with Tutor Booking small box ---------- */
  function renderDashboard(){
    const users = loadUsers();
    const counts = { tutors: users.filter(u=>u.role==='tutor').length, counsellors: users.filter(u=>u.role==='counsellor').length };

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <div style="font-size:1.1rem;font-weight:700">Dashboard</div>
            <div class="small-muted">Quick actions</div>
          </div>
          <div class="flex">
            <button id="openTutBtn" class="btn primary">Tutors ➜</button>
            <button id="openCounBtn" class="btn">Counsellors ➜</button>
          </div>
        </div>

        <div class="cards">
          <div class="card" style="min-width:180px;flex:1">
            <div class="title">🧑‍🏫 Active Tutors</div>
            <div class="big">${counts.tutors}</div>
            <div class="small-muted">Currently active tutors</div>
          </div>

          <div class="card" style="min-width:180px;flex:1">
            <div class="title">💬 Counsellors</div>
            <div class="big">${counts.counsellors}</div>
            <div class="small-muted">Available counsellors</div>
          </div>

        </div>
      </div>
    `;

    // Add small tutor booking box to the cards area
    renderTutorSmallBox();
    renderCounsellorSmallBox();

    $('#openTutBtn').addEventListener('click', ()=>{ $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='tutoring')); showView('tutoring'); });
    $('#openCounBtn').addEventListener('click', ()=>{ $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='counselling')); showView('counselling'); });
  }

  function renderTutorSmallBox(){
    const container = document.querySelector('#viewContainer');
    if(!container) return;
    const cards = container.querySelector('.cards');
    if(!cards) return;

    const users = loadUsers().filter(u=>u.role==='tutor' && !u.suspended);
    const active = users.length;

    // remove old
    const old = cards.querySelector('.tutor-small-box'); if(old) old.remove();

    const card = document.createElement('div');
    card.className = 'card tutor-small-box';
    card.style.minWidth = '220px'; card.style.cursor='pointer';
    card.innerHTML = `
      <div class="title">📚 Tutor Booking</div>
      <div style="margin-top:10px;font-size:0.95rem;">
        <div>Click to make a request</div>
        <div style="margin-top:6px"><b>${active}</b> active tutors</div>
      </div>
      <div class="small-muted" style="margin-top:8px">Click to open booking ➜</div>
    `;

    card.onclick = ()=>{ $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='tutoring')); showView('tutoring'); };

    cards.appendChild(card);
  }

  function renderCounsellorSmallBox(){
    const container = document.querySelector('#viewContainer');
    if(!container) return;
    const cards = container.querySelector('.cards');
    if(!cards) return;

    const users = loadUsers().filter(u=>u.role==='counsellor' && !u.suspended);
    const active = users.length;

    const old = cards.querySelector('.counsellor-small-box'); if(old) old.remove();

    const card = document.createElement('div');
    card.className = 'card counsellor-small-box';
    card.style.minWidth = '220px'; card.style.cursor='pointer';
    card.innerHTML = `
      <div class="title">🧭 Counsellor Booking</div>
      <div style="margin-top:10px;font-size:0.95rem;">
        <div>Click to make a request</div>
        <div style="margin-top:6px"><b>${active}</b> active counsellors</div>
      </div>
      <div class="small-muted" style="margin-top:8px">Click to open booking ➜</div>
    `;

    card.onclick = ()=>{ $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='counselling')); showView('counselling'); };

    cards.appendChild(card);
  }

  /* ---------- Tutoring Search / Booking View ---------- */
  function renderTutoringSearchView(){
    const users = loadUsers();
    const tutors = users.filter(u=>u.role==='tutor' && !u.suspended);

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
          <div class="small-muted">Search tutors by name, module or department</div>
        </div>
        <button id="backDashTut" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div class="search-row">
          <input id="tutorSearch" placeholder="Search by name, module, department…" style="flex:1" />
          <select id="tutorDept"><option value="">All Departments</option></select>
          <button id="tutorRefresh" class="btn">🔄</button>
        </div>

        <div id="tutorList"></div>
      </div>
    `;

    $('#backDashTut').onclick = ()=> showView('dashboard');
    $('#tutorRefresh').onclick = ()=> drawTutorList();
    $('#tutorSearch').oninput = ()=> drawTutorList();

    // populate departments
    const depts = Array.from(new Set(tutors.map(t=>t.department).filter(Boolean))).sort();
    const deptSel = $('#tutorDept'); depts.forEach(d=>{ const o=document.createElement('option'); o.value=d; o.textContent=d; deptSel.appendChild(o); });
    deptSel.onchange = ()=> drawTutorList();

    drawTutorList();

    function drawTutorList(){
      const q = ($('#tutorSearch')?.value||'').toLowerCase();
      const dept = $('#tutorDept')?.value || '';
      let list = tutors.slice();
      if(dept) list = list.filter(t=> (t.department||'').toLowerCase()===dept.toLowerCase());
      if(q) list = list.filter(t=> ( (t.name||'') + ' ' + (t.modules||'') + ' ' + (t.department||'') ).toLowerCase().includes(q));

      const out = document.getElementById('tutorList'); if(!out) return;
      if(list.length===0){ out.innerHTML = `<div class="empty">No active tutors found.</div>`; return; }

      out.innerHTML = `
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>Modules</th><th>Active</th><th>Action</th></tr></thead>
          <tbody>
            ${list.map(t=>`<tr data-id="${t.id}"><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.department||'—')}</td><td>${escapeHtml(t.modules||'—')}</td><td>Yes</td><td><button class="btn primary" data-act="book" data-id="${t.id}">Book</button></td></tr>`).join('')}
          </tbody>
        </table>
      `;

      // attach handlers
      $$('#tutorList button[data-act="book"]').forEach(b=>b.onclick = () => openBookingModal('tutor', b.dataset.id));
    }
  }

  /* ---------- Counselling Search / Booking View (same structure) ---------- */
  function renderCounsellingSearchView(){
    const users = loadUsers();
    const counsellors = users.filter(u=>u.role==='counsellor' && !u.suspended);

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Counsellor Booking</div>
          <div class="small-muted">Search counsellors by name or department</div>
        </div>
        <button id="backDashCoun" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div class="search-row">
          <input id="counSearch" placeholder="Search by name or department…" style="flex:1" />
          <select id="counDept"><option value="">All Departments</option></select>
          <button id="counRefresh" class="btn">🔄</button>
        </div>

        <div id="counList"></div>
      </div>
    `;

    $('#backDashCoun').onclick = ()=> showView('dashboard');
    $('#counRefresh').onclick = ()=> drawCounList();
    $('#counSearch').oninput = ()=> drawCounList();

    const depts = Array.from(new Set(counsellors.map(t=>t.department).filter(Boolean))).sort();
    const deptSel = $('#counDept'); depts.forEach(d=>{ const o=document.createElement('option'); o.value=d; o.textContent=d; deptSel.appendChild(o); });
    deptSel.onchange = ()=> drawCounList();

    drawCounList();

    function drawCounList(){
      const q = ($('#counSearch')?.value||'').toLowerCase();
      const dept = $('#counDept')?.value || '';
      let list = counsellors.slice();
      if(dept) list = list.filter(t=> (t.department||'').toLowerCase()===dept.toLowerCase());
      if(q) list = list.filter(t=> ( (t.name||'') + ' ' + (t.department||'') ).toLowerCase().includes(q));

      const out = document.getElementById('counList'); if(!out) return;
      if(list.length===0){ out.innerHTML = `<div class="empty">No active counsellors found.</div>`; return; }

      out.innerHTML = `
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>Active</th><th>Action</th></tr></thead>
          <tbody>
            ${list.map(t=>`<tr data-id="${t.id}"><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.department||'—')}</td><td>Yes</td><td><button class="btn primary" data-act="book-c" data-id="${t.id}">Book</button></td></tr>`).join('')}
          </tbody>
        </table>
      `;

      $$('#counList button[data-act="book-c"]').forEach(b=>b.onclick = () => openBookingModal('counsellor', b.dataset.id));
    }
  }

  /* ---------- Open Booking Modal (joption style) ---------- */
  function openBookingModal(type /* 'tutor' or 'counsellor' */, personId){
    const users = loadUsers();
    const person = users.find(u=>u.id===personId) || {};

    const modal = document.createElement('div'); modal.className='modal-back';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">${type==='tutor' ? 'Book Tutor' : 'Book Counsellor'}</div>
          <button class="btn" id="closeBooking">✖</button>
        </div>

        <div style="margin-top:12px">
          <div style="margin-bottom:8px"><label><b>${type==='tutor' ? 'Tutor' : 'Counsellor'}</b></label><br><input id="book_person" value="${escapeHtml(person.name||'') }" disabled style="width:100%"/></div>

          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="flex:1"><label><b>Department</b></label><br><input id="book_dept" value="${escapeHtml(person.department||'') }" disabled style="width:100%"/></div>
            <div style="flex:1"><label><b>Module</b></label><br><input id="book_module" value="${escapeHtml(person.modules||'') }" disabled style="width:100%"/></div>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="flex:1"><label><b>Date & Time</b></label><br><input id="book_dt" type="datetime-local" style="width:100%"/></div>
            <div style="flex:1"><label><b>Duration (mins)</b></label><br><input id="book_dur" type="number" min="15" max="180" value="60" style="width:100%"/></div>
          </div>

          <div style="margin-bottom:8px"><label><b>Topic / Comment</b></label><br><textarea id="book_comment" rows="3" placeholder="Briefly describe what you need help with"></textarea></div>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
            <button class="btn" id="book_cancel">Cancel</button>
            <button class="btn primary" id="book_send">Book</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    $('#closeBooking').onclick = ()=> modal.remove();
    $('#book_cancel').onclick = ()=> modal.remove();

    $('#book_send').onclick = ()=>{
      const datetime = $('#book_dt').value;
      const duration = parseInt($('#book_dur').value || '60', 10);
      const comment = $('#book_comment').value || '';

      if(!datetime){ alert('Please select date & time'); return; }

      const req = {
        id: uid(),
        type: type,
        personId: person.id || null,
        personName: person.name || '',
        personDepartment: person.department || '',
        personModule: person.modules || '',
        studentName: 'Student (auto)', // automated name - uneditable in modal as requested
        studentId: 'auto-student-id',
        datetime: new Date(datetime).toISOString(),
        durationMinutes: duration,
        comment: comment,
        status: 'pending',
        createdAt: now(),
      };

      if(type==='tutor'){
        const list = loadTutoring(); list.unshift(req); saveTutoring(list);
      } else {
        const list = loadCounselling(); list.unshift(req); saveCounselling(list);
      }

      recordAudit(`Added ${type} booking request`, 'student', `person:${person.id || 'unknown'}, req:${req.id}`);

      // Small UX: show confirmation then close modal
      alert('Booking request sent — status: pending (will appear in your requests).');
      modal.remove();
      renderTutorSmallBox(); renderCounsellorSmallBox();
    };

  }

  /* ---------- My Requests view (shows pending, completed, cancelled) ---------- */
  function renderMyRequestsView(){
    const tut = loadTutoring();
    const coun = loadCounselling();
    const all = (tut||[]).concat(coun||[]).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">My Requests</div>
          <div class="small-muted">Pending requests and history</div>
        </div>
        <button id="backDashReq" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div id="reqBody"></div>
      </div>
    `;

    $('#backDashReq').onclick = ()=> showView('dashboard');

    const body = $('#reqBody');
    if(all.length===0){ body.innerHTML = `<div class="empty">You have no requests yet.</div>`; return; }

    body.innerHTML = `
      <table>
        <thead><tr><th>Created</th><th>Type</th><th>Person</th><th>Date</th><th>Comment</th><th>Status</th></tr></thead>
        <tbody>
          ${all.map(r=>`<tr data-id="${r.id}"><td>${formatDate(r.createdAt)}</td><td>${r.type}</td><td>${escapeHtml(r.personName||'—')}</td><td>${formatDate(r.datetime)}</td><td>${escapeHtml((r.comment||'').slice(0,120))}</td><td>${r.status}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  /* ---------- Initialization: create DB and render UI ---------- */
  buildUI();
  render();

  // expose a couple of public functions for testing (dev only)
  window.LearnBridgeStudentPortal = {
    addTutoringRequest: (obj)=>{ const list = loadTutoring(); const item = Object.assign({ id: uid(), status:'pending', createdAt: now() }, obj); list.unshift(item); saveTutoring(list); recordAudit('Added tutoring request (public)', 'student', item.id); renderTutorSmallBox(); },
    addCounsellingRequest: (obj)=>{ const list = loadCounselling(); const item = Object.assign({ id: uid(), status:'pending', createdAt: now() }, obj); list.unshift(item); saveCounselling(list); recordAudit('Added counselling request (public)', 'student', item.id); renderCounsellorSmallBox(); }
  };


})();






