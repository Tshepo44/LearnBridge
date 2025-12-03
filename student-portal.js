/* student-tutoring.js
   Student-facing Tutoring Booking Module for LearnBridge
   - Uses the same STORAGE_KEY = 'learnbridge_data' as admin-portal.js
   - Injects a Tutor Booking small box on the Dashboard (right side) and a "Tutor Book" sidebar entry
   - Provides a Tutoring search/list view that lists active tutors (initially 0)
   - Booking flow: Book button -> modal with auto-filled uneditable student/tutor/module/department -> pick date/time + comment -> sends booking into tutoringRequests and writes tutor notification + student's pendingRequests
   - All data is stored in localStorage under the unified DB shape.
   - Safe: if no current user is present, student fields show placeholders and booking is blocked with friendly message.

   Drop this file into your project and include it after admin-portal.js so both share storage.
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';

  // ---------- DB helpers (shared shape) ----------
  function loadDB(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[],
      "audit":[],
      "sessions":{},
      "tutorData":{},
      "studentData":{},
      "counsellorData":{},
      "tutoringRequests":[]
    }`);
  }

  function saveDB(db){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
  function now(){ return new Date().toISOString(); }
  function formatDate(iso){ return iso ? new Date(iso).toLocaleString() : '—'; }

  function recordAudit(action, by='system', details=''){
    const db = loadDB();
    db.audit = db.audit || [];
    db.audit.unshift({ id: uid(), action, by, details, time: now() });
    saveDB(db);
  }

  // ---------- Convenience selectors ----------
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ---------- Init: add sidebar button & dashboard small box ----------
  function initStudentTutoring(){
    // add sidebar button (if side nav exists)
    setTimeout(() => {
      const nav = document.querySelector('.side .nav');
      if(nav && !nav.querySelector('[data-view="tutor-book"]')){
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.view = 'tutor-book';
        btn.textContent = '📘 Tutor Book';
        nav.appendChild(btn);
        // rebind sidebar handlers if renderSidebarHandlers exists globally
        if(typeof renderSidebarHandlers === 'function') renderSidebarHandlers();
      }

      // render small box on dashboard if dashboard cards exist
      renderTutorBookingSmallBox();
    }, 120);
  }

  // ---------- Small box shown on Dashboard (right side/card area) ----------
  function renderTutorBookingSmallBox(){
    const container = document.querySelector('#viewContainer');
    if(!container) return; // dashboard not loaded yet

    const cards = container.querySelector('.cards');
    if(!cards) return;

    const old = cards.querySelector('.tutor-booking-small');
    if(old) old.remove();

    const db = loadDB();
    const tutors = (db.users || []).filter(u => u.role === 'tutor');
    const activeTutors = tutors.filter(t => t.active === true);
    const pending = (db.tutoringRequests || []).filter(r => r.status === 'pending').length;

    const card = document.createElement('div');
    card.className = 'card tutor-booking-small';
    card.style.minWidth = '220px';
    card.style.cursor = 'pointer';

    card.innerHTML = `
      <div class="title">📚 Tutor Booking</div>
      <div style="margin-top:10px;font-size:0.95rem;">
        <div>Click to make a request</div>
        <div style="margin-top:8px"><b>${activeTutors.length}</b> active tutors</div>
        <div style="margin-top:6px" class="small-muted"><b>${pending}</b> pending requests</div>
      </div>
      <div class="small-muted" style="margin-top:10px">Click to open booking →</div>
    `;

    card.onclick = () => {
      // activate sidebar button
      $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'tutor-book'));
      showTutorBookingView();
    };

    cards.appendChild(card);
  }

  // ---------- Tutor Booking View (student-facing) ----------
  function showTutorBookingView(){
    const container = document.querySelector('#viewContainer');
    if(!container) return;

    const db = loadDB();
    const tutors = (db.users || []).filter(u => u.role === 'tutor');
    const activeTutors = tutors.filter(t => t.active === true);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
          <div class="small-muted">Search for tutors by name, module or department. Book a session.</div>
        </div>
        <button id="backToDashFromTut" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="small-muted">Active tutors: <b id="activeTutorCount">${activeTutors.length}</b></div>
          <div class="small-muted">Total tutors: <b>${tutors.length}</b></div>
        </div>

        <div class="search-row">
          <input type="text" id="tbSearch" placeholder="Search by tutor name, module or department" style="flex:1" />
          <select id="tbDept">
            <option value="">All Departments</option>
            <!-- departments will be populated dynamically -->
          </select>
          <button id="tbRefresh" class="btn">🔄</button>
        </div>

        <div id="tbList" style="margin-top:12px"></div>
      </div>
    `;

    $('#backToDashFromTut').onclick = () => showView('dashboard');
    $('#tbRefresh').onclick = () => drawTutorList();
    $('#tbSearch').oninput = () => drawTutorList();
    $('#tbDept').onchange = () => drawTutorList();

    populateDepartments();
    drawTutorList();
  }

  function populateDepartments(){
    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor');
    const depts = Array.from(new Set(tutors.map(t=>t.department||'').filter(Boolean))).sort();
    const sel = $('#tbDept');
    if(!sel) return;
    sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]/, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]||c)); }

  function drawTutorList(){
    const db = loadDB();
    const tutors = (db.users || []).filter(u=>u.role==='tutor');
    const activeTutors = tutors.filter(t=>t.active === true);

    const search = ($('#tbSearch')?.value || '').toLowerCase();
    const dept = ($('#tbDept')?.value || '');

    const listEl = $('#tbList');
    if(!listEl) return;

    let list = tutors.slice();
    if(dept) list = list.filter(t => (t.department||'').toLowerCase() === dept.toLowerCase());
    if(search) list = list.filter(t => [t.name,t.displayName,t.module,(t.department||'')].join(' ').toLowerCase().includes(search));

    if(list.length === 0){
      listEl.innerHTML = `<div class="empty">No tutors found. Active tutors: <b>${activeTutors.length}</b>.</div>`;
      $('#activeTutorCount').textContent = activeTutors.length;
      return;
    }

    // render table
    listEl.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Department</th><th>Module(s)</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map(t => `
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

    $('#activeTutorCount').textContent = activeTutors.length;

    // bind buttons
    $$('.tb-book-btn').forEach(b => b.onclick = (e) => {
      const id = b.dataset.id;
      const tutor = (db.users||[]).find(u=>u.id===id);
      openBookingModal(tutor);
    });
  }

  // ---------- Booking Modal ----------
  function openBookingModal(tutor){
    const db = loadDB();

    const sessionUser = getCurrentStudent();

    const m = document.createElement('div');
    m.className = 'modal-back';
    m.style.zIndex = 9999;

    const tutorName = tutor ? (tutor.name || tutor.displayName || '—') : 'Unknown tutor';
    const tutorDept = tutor ? (tutor.department || '—') : '—';
    const tutorModules = tutor ? (tutor.modules || []).join(', ') : '—';

    const studentName = sessionUser ? (sessionUser.name || sessionUser.displayName || sessionUser.studentNumber || 'Student') : 'Not signed in';
    const studentId = sessionUser ? sessionUser.id : null;

    m.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700">Book Tutor — ${escapeHtml(tutorName)}</div>
          <button class="btn" id="modalCloseBtn">✖</button>
        </div>

        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <label>Student</label>
          <input type="text" id="bmStudent" value="${escapeHtml(studentName)}" readonly />

          <label>Tutor</label>
          <input type="text" id="bmTutor" value="${escapeHtml(tutorName)}" readonly />

          <div style="display:flex;gap:8px">
            <div style="flex:1">
              <label>Department</label>
              <input type="text" id="bmDept" value="${escapeHtml(tutorDept)}" readonly />
            </div>
            <div style="flex:1">
              <label>Module</label>
              <input type="text" id="bmModule" value="${escapeHtml(tutorModules)}" readonly />
            </div>
          </div>

          <div style="display:flex;gap:8px">
            <div style="flex:1">
              <label>Preferred date</label>
              <input type="date" id="bmDate" />
            </div>
            <div style="flex:1">
              <label>Preferred time</label>
              <input type="time" id="bmTime" />
            </div>
          </div>

          <label>Short note (what you need help with)</label>
          <textarea id="bmNote" placeholder="Write a short paragraph explaining the topic you need help with"></textarea>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
            <button class="btn ghost" id="bmCancel">Cancel</button>
            <button class="btn primary" id="bmSend">Book</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(m);

    $('#modalCloseBtn').onclick = () => m.remove();
    $('#bmCancel').onclick = () => m.remove();

    $('#bmSend').onclick = () => {
      const date = $('#bmDate').value;
      const time = $('#bmTime').value;
      const note = ($('#bmNote').value || '').trim();

      if(!studentId){
        alert('You must be signed in as a student to book.');
        return;
      }

      if(!date || !time){
        alert('Please select preferred date and time.');
        return;
      }

      // compose booking
      const datetime = new Date(date + 'T' + time);
      const booking = {
        id: uid(),
        tutorId: tutor.id,
        tutorName: tutorName,
        studentId: studentId,
        studentName: studentName,
        module: tutor.modules && tutor.modules.length ? tutor.modules[0] : '',
        department: tutorDept,
        datetime: datetime.toISOString(),
        comment: note,
        status: 'pending',
        createdAt: now()
      };

      // save to db.tutoringRequests
      const db2 = loadDB();
      db2.tutoringRequests = db2.tutoringRequests || [];
      db2.tutoringRequests.unshift(booking);

      // update student's pendingRequests (studentData)
      db2.studentData = db2.studentData || {};
      db2.studentData[studentId] = db2.studentData[studentId] || { pendingRequests: [] };
      db2.studentData[studentId].pendingRequests = db2.studentData[studentId].pendingRequests || [];
      db2.studentData[studentId].pendingRequests.push(booking.id);

      // push notification to tutor (tutorData)
      db2.tutorData = db2.tutorData || {};
      db2.tutorData[tutor.id] = db2.tutorData[tutor.id] || { notifications: [], pendingRequests: [] };
      db2.tutorData[tutor.id].notifications.unshift({ id: uid(), type: 'booking', bookingId: booking.id, message: `New booking request from ${studentName}`, time: now(), read: false });
      db2.tutorData[tutor.id].pendingRequests.push(booking.id);

      saveDB(db2);
      recordAudit('Student booking created', studentId, `booking:${booking.id}`);

      // UI updates
      alert('Booking request sent — it will appear in your Pending Requests.');
      m.remove();
      // refresh lists and small box
      renderTutorBookingSmallBox();
      if(document.querySelector('#tutBody')) drawTutTab && drawTutTab('pending');
      if(document.querySelector('#tbList')) drawTutorList();
    };
  }

  // ---------- Helpers: get current student from sessions or localStorage ----------
  function getCurrentStudent(){
    const db = loadDB();
    // common patterns: db.sessions.currentUser, localStorage.currentUser, or db.users with role student and flagged `current`.
    if(db.sessions && db.sessions.currentUser) return db.sessions.currentUser;
    try{
      const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if(cu && cu.role === 'student') return cu;
    }catch(e){}

    // fallback: pick first student user (only for testing/demo) — but do not pretend login
    const students = (db.users || []).filter(u=>u.role==='student');
    if(students.length === 1) return students[0];
    return null;
  }

  // ---------- Wire into global showView if available ----------
  function showView(v){
    if(typeof window.showView === 'function') return window.showView(v);
    // if not available, try to render dashboard or tutoring view locally
    if(v === 'dashboard') renderDashboardLocalFallback();
    else if(v === 'tutor-book') showTutorBookingView();
  }

  // Small fallback to try to navigate to dashboard if admin code is missing
  function renderDashboardLocalFallback(){
    const root = document.getElementById('viewContainer');
    if(!root) return;
    root.innerHTML = '<div class="card"><h3>Dashboard</h3><p class="muted">Dashboard not fully initialised in this context.</p></div>';
  }

  // ---------- Boot ----------
  window.addEventListener('DOMContentLoaded', () => {
    initStudentTutoring();
    // re-render small box every 3s to reflect changes while testing
    setInterval(renderTutorBookingSmallBox, 3000);
  });

})();

