/* student-portal.js
   Student Portal with Unified LearnBridge Storage
   SINGLE STORAGE KEY: 'learnbridge_data'
*/

(() => {
  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#0077ff';
  const UNI_KEY = 'uj';

  /* ---------- Utility ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = iso => iso ? new Date(iso).toLocaleString() : '—';
  const escapeHtml = s => s ? String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : '';

  /* ---------- Load/Save DB ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[],
      "sessions":{},
      "studentData":{},
      "tutorData":{},
      "counsellorData":{}
    }`);
  }
  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

  function loadUsers() { return loadDB().users || []; }
  function saveUsers(users) { const db = loadDB(); db.users = users; saveDB(db); }

  /* ---------- Initialize DB if empty ---------- */
  if(!localStorage.getItem(STORAGE_KEY)){
    saveDB({
      users: [],
      sessions: {},
      studentData: { tutoringRequests: [], counsellingRequests: [] },
      tutorData: {},
      counsellorData: {}
    });
  }

  /* ---------- Build UI ---------- */
  function buildUI() {
    document.head.insertAdjacentHTML('beforeend', `
      <style>
:root{--theme:#0077ff;--panel:#fff;--muted:#666;--radius:12px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial}
body{margin:0;background:#f5f5f5;color:#222;display:flex;min-height:100vh;}
*{box-sizing:border-box;}

.dashboard-container{display:flex;flex:1;min-height:100vh;}

aside{
  width:240px;
  background:var(--theme);
  color:#fff;
  padding:20px 10px;
  display:flex;
  flex-direction:column;
}
aside h2{text-align:center;margin-bottom:20px;font-size:1.2rem;}
.nav button{
  background:none;
  border:none;
  color:#fff;
  text-align:left;
  padding:10px 14px;
  margin:4px 0;
  cursor:pointer;
  border-radius:6px;
  font-size:14px;
}
.nav button.active, .nav button:hover{background:rgba(255,255,255,.2);}

main{
  flex:1;
  padding:20px;
  overflow:auto;
  display:flex;
  flex-direction:column;
  gap:15px;
  background:#f5f5f5;
}

.card{
  background:var(--panel);
  border-radius:var(--radius);
  box-shadow:0 2px 12px rgba(0,0,0,.08);
  padding:15px;
  margin-bottom:12px;
}

.small-muted{font-size:13px;color:var(--muted);}

.cards{
  display:flex;
  gap:15px;
  flex-wrap:wrap;
}

.btn{
  padding:6px 12px;
  border-radius:6px;
  border:none;
  cursor:pointer;
}
.btn.primary{background:var(--theme);color:#fff;}
.btn.ghost{background:#fff;border:1px solid #ccc;color:#333;}

.flex{display:flex;gap:8px;align-items:center;}
.empty{padding:25px;text-align:center;color:var(--muted);border:2px dashed #ccc;border-radius:10px;}

input, select, textarea{
  padding:6px;
  border-radius:6px;
  border:1px solid #ccc;
  width:100%;
}

.modal-back{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.4);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:999;
}

.modal{
  background:#fff;
  padding:20px;
  border-radius:var(--radius);
  max-width:480px;
  width:100%;
  box-shadow:0 10px 40px rgba(0,0,0,.25);
}

.row{display:flex;gap:12px;margin-bottom:12px;}
.row > *{flex:1;}

/* Dashboard boxes like admin portal */
#tutorBox, #counsellorBox{
  flex:1;
  min-width:200px;
  cursor:pointer;
}

      </style>
    `);

    document.body.innerHTML = `
      <div class="dashboard-container">
        <aside>
          <h2>LearnBridge Student</h2>
          <div class="nav">
            <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
            <button class="nav-btn" data-view="tutor-booking">📚 Tutor Booking</button>
            <button class="nav-btn" data-view="counsellor-booking">💬 Counsellor Booking</button>
          </div>
        </aside>
        <main id="mainContent"></main>
      </div>
    `;
  }

  /* ---------- Render Views ---------- */
  function render() {
    $$('.nav-btn').forEach(btn => btn.addEventListener('click',()=>{
      $$('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showView(btn.dataset.view);
    }));
    showView('dashboard');
  }

  function showView(view) {
    if(view==='dashboard') return renderDashboard();
    if(view==='tutor-booking') return renderTutorBooking();
    if(view==='counsellor-booking') return renderCounsellorBooking();
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const main = $('#mainContent');
    const activeTutors = loadUsers().filter(u=>u.role==='tutor').length;
    const activeCounsellors = loadUsers().filter(u=>u.role==='counsellor').length;

main.innerHTML = `
  <div class="cards">
    <div class="card" id="tutorBox">
      <div class="title">📚 Tutor Booking</div>
      <div class="small-muted">Click to make a request</div>
      <div style="margin-top:6px;"><b>${activeTutors}</b> active tutors</div>
    </div>

    <div class="card" id="counsellorBox">
      <div class="title">💬 Counsellor Booking</div>
      <div class="small-muted">Click to make a request</div>
      <div style="margin-top:6px;"><b>${activeCounsellors}</b> active counsellors</div>
    </div>
  </div>
`;


    $('#tutorBox').onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='tutor-booking'));
      showView('tutor-booking');
    };
    $('#counsellorBox').onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='counsellor-booking'));
      showView('counsellor-booking');
    };
  }

  /* ---------- Tutor Booking ---------- */
  function renderTutorBooking() {
    const main = $('#mainContent');
    const tutors = loadUsers().filter(u=>u.role==='tutor');

    main.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="title">Tutor Booking</div>
          <button class="btn ghost" id="backDash">← Dashboard</button>
        </div>

        <div class="row">
          <input id="searchTutor" placeholder="Search by name/module/department"/>
          <button class="btn primary" id="searchBtn">Search</button>
        </div>

        <div id="tutorList"></div>
      </div>
    `;

    $('#backDash').onclick = ()=> showView('dashboard');
    $('#searchBtn').onclick = drawTutorList;
    drawTutorList();

    function drawTutorList() {
      const listDiv = $('#tutorList');
      const q = ($('#searchTutor').value || '').toLowerCase();
      let filtered = tutors.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.module||'').toLowerCase().includes(q) ||
        (t.department||'').toLowerCase().includes(q)
      );

      if(filtered.length===0){
        listDiv.innerHTML = `<div class="empty">No tutors found.</div>`;
        return;
      }

      listDiv.innerHTML = filtered.map(t=>`
        <div class="card">
          <div><b>${t.name}</b> (${t.department})</div>
          <div class="small-muted">${t.module || 'No module assigned'}</div>
          <button class="btn primary bookTutorBtn" data-id="${t.id}">Book</button>
        </div>
      `).join('');

      $$('.bookTutorBtn').forEach(btn=>{
        btn.onclick = ()=> openBookingModal('tutor', btn.dataset.id);
      });
    }
  }

  /* ---------- Counsellor Booking ---------- */
  function renderCounsellorBooking() {
    const main = $('#mainContent');
    const counsellors = loadUsers().filter(u=>u.role==='counsellor');

    main.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="title">Counsellor Booking</div>
          <button class="btn ghost" id="backDashC">← Dashboard</button>
        </div>

        <div class="row">
          <input id="searchCounsellor" placeholder="Search by name/module/department"/>
          <button class="btn primary" id="searchCounsellorBtn">Search</button>
        </div>

        <div id="counsellorList"></div>
      </div>
    `;

    $('#backDashC').onclick = ()=> showView('dashboard');
    $('#searchCounsellorBtn').onclick = drawCounsellorList;
    drawCounsellorList();

    function drawCounsellorList() {
      const listDiv = $('#counsellorList');
      const q = ($('#searchCounsellor').value || '').toLowerCase();
      let filtered = counsellors.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.module||'').toLowerCase().includes(q) ||
        (c.department||'').toLowerCase().includes(q)
      );

      if(filtered.length===0){
        listDiv.innerHTML = `<div class="empty">No counsellors found.</div>`;
        return;
      }

      listDiv.innerHTML = filtered.map(c=>`
        <div class="card">
          <div><b>${c.name}</b> (${c.department})</div>
          <div class="small-muted">${c.module || 'No module assigned'}</div>
          <button class="btn primary bookCounsellorBtn" data-id="${c.id}">Book</button>
        </div>
      `).join('');

      $$('.bookCounsellorBtn').forEach(btn=>{
        btn.onclick = ()=> openBookingModal('counsellor', btn.dataset.id);
      });
    }
  }

  /* ---------- Booking Modal ---------- */
  function openBookingModal(type, id) {
    const db = loadDB();
    const users = loadUsers();
    const mainUser = users.find(u=>u.id===id);
    const studentName = 'Student Name'; // Replace with actual logged-in student if available

    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="title">Book ${type === 'tutor' ? 'Tutor' : 'Counsellor'}</div>
          <button class="btn" id="closeModal">✖</button>
        </div>

        <div class="row">
          <input disabled value="${escapeHtml(mainUser.name)}" />
          <input disabled value="${escapeHtml(mainUser.department || '')}" />
        </div>
        <div class="row">
          <input disabled value="${escapeHtml(mainUser.module || '')}" />
        </div>
        <div class="row">
          <input type="date" id="bookDate"/>
          <input type="time" id="bookTime"/>
        </div>
        <div style="margin-top:10px;">
          <textarea id="bookComment" placeholder="Brief topic/issue"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
          <button class="btn ghost" id="cancelBooking">Cancel</button>
          <button class="btn primary" id="confirmBooking">Book</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    $('#closeModal').onclick = () => modal.remove();
    $('#cancelBooking').onclick = () => modal.remove();
    $('#confirmBooking').onclick = () => {
      const date = $('#bookDate').value;
      const time = $('#bookTime').value;
      const comment = $('#bookComment').value;
      if(!date || !time){
        alert('Please select date and time.');
        return;
      }
      const datetime = new Date(`${date}T${time}`).toISOString();
      const request = {
        id: uid(),
        type,
        studentName,
        tutorOrCounsellorId: id,
        tutorOrCounsellorName: mainUser.name,
        datetime,
        comment,
        status: 'pending',
        createdAt: now()
      };

      if(type==='tutor'){
        db.studentData.tutoringRequests = db.studentData.tutoringRequests || [];
        db.studentData.tutoringRequests.unshift(request);
      } else {
        db.studentData.counsellingRequests = db.studentData.counsellingRequests || [];
        db.studentData.counsellingRequests.unshift(request);
      }

      saveDB(db);
      alert('Booking submitted!');
      modal.remove();
    };
  }

  /* ---------- Initialize ---------- */
  buildUI();
  render();
})();




