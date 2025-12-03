/* student-portal.js
   Student Portal + Tutor Booking (single file)
   - Uses shared STORAGE_KEY = 'learnbridge_data' (same as admin-portal.js)
   - Adds "📘 Tutor Book" to the left sidebar and a Tutor Booking small box on Dashboard
   - Implements search by name/module/department, Active tutors count, booking modal
   - Booking writes to db.tutoringRequests, studentData, tutorData and records an audit entry
   - Theme color matches admin portal: #ff7a00
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  /* ---------- DB helpers (shared) ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users": [],
      "audit": [],
      "sessions": {},
      "tutorData": {},
      "studentData": {},
      "counsellorData": {},
      "tutoringRequests": []
    }`);
  }

  function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    try { return iso ? new Date(iso).toLocaleString() : '—'; } catch(e) { return '—'; }
  }

  function recordAudit(action, by = 'system', details = '') {
    const db = loadDB();
    db.audit = db.audit || [];
    db.audit.unshift({ id: uid(), action, by, details, time: nowISO() });
    saveDB(db);
  }

  /* ---------- Utilities ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Ensure DB exists ---------- */
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveDB({
      users: [],
      audit: [],
      sessions: {},
      tutorData: {},
      studentData: {},
      counsellorData: {},
      tutoringRequests: []
    });
  }

  /* ---------- UI injection: Adds small styles compatible with admin portal ---------- */
  function injectStyles() {
    if (document.getElementById('studentPortalStyles')) return;
    const style = document.createElement('style');
    style.id = 'studentPortalStyles';
    style.textContent = `
      :root { --theme: ${THEME_COLOR}; --panel: #fff; --muted: #666; --radius: 12px; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
      .student-card-note { font-size: 0.95rem; color: #333; }
      .modal-back.student { z-index: 9999; }
      .booking-row { display:flex; gap:8px; }
      .booking-row > div { flex:1; }
      .disabled-note { color: #a00; font-weight:600; }
    `;
    document.head.appendChild(style);
  }

  /* ---------- Add Tutor Book sidebar button & Dashboard small box ---------- */
  function initStudentPortalIntegration() {
    // Wait for admin UI to exist
    setTimeout(() => {
      const nav = document.querySelector('.side .nav');
      if (nav && !nav.querySelector('[data-view="tutor-book"]')) {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.view = 'tutor-book';
        btn.textContent = '📘 Tutor Book';
        nav.appendChild(btn);

        // Re-bind sidebar handlers if admin has renderSidebarHandlers
        if (typeof renderSidebarHandlers === 'function') renderSidebarHandlers();
        else bindLocalSidebarButtons(); // lightweight fallback
      }
      renderTutorBookingSmallBox();
    }, 120);
  }

  /* ---------- Render Tutor Booking small box on Dashboard ---------- */
  function renderTutorBookingSmallBox() {
    const container = document.querySelector('#viewContainer');
    if (!container) return;

    const cards = container.querySelector('.cards');
    if (!cards) return;

    const old = cards.querySelector('.tutor-booking-small');
    if (old) old.remove();

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
      // activate the sidebar view
      $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'tutor-book'));
      showTutorBookingView();
    };

    cards.appendChild(card);
  }

  /* ---------- Tutor Booking View (Student-facing) ---------- */
  function showTutorBookingView() {
    const container = document.querySelector('#viewContainer');
    if (!container) return;

    const db = loadDB();
    const tutors = (db.users || []).filter(u => u.role === 'tutor') || [];
    const activeTutors = tutors.filter(t => t.active === true);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
          <div class="small-muted">Search tutors by name, module, or department. Book a session.</div>
        </div>
        <button id="backToDashFromTut" class="btn ghost">← Dashboard</button>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="small-muted">Active tutors: <b id="activeTutorCount">${activeTutors.length}</b></div>
          <div class="small-muted">Total tutors: <b>${tutors.length}</b></div>
        </div>

        <div class="search-row" style="align-items:center">
          <input type="text" id="tbSearch" placeholder="Search by tutor name, module or department" style="flex:1" />
          <input type="text" id="tbModule" placeholder="Module (optional)" />
          <select id="tbDept" style="min-width:160px">
            <option value="">All Departments</option>
          </select>
          <button id="tbRefresh" class="btn">🔄</button>
        </div>

        <div id="tbList" style="margin-top:12px"></div>
      </div>
    `;

    $('#backToDashFromTut').onclick = () => showView('dashboard');
    $('#tbRefresh').onclick = () => drawTutorList();
    $('#tbSearch').oninput = () => drawTutorList();
    $('#tbModule').oninput = () => drawTutorList();
    $('#tbDept').onchange = () => drawTutorList();

    populateDepartments();
    drawTutorList();
  }

  function populateDepartments() {
    const db = loadDB();
    const tutors = (db.users || []).filter(u => u.role === 'tutor');
    const depts = Array.from(new Set(tutors.map(t => (t.department || '').trim()).filter(Boolean))).sort();
    const sel = $('#tbDept');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  function drawTutorList() {
    const db = loadDB();
    const tutors = (db.users || []).filter(u => u.role === 'tutor') || [];
    const activeTutors = tutors.filter(t => t.active === true) || [];

    const search = ($('#tbSearch')?.value || '').toLowerCase();
    const moduleQ = ($('#tbModule')?.value || '').toLowerCase();
    const dept = ($('#tbDept')?.value || '').toLowerCase();

    const listEl = $('#tbList');
    if (!listEl) return;

    let list = tutors.slice();
    if (dept) list = list.filter(t => (t.department || '').toLowerCase() === dept);
    if (moduleQ) list = list.filter(t => (t.modules || []).join(' ').toLowerCase().includes(moduleQ));
    if (search) list = list.filter(t => [t.name, t.displayName, (t.modules || []).join(' '), (t.department || '')].join(' ').toLowerCase().includes(search));

    if (list.length === 0) {
      listEl.innerHTML = `<div class="empty">No tutors found. Active tutors: <b>${activeTutors.length}</b>.</div>`;
      $('#activeTutorCount').textContent = activeTutors.length;
      return;
    }

    listEl.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Department</th><th>Module(s)</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map(t => `
            <tr data-id="${t.id}">
              <td>${escapeHtml(t.name || t.displayName || '—')}</td>
              <td>${escapeHtml(t.department || '—')}</td>
              <td>${escapeHtml((t.modules || []).join(', ') || '—')}</td>
              <td>${t.active ? '🟢 Active' : '⚪ Offline'}</td>
              <td><button class="btn primary tb-book-btn" data-id="${t.id}">Book</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    $('#activeTutorCount').textContent = activeTutors.length;

    $$('.tb-book-btn').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      const tutor = (db.users || []).find(u => u.id === id);
      openBookingModal(tutor);
    });
  }

  /* ---------- Booking modal ---------- */
  function openBookingModal(tutor) {
    const db = loadDB();
    const sessionUser = getCurrentStudent();

    // build modal
    const m = document.createElement('div');
    m.className = 'modal-back student';
    m.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700">Book Tutor — ${escapeHtml(tutor ? (tutor.name || tutor.displayName) : '—')}</div>
          <button class="btn" id="modalCloseBtn">✖</button>
        </div>

        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <label style="font-weight:600">Student</label>
          <input type="text" id="bmStudent" value="${escapeHtml(sessionUser ? (sessionUser.name || sessionUser.displayName || sessionUser.studentNumber) : '')}" readonly />

          <label style="font-weight:600">Tutor</label>
          <input type="text" id="bmTutor" value="${escapeHtml(tutor ? (tutor.name || tutor.displayName) : '')}" readonly />

          <div style="display:flex;gap:8px">
            <div style="flex:1">
              <label style="font-weight:600">Department</label>
              <input type="text" id="bmDept" value="${escapeHtml(tutor ? tutor.department || '' : '')}" readonly />
            </div>
            <div style="flex:1">
              <label style="font-weight:600">Module</label>
              <input type="text" id="bmModule" value="${escapeHtml(tutor ? (tutor.modules || []).slice(0,3).join(', ') : '')}" readonly />
            </div>
          </div>

          <div style="display:flex;gap:8px" class="booking-row">
            <div><label style="font-weight:600">Preferred date</label><input type="date" id="bmDate" /></div>
            <div><label style="font-weight:600">Preferred time</label><input type="time" id="bmTime" /></div>
          </div>

          <label style="font-weight:600">Short note (what you need help with)</label>
          <textarea id="bmNote" placeholder="Write a short paragraph explaining the topic you need help with"></textarea>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
            <button class="btn ghost" id="bmCancel">Cancel</button>
            <button class="btn primary" id="bmSend">Book</button>
          </div>

          <div id="bmStatus" style="margin-top:8px;color:#666;font-size:13px"></div>
        </div>
      </div>
    `;

    document.body.appendChild(m);
    $('#modalCloseBtn', m).onclick = () => m.remove();
    $('#bmCancel', m).onclick = () => m.remove();

    $('#bmSend', m).onclick = () => {
      const date = $('#bmDate', m).value;
      const time = $('#bmTime', m).value;
      const note = ($('#bmNote', m).value || '').trim();

      if (!sessionUser) {
        alert('You must be signed in as a student to book. (For testing: create a student in learnbridge_data.users or set localStorage.currentUser)');
        return;
      }

      if (!date || !time) {
        alert('Please select preferred date and time.');
        return;
      }

      // combine date/time into ISO
      let dt;
      try {
        dt = new Date(date + 'T' + time);
        if (isNaN(dt.getTime())) throw new Error('invalid date');
      } catch (e) {
        alert('Invalid date/time chosen.');
        return;
      }

      // create booking
      const booking = {
        id: uid(),
        tutorId: tutor.id,
        tutorName: tutor.name || tutor.displayName || '',
        studentId: sessionUser.id,
        studentName: sessionUser.name || sessionUser.displayName || sessionUser.studentNumber || '',
        module: (tutor.modules && tutor.modules.length) ? tutor.modules[0] : '',
        department: tutor.department || '',
        datetime: dt.toISOString(),
        comment: note,
        status: 'pending',
        createdAt: nowISO()
      };

      // save to DB
      const db2 = loadDB();
      db2.tutoringRequests = db2.tutoringRequests || [];
      db2.tutoringRequests.unshift(booking);

      // update studentData -> pendingRequests
      db2.studentData = db2.studentData || {};
      db2.studentData[sessionUser.id] = db2.studentData[sessionUser.id] || { pendingRequests: [] };
      db2.studentData[sessionUser.id].pendingRequests = db2.studentData[sessionUser.id].pendingRequests || [];
      db2.studentData[sessionUser.id].pendingRequests.push(booking.id);

      // update tutorData -> notifications + pendingRequests
      db2.tutorData = db2.tutorData || {};
      db2.tutorData[tutor.id] = db2.tutorData[tutor.id] || { notifications: [], pendingRequests: [] };
      db2.tutorData[tutor.id].notifications.unshift({
        id: uid(),
        type: 'booking',
        bookingId: booking.id,
        message: `New booking request from ${booking.studentName}`,
        time: nowISO(),
        read: false
      });
      db2.tutorData[tutor.id].pendingRequests.push(booking.id);

      saveDB(db2);
      recordAudit('Student booking created', sessionUser.id, `booking:${booking.id}`);

      // UX feedback
      alert('Booking request sent — it appears in your Pending Requests (coming soon). The tutor will be notified.');
      m.remove();
      renderTutorBookingSmallBox();
      // refresh views if visible
      if (document.querySelector('#tbList')) drawTutorList();
      if (document.querySelector('#tutBody') && typeof drawTutTab === 'function') drawTutTab('pending');
    };
  }

  /* ---------- Get current student (from sessions / localStorage) ---------- */
  function getCurrentStudent() {
    const db = loadDB();
    // 1) sessions.currentUser
    if (db.sessions && db.sessions.currentUser && db.sessions.currentUser.role === 'student') return db.sessions.currentUser;
    // 2) localStorage.currentUser (common demo pattern)
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (cu && cu.role === 'student') return cu;
    } catch (e) { /* ignore */ }

    // 3) pick first student if only one exists (convenience for demo) — but don't fake login if multiple students
    const students = (db.users || []).filter(u => u.role === 'student');
    if (students.length === 1) return students[0];
    return null;
  }

  /* ---------- Fallback sidebar binding if admin doesn't provide renderSidebarHandlers ---------- */
  function bindLocalSidebarButtons() {
    $$('.nav-btn').forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        $$('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        if (view === 'dashboard') showView('dashboard');
        else if (view === 'tutor-book') showTutorBookingView();
        else if (view === 'tutoring-requests' && typeof showTutoringRequestsView === 'function') showTutoringRequestsView();
        else showView(view);
      });
    });
  }

  /* ---------- Minimal showView shim so this file can call showView('dashboard') etc. ---------- */
  function showView(v) {
    if (typeof window.showView === 'function') return window.showView(v);
    // fallback: attempt to call global showView, otherwise try renderDashboardLocal
    if (v === 'dashboard') renderDashboardLocalFallback();
    else if (v === 'tutor-book') showTutorBookingView();
  }

  function renderDashboardLocalFallback() {
    const root = document.getElementById('viewContainer');
    if (!root) return;
    root.innerHTML = `<div class="card"><h3>Dashboard</h3><p class="muted">Dashboard initialised.</p></div>`;
  }

  /* ---------- Boot & watchers ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    initStudentPortalIntegration();
    bindLocalSidebarButtons();

    // refresh small box periodically to reflect DB changes (useful during testing)
    setInterval(renderTutorBookingSmallBox, 2500);
  });

  // also update immediately if admin triggers renderDashboard (best-effort)
  if (typeof window.renderDashboard === 'function') {
    window.renderDashboard = (function(orig){
      return function() {
        try { orig(); } catch(e) {}
        // re-add student box
        renderTutorBookingSmallBox();
      };
    })(window.renderDashboard);
  }

})();
