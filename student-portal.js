/* student-portal.js
   Student Portal - Unified LearnBridge Storage
   STORAGE_KEY: 'learnbridge_data'
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#0073e6';
  const UNI_KEY = 'uj';

  /* ---------- Utilities ---------- */
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  const escapeHtml = s => s ? String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : '';

  /* ---------- Storage ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[], "audit":[], "sessions":{}, "tutorData":{}, "studentData":{}, "counsellorData":{}, "tutoringRequests":[]
    }`);
  }

  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  function loadTutoring() { return loadDB().tutoringRequests || []; }
  function saveTutoring(list){ const db=loadDB(); db.tutoringRequests=list; saveDB(db); }
  function loadUsers() { return loadDB().users || []; }
  function recordAudit(action, by='student', details=''){ 
    const db = loadDB();
    db.audit.unshift({id:uid(), action, by, details, time:now()});
    saveDB(db);
  }

  /* ---------- Initialize UI ---------- */
  function buildUI() {
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{--theme:${THEME_COLOR};--panel:#fff;--muted:#666;--radius:10px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
        *{box-sizing:border-box}
        body{margin:0;background:#f7f7f7;color:#222;min-height:100vh;display:flex;flex-direction:column;font-family:Inter, sans-serif;}
        .student-dashboard{display:flex;max-width:1200px;margin:12px auto;border-radius:var(--radius);overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.15);}
        .side{width:260px;background:linear-gradient(180deg,var(--theme),#222);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:12px 0}
        .side h2{text-align:center;margin:0;padding:12px;font-size:1.05rem;border-bottom:1px solid rgba(255,255,255,.06)}
        .nav{display:flex;flex-direction:column;padding:6px 0}
        .nav button{background:none;border:none;color:#fff;padding:12px 18px;text-align:left;cursor:pointer;font-size:14px;border-top:1px solid rgba(255,255,255,.03)}
        .nav button.active, .nav button:hover{background:rgba(255,255,255,0.06)}
        .content{flex:1;padding:18px;overflow:auto;max-height:calc(100vh - 48px)}
        .card{background:var(--panel);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:14px;margin-bottom:14px}
        .cards{display:flex;gap:12px;flex-wrap:wrap}
        .card .title{font-weight:700;margin-bottom:6px}
        .card .big{font-size:1.6rem;font-weight:800;color:var(--theme)}
        .small-muted{font-size:13px;color:var(--muted)}
        .btn{padding:8px 10px;border-radius:8px;border:none;cursor:pointer}
        .btn.primary{background:var(--theme);color:#fff}
        .btn.ghost{background:transparent;border:1px solid #ddd}
        .btn.warn{background:#ff4d4f;color:#fff}
        input, select, textarea{padding:8px;border-radius:6px;border:1px solid #ccc;width:100%;margin-bottom:10px}
        .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999}
        .modal{background:#fff;padding:18px;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,.25)}
        @media(max-width:900px){.student-dashboard{flex-direction:column}.side{width:100%}}
      </style>
    `);

    document.body.innerHTML = `
      <div class="student-dashboard" id="studentRoot">
        <aside class="side">
          <div>
            <h2>Student Portal</h2>
            <div class="nav">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="tutor-booking">📚 Tutor Booking</button>
            </div>
          </div>
          <div style="padding:12px;color:rgba(255,255,255,.85)">Student • UJ</div>
        </aside>

        <main class="content" id="mainContent">
          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    renderSidebarHandlers();
    showView('dashboard');
  }

  /* ---------- Sidebar Handlers ---------- */
  function renderSidebarHandlers() {
    $$('.nav-btn').forEach(btn=>{
      btn.onclick=()=>{
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      };
    });
  }

  /* ---------- Show Views ---------- */
  function showView(view){
    const container = $('#viewContainer');
    if(!container) return;
    if(view==='dashboard') renderDashboard();
    else if(view==='tutor-booking') renderTutorBooking();
    else container.innerHTML = `<div class="card">Coming Soon</div>`;
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const tutors = loadUsers().filter(u=>u.role==='tutor');
    const activeTutors = tutors.filter(t=>t.active).length;

    $('#viewContainer').innerHTML = `
      <div class="cards">
        <div class="card" style="min-width:200px;cursor:pointer" id="tutorSmallBox">
          <div class="title">📚 Tutor Booking</div>
          <div style="margin-top:8px">Click to make a request</div>
          <div style="margin-top:6px"><b>${activeTutors}</b> active tutors</div>
        </div>
      </div>
    `;

    $('#tutorSmallBox').onclick = ()=> {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='tutor-booking'));
      showView('tutor-booking');
    };
  }

  /* ---------- Tutor Booking ---------- */
  function renderTutorBooking() {
    const users = loadUsers().filter(u=>u.role==='tutor' && u.active);
    const data = loadTutoring();

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;font-size:1.2rem">📚 Tutor Booking</div>
          <button class="btn ghost" id="backDash">← Dashboard</button>
        </div>
        <div style="margin-bottom:12px">
          <input type="text" id="searchTutor" placeholder="Search by name, module, department" />
        </div>
        <div><b>${users.length}</b> active tutors</div>
        <div id="tutorList" style="margin-top:10px"></div>
      </div>
    `;

    $('#backDash').onclick = ()=> {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='dashboard'));
      showView('dashboard');
    };

    $('#searchTutor').oninput = drawTutorList;
    drawTutorList();

    function drawTutorList() {
      const term = $('#searchTutor').value.toLowerCase();
      const filtered = users.filter(u=>{
        return [u.name,u.module,u.department].join(' ').toLowerCase().includes(term);
      });

      const list = $('#tutorList');
      if(filtered.length===0){ list.innerHTML='<div class="empty">No tutors found</div>'; return; }

      list.innerHTML = filtered.map(t=>`
        <div class="card" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div><b>${t.name}</b> (${t.department})</div>
            <div>${t.module}</div>
          </div>
          <button class="btn primary" data-id="${t.id}">📅 Book</button>
        </div>
      `).join('');

      $$('button[data-id]').forEach(b=>{
        b.onclick = ()=> openBookingModal(filtered.find(u=>u.id===b.dataset.id));
      });
    }
  }

  /* ---------- Booking Modal ---------- */
  function openBookingModal(tutor) {
    const m = document.createElement('div');
    m.className="modal-back";
    m.innerHTML=`
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700">Book Tutor</div>
          <button class="btn" id="closeX">✖</button>
        </div>
        <div>
          <label>Name</label>
          <input type="text" value="${tutor.name}" disabled />
          <label>Department</label>
          <input type="text" value="${tutor.department}" disabled />
          <label>Module</label>
          <input type="text" value="${tutor.module}" disabled />
          <label>Date & Time</label>
          <input type="datetime-local" id="sessionDate" />
          <label>Topic / Help Needed</label>
          <textarea id="topicHelp" rows="3"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button class="btn primary" id="bookBtn">📩 Book</button>
          <button class="btn warn" id="cancelBtn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    $('#closeX').onclick = ()=> m.remove();
    $('#cancelBtn').onclick = ()=> m.remove();

    $('#bookBtn').onclick = ()=>{
      const date = $('#sessionDate').value;
      const topic = $('#topicHelp').value.trim();
      if(!date){ alert('Select date/time'); return; }
      if(!topic){ alert('Write a short topic description'); return; }

      const db = loadDB();
      db.tutoringRequests.push({
        id:uid(),
        status:'pending',
        createdAt:now(),
        tutorId:tutor.id,
        tutorName:tutor.name,
        tutorDepartment:tutor.department,
        module:tutor.module,
        studentName:db.currentStudent?.name || 'Student',
        studentId:db.currentStudent?.id || 'unknown',
        datetime:date,
        comment:topic
      });
      saveDB(db);
      recordAudit('Booked tutor '+tutor.name,'student');
      m.remove();
      renderTutorBooking();
      alert('✅ Tutor request submitted!');
    };
  }

  /* ---------- Initialize ---------- */
  buildUI();
})();
