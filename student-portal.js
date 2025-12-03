/* student-portal.js
   Student Portal - Unified LearnBridge Storage
   STORAGE_KEY: 'learnbridge_data'
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#0073e6';

  /* ---------- Utilities ---------- */
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();

  /* ---------- Storage ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[], "audit":[], "sessions":{}, "tutorData":{}, "studentData":{}, "counsellorData":{}, "tutoringRequests":[],"currentStudent":{"id":"stu123","name":"Student User"}
    }`);
  }
  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  function loadUsers() { return loadDB().users || []; }
  function loadTutoring() { return loadDB().tutoringRequests || []; }
  function recordAudit(action, by='student', details=''){ 
    const db = loadDB();
    db.audit.unshift({id:uid(), action, by, details, time:now()});
    saveDB(db);
  }

  /* ---------- Initialize UI ---------- */
  function buildUI() {
    const container = $('.portal-container');
    if(!container) return;

    container.innerHTML += `
      <div class="student-dashboard" style="display:flex;flex-direction:row;gap:20px;margin-top:20px;">
        <aside class="side" style="width:260px;background:linear-gradient(180deg,${THEME_COLOR},#222);color:#fff;padding:12px 0;border-radius:12px;flex-shrink:0;">
          <h2 style="text-align:center;margin-bottom:10px;">Student Portal</h2>
          <div class="nav">
            <button class="nav-btn active" data-view="dashboard" style="width:100%;padding:10px;border:none;background:none;color:#fff;text-align:left;cursor:pointer;">🏠 Dashboard</button>
            <button class="nav-btn" data-view="tutor-booking" style="width:100%;padding:10px;border:none;background:none;color:#fff;text-align:left;cursor:pointer;">📚 Tutor Booking</button>
          </div>
          <div style="padding:12px;color:rgba(255,255,255,.85);text-align:center;margin-top:20px;">Student • UJ</div>
        </aside>

        <main class="content" style="flex:1;min-height:400px;overflow:auto;">
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
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div class="card" style="min-width:200px;cursor:pointer;padding:12px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.1);" id="tutorSmallBox">
          <div style="font-weight:700;margin-bottom:6px;">📚 Tutor Booking</div>
          <div style="margin-bottom:6px;">Click to make a request</div>
          <div><b>${activeTutors}</b> active tutors</div>
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

    $('#viewContainer').innerHTML = `
      <div class="card" style="padding:16px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.1);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;font-size:1.2rem">📚 Tutor Booking</div>
          <button class="btn ghost" id="backDash" style="padding:6px 10px;">← Dashboard</button>
        </div>
        <input type="text" id="searchTutor" placeholder="Search by name, module, department" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;margin-bottom:10px;" />
        <div><b>${users.length}</b> active tutors</div>
        <div id="tutorList" style="margin-top:10px;"></div>
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
      if(filtered.length===0){ list.innerHTML='<div>No tutors found</div>'; return; }

      list.innerHTML = filtered.map(t=>`
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin-bottom:10px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.08);">
          <div>
            <div><b>${t.name}</b> (${t.department})</div>
            <div>${t.module}</div>
          </div>
          <button class="btn primary" data-id="${t.id}" style="padding:6px 10px;">📅 Book</button>
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
    m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;";
    m.innerHTML=`
      <div class="modal" style="background:#fff;padding:18px;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,.25);">
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

