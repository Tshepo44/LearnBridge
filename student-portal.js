/* student-portal.js
   Student Dashboard with Unified LearnBridge Storage
   SINGLE STORAGE KEY: 'learnbridge_data'
   Structure:
   {
     users: [],
     audit: [],
     sessions: {},
     tutorData: {},
     studentData: {},
     counsellorData: {},
     tutoringRequests: [],
     counsellingRequests: []
   }
*/

(() => {

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#007aff'; // blue for student
  const UNI_KEY = 'uj';

  /* ---------- Utility ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* ---------- LocalStorage DB ---------- */
  function loadDB() {
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

  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

  /* ---------- Audit ---------- */
  function recordAudit(action, by='student', details='') {
    const db = loadDB();
    db.audit.unshift({id: uid(), action, by, details, time: now()});
    saveDB(db);
  }

  /* ---------- Initialize DB ---------- */
  if(!localStorage.getItem(STORAGE_KEY)){
    saveDB({
      users: [],
      audit: [],
      sessions: {},
      tutorData: {},
      studentData: {},
      counsellorData: {},
      tutoringRequests: [],
      counsellingRequests: []
    });
  }

  /* ---------- Build UI ---------- */
  function buildUI(){
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{ --theme:${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(135deg,#001,#061);color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;}
        .student-dashboard{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.97);box-shadow:0 12px 35px rgba(0,0,0,.18);}
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
        @media(max-width:900px){ .student-dashboard{flex-direction:column} .side{width:100%;order:2} .content{order:1} .cards{flex-direction:column} }
      </style>
    `);

    document.body.innerHTML = `
      <div style="width:100%;max-width:1200px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px" onerror="this.style.display='none'"/>
          <div style="color:#fff;font-weight:700;font-size:1.2rem">University of Johannesburg — Student Portal</div>
        </div>
      </div>

      <div class="student-dashboard" id="studentDashboardRoot">
        <aside class="side">
          <div>
            <h2>LearnBridge Student</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="tutoring-requests">📚 Tutor Booking</button>
              <button class="nav-btn" data-view="counselling-requests">💬 Counsellor Booking</button>
            </div>
          </div>
          <div style="padding:12px;">
            <div style="margin-bottom:8px;color:rgba(255,255,255,.85)">Student • UJ</div>
            <button id="logoutBtn" class="btn" style="width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);color:#fff">🔒 Logout</button>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Student Portal</strong> <span class="muted">—Book Tutors or Counsellors</span></div>
            <div class="mini">
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

  /* ---------- Render Views ---------- */
  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      });
    });
  }

  function showView(view){
    if(view==='dashboard') renderDashboard();
    else if(view==='tutoring-requests') showTutoringRequestsView();
    else if(view==='counselling-requests') showCounsellingRequestsView();
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard(){
    const db = loadDB();
    const tutorsCount = Object.keys(db.tutorData || {}).length;
    const counsellorsCount = Object.keys(db.counsellorData || {}).length;

    $('#viewContainer').innerHTML = `
      <div class="cards">
        <div class="card tutoring-small-box" style="min-width:220px;cursor:pointer">
          <div class="title">📚 Tutor Booking</div>
          <div style="margin-top:10px;font-size:0.9rem">
            <div>Active Tutors: <b>${tutorsCount}</b></div>
            <div class="small-muted" style="margin-top:6px">Click to make a request</div>
          </div>
        </div>

        <div class="card counselling-small-box" style="min-width:220px;cursor:pointer">
          <div class="title">💬 Counsellor Booking</div>
          <div style="margin-top:10px;font-size:0.9rem">
            <div>Active Counsellors: <b>${counsellorsCount}</b></div>
            <div class="small-muted" style="margin-top:6px">Click to make a request</div>
          </div>
        </div>
      </div>
    `;

    // click handlers
    $('.tutoring-small-box').onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='tutoring-requests'));
      showView('tutoring-requests');
    };
    $('.counselling-small-box').onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='counselling-requests'));
      showView('counselling-requests');
    };
  }

  /* ---------- Tutoring Booking Module ---------- */
  function loadTutoring(){ return loadDB().tutoringRequests || []; }
  function saveTutoring(list){ const db=loadDB(); db.tutoringRequests=list; saveDB(db); }
  function addTutoringRequest(obj){ const list=loadTutoring(); list.unshift(Object.assign({id:uid(), status:'pending', createdAt:now()},obj)); saveTutoring(list); recordAudit("Added tutoring request"); }

  function showTutoringRequestsView(){
    const db = loadDB();
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
          <div class="small-muted">Search & request tutors</div>
        </div>
        <button class="btn ghost" id="backDashTut">← Dashboard</button>
      </div>

      <div class="card">
        <div class="search-row">
          <input id="searchTutor" placeholder="Search by name, module, department" style="flex:1"/>
          <button class="btn primary" id="refreshTut">Search</button>
        </div>
        <div id="tutorList"></div>
      </div>
    `;
    $('#backDashTut').onclick = ()=>showView('dashboard');
    $('#refreshTut').onclick = drawTutors;
    $('#searchTutor').oninput = drawTutors;
    drawTutors();
  }

  function drawTutors(){
    const listContainer = $('#tutorList');
    const db = loadDB();
    const search = ($('#searchTutor').value || '').toLowerCase();
    const tutors = Object.values(db.tutorData || {}).filter(t=>{
      return [t.name, t.module, t.department].join(' ').toLowerCase().includes(search);
    });

    if(tutors.length===0){
      listContainer.innerHTML = `<div class="empty">No active tutors at the moment.</div>`;
      return;
    }

    listContainer.innerHTML = tutors.map(t=>`
      <div class="card">
        <div><b>${t.name}</b> — ${t.department}</div>
        <div>Module: ${t.module}</div>
        <button class="btn primary" onclick="bookTutor('${t.id}')">Book</button>
      </div>
    `).join('');
  }

  window.bookTutor = function(tutorId){
    const db = loadDB();
    const t = db.tutorData[tutorId];
    if(!t) return alert("Tutor not found.");
    const modal = document.createElement('div');
    modal.className='modal-back';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;">
          <div style="font-weight:700">Book Tutor</div>
          <button class="btn" id="closeModal">✖</button>
        </div>
        <div style="margin-top:10px">
          <p><b>Name:</b> ${t.name}</p>
          <p><b>Department:</b> ${t.department}</p>
          <p><b>Module:</b> ${t.module}</p>
          <div style="margin-top:10px"><label>Date/Time:</label><input type="datetime-local" id="tutDateTime" style="width:100%"/></div>
          <div style="margin-top:10px"><label>Topic/Details:</label><textarea id="tutComment" style="width:100%;height:60px"></textarea></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
            <button class="btn warn" id="cancelTut">Cancel</button>
            <button class="btn primary" id="confirmTut">Book</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $('#closeModal').onclick = $('#cancelTut').onclick = ()=> modal.remove();
    $('#confirmTut').onclick = ()=>{
      const dt = $('#tutDateTime').value;
      const comment = $('#tutComment').value;
      if(!dt) return alert("Select date/time.");
      addTutoringRequest({tutorId:tutorId,tutorName:t.name,department:t.department,module:t.module,datetime:dt,comment});
      alert("Tutor booking request sent.");
      modal.remove();
      drawTutors();
    };
  }

  /* ---------- Counselling Booking Module ---------- */
  function loadCounselling(){ return loadDB().counsellingRequests || []; }
  function saveCounselling(list){ const db=loadDB(); db.counsellingRequests=list; saveDB(db); }
  function addCounsellingRequest(obj){ const list=loadCounselling(); list.unshift(Object.assign({id:uid(), status:'pending', createdAt:now()},obj)); saveCounselling(list); recordAudit("Added counselling request"); }

  function showCounsellingRequestsView(){
    const db = loadDB();
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Counsellor Booking</div>
          <div class="small-muted">Search & request counsellors</div>
        </div>
        <button class="btn ghost" id="backDashCoun">← Dashboard</button>
      </div>

      <div class="card">
        <div class="search-row">
          <input id="searchCoun" placeholder="Search by name, department" style="flex:1"/>
          <button class="btn primary" id="refreshCoun">Search</button>
        </div>
        <div id="counList"></div>
      </div>
    `;
    $('#backDashCoun').onclick = ()=>showView('dashboard');
    $('#refreshCoun').onclick = drawCounsellors;
    $('#searchCoun').oninput = drawCounsellors;
    drawCounsellors();
  }

  function drawCounsellors(){
    const listContainer = $('#counList');
    const db = loadDB();
    const search = ($('#searchCoun').value || '').toLowerCase();
    const counsellors = Object.values(db.counsellorData || {}).filter(c=>{
    return [c.name, c.department].join(' ').toLowerCase().includes(search);
    });

    if(counsellors.length===0){
      listContainer.innerHTML = `<div class="empty">No active counsellors at the moment.</div>`;
      return;
    }

    listContainer.innerHTML = counsellors.map(c=>`
      <div class="card">
        <div><b>${c.name}</b> — ${c.department}</div>
        <button class="btn primary" onclick="bookCounsellor('${c.id}')">Book</button>
      </div>
    `).join('');
  }

  window.bookCounsellor = function(counId){
    const db = loadDB();
    const c = db.counsellorData[counId];
    if(!c) return alert("Counsellor not found.");
    const modal = document.createElement('div');
    modal.className='modal-back';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;">
          <div style="font-weight:700">Book Counsellor</div>
          <button class="btn" id="closeModal">✖</button>
        </div>
        <div style="margin-top:10px">
          <p><b>Name:</b> ${c.name}</p>
          <p><b>Department:</b> ${c.department}</p>
          <div style="margin-top:10px"><label>Date/Time:</label><input type="datetime-local" id="counDateTime" style="width:100%"/></div>
          <div style="margin-top:10px"><label>Reason/Notes:</label><textarea id="counComment" style="width:100%;height:60px"></textarea></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
            <button class="btn warn" id="cancelCoun">Cancel</button>
            <button class="btn primary" id="confirmCoun">Book</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $('#closeModal').onclick = $('#cancelCoun').onclick = ()=> modal.remove();
    $('#confirmCoun').onclick = ()=>{
      const dt = $('#counDateTime').value;
      const comment = $('#counComment').value;
      if(!dt) return alert("Select date/time.");
      addCounsellingRequest({counsellorId:counId, counsellorName:c.name, department:c.department, datetime:dt, comment});
      alert("Counsellor booking request sent.");
      modal.remove();
      drawCounsellors();
    };
  }

  /* ---------- Logout ---------- */
  $('#logoutBtn').onclick = ()=>{
    alert("Logging out...");
    location.reload(); // placeholder for real session logout
  };

  /* ---------- Init ---------- */
  buildUI();
  renderSidebarHandlers();
  showView('dashboard');

})();





