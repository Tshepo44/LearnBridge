/* student-portal.js
   Student Portal (base) + Tutor & Counsellor Booking modules
   Shared DB key: 'learnbridge_data' (same as admin-portal.js)
   Sidebar:
     📊 Dashboard
     📘 Tutor Booking
     🧠 Counsellor Booking
     🔔 Notifications
     👤 Profile
*/
(() => {
  'use strict';
  console.log('STUDENT PORTAL SCRIPT LOADED — student-portal.js');

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  /* ---------- Basic DB helpers ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users": [],
      "audit": [],
      "sessions": {},
      "tutorData": {},
      "studentData": {},
      "counsellorData": {},
      "tutoringRequests": [],
      "counsellingRequests": []
    }`);
  }

  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function nowISO(){ return new Date().toISOString(); }
  function formatDate(iso){ try { return iso ? new Date(iso).toLocaleString() : '—'; } catch(e){ return '—'; } }

  function recordAudit(action, by='system', details='') {
    const db = loadDB();
    db.audit = db.audit || [];
    db.audit.unshift({ id: uid(), action, by, details, time: nowISO() });
    saveDB(db);
  }

  /* ---------- Utilities ---------- */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  function escapeHtml(s){ if (s === 0) return '0'; if (!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* ---------- Ensure DB exists ---------- */
  if (!localStorage.getItem(STORAGE_KEY)) {
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
    console.log('Initialized learnbridge_data in localStorage');
  }

  /* ---------- Inject small styles (safe, lightweight) ---------- */
  function injectStyles(){
    if (document.getElementById('studentPortalStyles')) return;
    const s = document.createElement('style');
    s.id = 'studentPortalStyles';
    s.textContent = `
      :root{ --theme: ${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
      .student-card-note{font-size:0.95rem;color:#333}
      .modal-back.student{z-index:9999}
      .booking-row{display:flex;gap:8px}
      .booking-row>div{flex:1}
      .small-muted{color:var(--muted)}
    `;
    document.head.appendChild(s);
  }

  /* ---------- UI: build or detect portal shell ---------- */
  function ensureShell(){
    // If admin portal already created the shell with #adminDashboardRoot and #viewContainer, use it.
    if (document.getElementById('adminDashboardRoot') && document.getElementById('viewContainer')) {
      // assume shell exists
      return;
    }

    // Minimal shell if admin UI not present (so this file can run standalone for student)
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        /* minimal fallback shell styles */
        .student-shell{width:100%;max-width:1200px;margin:18px auto;background:rgba(255,255,255,0.98);border-radius:12px;padding:0;box-shadow:0 12px 30px rgba(0,0,0,.12);overflow:hidden}
      </style>
    `);

    document.body.innerHTML = `
      <div style="width:100%;max-width:1200px;display:flex;justify-content:space-between;align-items:center;margin:12px auto">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px" onerror="this.style.display='none'"/>
          <div style="font-weight:700;font-size:1.1rem">${UNI_KEY.toUpperCase()} Student Portal</div>
        </div>
      </div>

      <div class="admin-dashboard student-shell" id="adminDashboardRoot">
        <aside class="side">
          <div>
            <h2 style="color:#fff;padding:12px;margin:0">LearnBridge Student</h2>
            <div class="nav" role="navigation"></div>
          </div>
          <div style="padding:12px;color:#fff">
            <div style="margin-bottom:8px">Student • ${UNI_KEY.toUpperCase()}</div>
          </div>
        </aside>
        <main class="content" id="mainContent" style="padding:18px;background:linear-gradient(180deg,#f7f7f7,#fff)">
          <div class="topbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div><strong>Student Portal</strong> <span class="small-muted">— Support & bookings</span></div>
            <div class="mini"><div class="tag">${UNI_KEY.toUpperCase()}</div><div class="tag" id="timeTag">${new Date().toLocaleString()}</div></div>
          </div>
          <div id="viewContainer"></div>
        </main>
      </div>
    `;
    // live clock
    setInterval(()=>{ const el = document.getElementById('timeTag'); if(el) el.textContent = new Date().toLocaleString(); }, 1000);
  }

  /* ---------- Sidebar setup ---------- */
  const SIDEBAR_MENU = [
    {key:'dashboard', label:'📊 Dashboard'},
    {key:'tutor-book', label:'📘 Tutor Booking'},
    {key:'counsellor-book', label:'🧠 Counsellor Booking'},
    {key:'notifications', label:'🔔 Notifications'},
    {key:'profile', label:'👤 Profile'}
  ];

  function renderSidebar(){
    const nav = document.querySelector('.side .nav');
    if(!nav) return;
    nav.innerHTML = '';
    SIDEBAR_MENU.forEach(item=>{
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.view = item.key;
      btn.textContent = item.label;
      if(item.key === 'dashboard') btn.classList.add('active');
      nav.appendChild(btn);
    });
    bindSidebarButtons();
  }

  function bindSidebarButtons(){
    $$('.nav-btn').forEach(btn=>{
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        showView(view);
      });
    });
  }

  /* ---------- Views: router ---------- */
  function showView(view){
    if (view === 'dashboard') renderDashboard();
    else if (view === 'tutor-book') showTutorBookingView();
    else if (view === 'counsellor-book') showCounsellingBookingView();
    else if (view === 'notifications') renderNotificationsView();
    else if (view === 'profile') renderProfileView();
    else renderDashboard();
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard(){
    const db = loadDB();
    const users = db.users || [];
    const counts = {
      students: users.filter(u=>u.role==='student').length,
      tutors: users.filter(u=>u.role==='tutor').length,
      counsellors: users.filter(u=>u.role==='counsellor').length
    };

    const container = $('#viewContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div><div style="font-size:1.1rem;font-weight:700">Dashboard</div><div class="small-muted">Welcome — overview</div></div>
        </div>

        <div class="cards" style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="card" style="min-width:180px;flex:1">
            <div class="title">👩‍🎓 Students</div>
            <div class="big">${counts.students}</div>
            <div class="small-muted">Active student accounts</div>
          </div>
          <div class="card" style="min-width:180px;flex:1">
            <div class="title">🧑‍🏫 Tutors</div>
            <div class="big">${counts.tutors}</div>
            <div class="small-muted">Tutors registered</div>
          </div>
          <div class="card" style="min-width:180px;flex:1">
            <div class="title">🧠 Counsellors</div>
            <div class="big">${counts.counsellors}</div>
            <div class="small-muted">Counsellors registered</div>
          </div>
          <!-- Tutor booking small box appended here -->
        </div>
      </div>
    `;
    renderTutorBookingSmallBox();
    renderCounsellingBookingSmallBox();
  }

  /* ---------- Small boxes for dashboard (Tutor + Counsellor) ---------- */
  function renderTutorBookingSmallBox(){
    const container = $('#viewContainer');
    if(!container) return;
    const cards = container.querySelector('.cards');
    if(!cards) return;
    const existing = cards.querySelector('.tutor-booking-small');
    if(existing) existing.remove();

    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor');
    const active = tutors.filter(t=>t.active === true).length;
    const pending = (db.tutoringRequests || []).filter(r=>r.status==='pending').length;

    const el = document.createElement('div');
    el.className = 'card tutor-booking-small';
    el.style.minWidth = '220px';
    el.innerHTML = `
      <div class="title">📚 Tutor Booking</div>
      <div style="margin-top:8px">
        <div>Click to make a request</div>
        <div style="margin-top:6px"><b>${active}</b> active tutors</div>
        <div class="small-muted" style="margin-top:6px"><b>${pending}</b> pending requests</div>
      </div>
    `;
    el.onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view === 'tutor-book'));
      showView('tutor-book');
    };
    cards.appendChild(el);
  }

  function renderCounsellingBookingSmallBox(){
    const container = $('#viewContainer');
    if(!container) return;
    const cards = container.querySelector('.cards');
    if(!cards) return;
    const existing = cards.querySelector('.counselling-booking-small');
    if(existing) existing.remove();

    const db = loadDB();
    const counsellors = (db.users || []).filter(u=>u.role==='counsellor');
    const active = counsellors.filter(t=>t.active === true).length;
    const pending = (db.counsellingRequests || []).filter(r=>r.status==='pending').length;

    const el = document.createElement('div');
    el.className = 'card counselling-booking-small';
    el.style.minWidth = '220px';
    el.innerHTML = `
      <div class="title">🧠 Counsellor Booking</div>
      <div style="margin-top:8px">
        <div>Click to make a request</div>
        <div style="margin-top:6px"><b>${active}</b> active counsellors</div>
        <div class="small-muted" style="margin-top:6px"><b>${pending}</b> pending requests</div>
      </div>
    `;
    el.onclick = () => {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view === 'counsellor-book'));
      showView('counsellor-book');
    };
    cards.appendChild(el);
  }

  /* ---------- Tutor Booking view (student-facing) ---------- */
  function showTutorBookingView(){
    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor') || [];
    const active = tutors.filter(t=>t.active === true).length;

    const container = $('#viewContainer');
    if(!container) return;
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
          <div class="small-muted">Search tutors by name, module or department. Book a session.</div>
        </div>
        <button id="backToDashTut" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="small-muted">Active tutors: <b id="activeTutorCount">${active}</b></div>
          <div class="small-muted">Total tutors: <b>${tutors.length}</b></div>
        </div>

        <div class="search-row" style="align-items:center">
          <input type="text" id="tbSearch" placeholder="Search by tutor name, module or department" style="flex:1" />
          <input type="text" id="tbModule" placeholder="Module (optional)" />
          <select id="tbDept" style="min-width:160px"><option value="">All Departments</option></select>
          <button id="tbRefresh" class="btn">🔄</button>
        </div>

        <div id="tbList" style="margin-top:12px"></div>
      </div>
    `;
    $('#backToDashTut').onclick = () => showView('dashboard');
    $('#tbRefresh').onclick = () => drawTutorList();
    $('#tbSearch').oninput = () => drawTutorList();
    $('#tbModule').oninput = () => drawTutorList();
    $('#tbDept').onchange = () => drawTutorList();
    populateTutorDepartments();
    drawTutorList();
  }

  function populateTutorDepartments(){
    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor');
    const depts = Array.from(new Set(tutors.map(t=>(t.department||'').trim()).filter(Boolean))).sort();
    const sel = $('#tbDept'); if(!sel) return;
    sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function drawTutorList(){
    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor') || [];
    const activeCount = tutors.filter(t=>t.active).length;
    const search = ($('#tbSearch')?.value||'').toLowerCase();
    const moduleQ = ($('#tbModule')?.value||'').toLowerCase();
    const dept = ($('#tbDept')?.value||'').toLowerCase();
    const listEl = $('#tbList'); if(!listEl) return;

    let list = tutors.slice();
    if (dept) list = list.filter(t=> (t.department||'').toLowerCase() === dept);
    if (moduleQ) list = list.filter(t=> (t.modules||[]).join(' ').toLowerCase().includes(moduleQ));
    if (search) list = list.filter(t=> [t.name,t.displayName,(t.modules||[]).join(' '),(t.department||'')].join(' ').toLowerCase().includes(search));

    if (list.length === 0) {
      listEl.innerHTML = `<div class="empty">No tutors found. Active tutors: <b>${activeCount}</b>.</div>`; $('#activeTutorCount').textContent = activeCount; return;
    }

    listEl.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Department</th><th>Module(s)</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map(t=>`
            <tr data-id="${t.id}">
              <td>${escapeHtml(t.name || t.displayName || '—')}</td>
              <td>${escapeHtml(t.department || '—')}</td>
              <td>${escapeHtml((t.modules||[]).join(', ') || '—')}</td>
              <td>${t.active ? '🟢 Active' : '⚪ Offline'}</td>
              <td><button class="btn primary tb-book-btn" data-id="${t.id}">Book</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    $('#activeTutorCount').textContent = activeCount;
    $$('.tb-book-btn').forEach(b=>b.onclick = ()=> {
      const id = b.dataset.id; const db2 = loadDB(); const tutor = (db2.users||[]).find(u=>u.id===id); openBookingModal(tutor, 'tutoring');
    });
  }

  /* ---------- Counselling Booking view (same features as tutor booking) ---------- */
  function showCounsellingBookingView(){
    const db = loadDB();
    const counsellors = (db.users || []).filter(u=>u.role==='counsellor') || [];
    const active = counsellors.filter(c=>c.active).length;
    const container = $('#viewContainer');
    if(!container) return;
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Counsellor Booking</div>
          <div class="small-muted">Search counsellors by name, module or department. Book a counselling session.</div>
        </div>
        <button id="backToDashCoun" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="small-muted">Active counsellors: <b id="activeCounCount">${active}</b></div>
          <div class="small-muted">Total counsellors: <b>${counsellors.length}</b></div>
        </div>

        <div class="search-row" style="align-items:center">
          <input type="text" id="cbSearch" placeholder="Search by counsellor name, module or department" style="flex:1" />
          <input type="text" id="cbModule" placeholder="Module (optional)" />
          <select id="cbDept" style="min-width:160px"><option value="">All Departments</option></select>
          <button id="cbRefresh" class="btn">🔄</button>
        </div>

        <div id="cbList" style="margin-top:12px"></div>
      </div>
    `;
    $('#backToDashCoun').onclick = ()=> showView('dashboard');
    $('#cbRefresh').onclick = ()=> drawCounsellorList();
    $('#cbSearch').oninput = ()=> drawCounsellorList();
    $('#cbModule').oninput = ()=> drawCounsellorList();
    $('#cbDept').onchange = ()=> drawCounsellorList();
    populateCounsellorDepartments();
    drawCounsellorList();
  }

  function populateCounsellorDepartments(){
    const db = loadDB();
    const list = (db.users||[]).filter(u=>u.role==='counsellor');
    const depts = Array.from(new Set(list.map(t=>(t.department||'').trim()).filter(Boolean))).sort();
    const sel = $('#cbDept'); if(!sel) return;
    sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function drawCounsellorList(){
    const db = loadDB();
    const list = (db.users||[]).filter(u=>u.role==='counsellor') || [];
    const activeCount = list.filter(t=>t.active).length;
    const search = ($('#cbSearch')?.value||'').toLowerCase();
    const moduleQ = ($('#cbModule')?.value||'').toLowerCase();
    const dept = ($('#cbDept')?.value||'').toLowerCase();
    const el = $('#cbList'); if(!el) return;

    let filtered = list.slice();
    if (dept) filtered = filtered.filter(t=> (t.department||'').toLowerCase() === dept);
    if (moduleQ) filtered = filtered.filter(t=> (t.modules||[]).join(' ').toLowerCase().includes(moduleQ));
    if (search) filtered = filtered.filter(t=> [t.name,t.displayName,(t.modules||[]).join(' '),(t.department||'')].join(' ').toLowerCase().includes(search));

    if (filtered.length === 0) { el.innerHTML = `<div class="empty">No counsellors found. Active: <b>${activeCount}</b>.</div>`; $('#activeCounCount').textContent = activeCount; return; }

    el.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Department</th><th>Module(s)</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${filtered.map(t=>`
            <tr data-id="${t.id}">
              <td>${escapeHtml(t.name || t.displayName || '—')}</td>
              <td>${escapeHtml(t.department || '—')}</td>
              <td>${escapeHtml((t.modules||[]).join(', ') || '—')}</td>
              <td>${t.active ? '🟢 Active' : '⚪ Offline'}</td>
              <td><button class="btn primary cb-book-btn" data-id="${t.id}">Book</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    $('#activeCounCount').textContent = activeCount;
    $$('.cb-book-btn').forEach(b=>b.onclick = ()=> {
      const id = b.dataset.id; const db2 = loadDB(); const c = (db2.users||[]).find(u=>u.id===id); openBookingModal(c, 'counselling');
    });
  }

  /* ---------- Booking modal (shared) ----------
     type: 'tutoring' or 'counselling'
  */
  function openBookingModal(person, type){
    const sessionUser = getCurrentStudent();
    const modal = document.createElement('div');
    modal.className = 'modal-back student';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">${ type === 'tutoring' ? 'Book Tutor' : 'Book Counsellor' } — ${escapeHtml(person ? (person.name||person.displayName) : '—')}</div>
          <button class="btn" id="modalClose">✖</button>
        </div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <label style="font-weight:600">Student</label>
          <input type="text" id="bmStudent" value="${escapeHtml(sessionUser ? (sessionUser.name || sessionUser.displayName || sessionUser.studentNumber) : '')}" readonly />

          <label style="font-weight:600">${ type === 'tutoring' ? 'Tutor' : 'Counsellor' }</label>
          <input type="text" id="bmPerson" value="${escapeHtml(person ? (person.name||person.displayName) : '')}" readonly />

          <div style="display:flex;gap:8px">
            <div style="flex:1">
              <label style="font-weight:600">Department</label>
              <input type="text" id="bmDept" value="${escapeHtml(person ? person.department || '' : '')}" readonly />
            </div>
            <div style="flex:1">
              <label style="font-weight:600">Module</label>
              <input type="text" id="bmModule" value="${escapeHtml(person ? (person.modules||[]).slice(0,3).join(', ') : '')}" readonly />
            </div>
          </div>

          <div class="booking-row">
            <div><label style="font-weight:600">Preferred date</label><input type="date" id="bmDate" /></div>
            <div><label style="font-weight:600">Preferred time</label><input type="time" id="bmTime" /></div>
          </div>

          <label style="font-weight:600">Short note (what you need help with)</label>
          <textarea id="bmNote" placeholder="Short paragraph describing your issue"></textarea>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
            <button class="btn ghost" id="bmCancel">Cancel</button>
            <button class="btn primary" id="bmSend">Book</button>
          </div>

          <div id="bmStatus" class="small-muted" style="margin-top:6px"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $('#modalClose', modal).onclick = ()=> modal.remove();
    $('#bmCancel', modal).onclick = ()=> modal.remove();

    $('#bmSend', modal).onclick = () => {
      const date = $('#bmDate', modal).value;
      const time = $('#bmTime', modal).value;
      const note = ($('#bmNote', modal).value || '').trim();
      if (!sessionUser) { alert('You must be signed in as a student to book. For testing: set localStorage.currentUser or create one in learnbridge_data.users'); return; }
      if (!date || !time) { alert('Please select a date and time.'); return; }
      let dt;
      try { dt = new Date(date + 'T' + time); if (isNaN(dt.getTime())) throw 0; } catch(e){ alert('Invalid date/time'); return; }

      // build booking
      const booking = {
        id: uid(),
        type: type,
        personId: person.id,
        personName: person.name || person.displayName || '',
        studentId: sessionUser.id,
        studentName: sessionUser.name || sessionUser.displayName || sessionUser.studentNumber || '',
        module: (person.modules && person.modules.length) ? person.modules[0] : '',
        department: person.department || '',
        datetime: dt.toISOString(),
        comment: note,
        status: 'pending',
        createdAt: nowISO()
      };

      // persist
      const db = loadDB();
      if (type === 'tutoring') {
        db.tutoringRequests = db.tutoringRequests || [];
        db.tutoringRequests.unshift(booking);
        // update tutor data
        db.tutorData = db.tutorData || {};
        db.tutorData[person.id] = db.tutorData[person.id] || { notifications: [], pendingRequests: [] };
        db.tutorData[person.id].notifications.unshift({ id: uid(), type:'booking', bookingId: booking.id, message:`New booking request from ${booking.studentName}`, time: nowISO(), read:false });
        db.tutorData[person.id].pendingRequests.push(booking.id);
      } else {
        db.counsellingRequests = db.counsellingRequests || [];
        db.counsellingRequests.unshift(booking);
        db.counsellorData = db.counsellorData || {};
        db.counsellorData[person.id] = db.counsellorData[person.id] || { notifications: [], pendingRequests: [] };
        db.counsellorData[person.id].notifications.unshift({ id: uid(), type:'booking', bookingId: booking.id, message:`New counselling request from ${booking.studentName}`, time: nowISO(), read:false });
        db.counsellorData[person.id].pendingRequests.push(booking.id);
      }

      // update student pendingRequests
      db.studentData = db.studentData || {};
      db.studentData[sessionUser.id] = db.studentData[sessionUser.id] || { pendingRequests: [] };
      db.studentData[sessionUser.id].pendingRequests = db.studentData[sessionUser.id].pendingRequests || [];
      db.studentData[sessionUser.id].pendingRequests.push(booking.id);

      saveDB(db);
      recordAudit(`${type} booking created`, sessionUser.id, `booking:${booking.id}`);
      alert('Booking request sent — it will appear in your Pending Requests (coming soon). The person will be notified.');
      modal.remove();
      // update UI
      renderTutorBookingSmallBox();
      renderCounsellingBookingSmallBox();
      const currentView = ($('.nav-btn.active') || {}).dataset?.view;
      if (currentView === 'tutor-book') drawTutorList();
      if (currentView === 'counsellor-book') drawCounsellorList();
    };
  }

  /* ---------- Notifications view ---------- */
  function renderNotificationsView(){
    const db = loadDB();
    const student = getCurrentStudent();
    const container = $('#viewContainer'); if(!container) return;
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div><div style="font-size:1.2rem;font-weight:700">Notifications</div><div class="small-muted">Your notifications & messages</div></div>
        <button id="backToDashNotif" class="btn ghost">← Dashboard</button>
      </div>
      <div class="card" id="notifCard"><div class="small-muted">Loading notifications...</div></div>
    `;
    $('#backToDashNotif').onclick = ()=> showView('dashboard');

    // gather notifications: from studentData? also from tutorData / counsellorData targeted to student (we created person notifications earlier, but student only sees their own requests)
    const notifs = [];
    if (student) {
      const sData = (db.studentData || {})[student.id] || {};
      // show pending requests summary
      if (sData.pendingRequests && sData.pendingRequests.length){
        notifs.push({ id: 'pending', time: nowISO(), text: `You have ${sData.pendingRequests.length} pending request(s).` });
      }
      // also show bookings where student is creator
      const tRequests = (db.tutoringRequests||[]).filter(r=>r.studentId === student.id);
      const cRequests = (db.counsellingRequests||[]).filter(r=>r.studentId === student.id);
      tRequests.forEach(r=> notifs.push({ id: r.id, time: r.createdAt, text: `Tutoring request with ${r.personName} — ${formatDate(r.datetime)} — status: ${r.status}` }));
      cRequests.forEach(r=> notifs.push({ id: r.id, time: r.createdAt, text: `Counselling request with ${r.personName} — ${formatDate(r.datetime)} — status: ${r.status}` }));
    } else {
      notifs.push({ id: 'none', time: nowISO(), text: 'No student signed in. Set localStorage.currentUser for demo.' });
    }

    const card = $('#notifCard');
    if(!notifs.length) card.innerHTML = '<div class="empty">No notifications.</div>';
    else card.innerHTML = notifs.map(n=>`<div style="padding:8px;border-bottom:1px solid #eee"><div style="font-size:14px">${escapeHtml(n.text)}</div><div class="small-muted" style="font-size:12px">${formatDate(n.time)}</div></div>`).join('');
  }

  /* ---------- Profile view ---------- */
  function renderProfileView(){
    const db = loadDB();
    const student = getCurrentStudent();
    const container = $('#viewContainer'); if(!container) return;
    if(!student){
      container.innerHTML = `<div class="card"><h3>Profile</h3><div class="empty">No student signed in. For testing: set localStorage.currentUser or create a student account in learnbridge_data.users</div></div>`;
      return;
    }
    const sData = (db.studentData||{})[student.id] || {};
    const pendingCount = (sData.pendingRequests || []).length || 0;
    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-size:1.2rem;font-weight:700">${escapeHtml(student.name || student.displayName || 'Student')}</div><div class="small-muted">${escapeHtml(student.email || student.studentNumber || '')}</div></div>
        </div>
        <div style="margin-top:12px">
          <div class="small-muted">Pending requests: <b>${pendingCount}</b></div>
          <div style="margin-top:8px"><button id="editProfile" class="btn">Edit profile (coming soon)</button></div>
        </div>
      </div>
    `;
    $('#editProfile').onclick = ()=> alert('Profile editing coming soon');
  }

  /* ---------- Helpers: get current student ---------- */
  function getCurrentStudent(){
    const db = loadDB();
    if (db.sessions && db.sessions.currentUser && db.sessions.currentUser.role === 'student') return db.sessions.currentUser;
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (cu && cu.role === 'student') return cu;
    } catch(e){}
    const students = (db.users || []).filter(u=>u.role==='student');
    if (students.length === 1) return students[0];
    return null;
  }

  /* ---------- Bindings & Boot ---------- */
  window.addEventListener('DOMContentLoaded', ()=>{
    injectStyles();
    ensureShell();
    renderSidebar();
    showView('dashboard');

    // periodically refresh small boxes & current view counts
    setInterval(()=>{
      const activeView = ($('.nav-btn.active')||{}).dataset?.view;
      if (activeView === 'dashboard') renderDashboard();
      else if (activeView === 'tutor-book') drawTutorList();
      else if (activeView === 'counsellor-book') drawCounsellorList();
      // refresh little pieces
      renderTutorBookingSmallBox();
      renderCounsellingBookingSmallBox();
    }, 2500);
  });

  // expose for debug if needed
  window.__studentPortal = {
    loadDB, saveDB, uid, formatDate, showView
  };

})();
