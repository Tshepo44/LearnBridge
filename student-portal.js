/* student-portal.js
   Student Portal - Unified LearnBridge Storage
   STORAGE_KEY: 'learnbridge_data'
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00'; // matches your portal's orange

  /* ---------- Utilities ---------- */
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();

  /* ---------- Storage ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[
        {"id":"t1","role":"tutor","name":"John Smith","department":"Math","module":"Calculus","active":true},
        {"id":"t2","role":"tutor","name":"Jane Doe","department":"Physics","module":"Mechanics","active":true}
      ],
      "audit":[],
      "sessions":{},
      "tutorData":{},
      "studentData":{},
      "counsellorData":{},
      "tutoringRequests":[]
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

  /* ---------- Login Simulation ---------- */
  // Call this after your login form submits
  function loginStudent(studentId, studentName){
    const db = loadDB();
    db.currentStudent = { id: studentId, name: studentName };
    saveDB(db);
  }

  /* ---------- Initialize UI ---------- */
  function buildUI() {
    const container = $('.portal-container');
    if(!container) return;

    container.innerHTML += `
      <div class="student-dashboard" style="display:flex;flex-direction:row;gap:20px;margin-top:20px;">
        <aside class="side" style="width:260px;background:linear-gradient(180deg,${THEME_COLOR},#222);color:#fff;padding:20px;border-radius:12px;flex-shrink:0;">
          <h2 style="text-align:center;margin-bottom:20px;font-weight:700;font-size:1.2rem;">Student Portal</h2>
          <div class="nav" style="display:flex;flex-direction:column;gap:6px;">
            <button class="nav-btn active" data-view="dashboard" style="padding:12px;border:none;background:rgba(255,255,255,0.05);color:#fff;text-align:left;border-radius:8px;cursor:pointer;font-weight:600;">🏠 Dashboard</button>
            <button class="nav-btn" data-view="tutor-booking" style="padding:12px;border:none;background:transparent;color:#fff;text-align:left;border-radius:8px;cursor:pointer;font-weight:600;">📚 Tutor Booking</button>
          </div>
          <div style="padding:12px;color:rgba(255,255,255,.85);text-align:center;margin-top:30px;font-size:0.9rem;">
            ${getCurrentStudent()?.name || 'Student'} • UJ
          </div>
        </aside>

        <main class="content" style="flex:1;min-height:400px;overflow:auto;">
          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    renderSidebarHandlers();
    showView('dashboard');
  }

  /* ---------- Current Student ---------- */
  function getCurrentStudent() {
    return loadDB().currentStudent || null;
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
    else container.innerHTML = `<div style="padding:20px;">Coming Soon</div>`;
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const tutors = loadUsers().filter(u=>u.role==='tutor');
    const activeTutors = tutors.filter(t=>t.active).length;

    $('#viewContainer').innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;">
        <div class="card" id="tutorSmallBox" style="flex:1 1 250px;background:#fff;padding:20px;border-radius:14px;box-shadow:0 6px 25px rgba(0,0,0,.15);cursor:pointer;transition:0.2s;">
          <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;">📚 Tutor Booking</div>
          <div style="margin-bottom:6px;">Click to make a request</div>
          <div style="font-size:1.2rem;font-weight:700;color:${THEME_COLOR};"><b>${activeTutors}</b> active tutors</div>
        </div>
      </div>
    `;

    const box = $('#tutorSmallBox');
    box.onmouseenter = ()=> box.style.transform='scale(1.03)';
    box.onmouseleave = ()=> box.style.transform='scale(1)';
    box.onclick = ()=> {
      $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='tutor-booking'));
      showView('tutor-booking');
    };
  }

  /* ---------- Tutor Booking ---------- */
  function renderTutorBooking() {
    const users = loadUsers().filter(u=>u.role==='tutor' && u.active);

    $('#viewContainer').innerHTML = `
      <div class="card" style="padding:20px;border-radius:14px;box-shadow:0 6px 25px rgba(0,0,0,.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-weight:700;font-size:1.2rem">📚 Tutor Booking</div>
          <button class="btn ghost" id="backDash" style="padding:6px 12px;border-radius:8px;background:rgba(0,0,0,0.05);cursor:pointer;">← Dashboard</button>
        </div>
        <input type="text" id="searchTutor" placeholder="Search by name, module, department" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;margin-bottom:16px;"/>
        <div style="margin-bottom:12px;"><b>${users.length}</b> active tutors</div>
        <div id="tutorList" style="display:flex;flex-direction:column;gap:12px;"></div>
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
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-radius:12px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.1);transition:0.2s;">
          <div>
            <div style="font-weight:600;color:#333;"><b>${t.name}</b> (${t.department})</div>
            <div style="color:#666;">${t.module}</div>
          </div>
          <button class="btn primary" data-id="${t.id}" style="padding:8px 14px;border-radius:8px;background:${THEME_COLOR};color:#fff;cursor:pointer;transition:0.2s;">📅 Book</button>
        </div>
      `).join('');

      $$('button[data-id]').forEach(b=>{
        b.onmouseenter = ()=> b.style.transform='scale(1.05)';
        b.onmouseleave = ()=> b.style.transform='scale(1)';
        b.onclick = ()=> openBookingModal(filtered.find(u=>u.id===b.dataset.id));
      });
    }
  }

  /* ---------- Booking Modal ---------- */
  function openBookingModal(tutor) {
    const student = getCurrentStudent() || { id:'unknown', name:'Student' };
    const m = document.createElement('div');
    m.className="modal-back";
    m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;";
    m.innerHTML=`
      <div class="modal" style="background:#fff;padding:24px;border-radius:14px;width:100%;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-weight:700;font-size:1.1rem;">Book Tutor</div>
          <button class="btn" id="closeX" style="cursor:pointer;">✖</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label>Name</label>
          <input type="text" value="${student.name}" disabled style="padding:8px;border-radius:6px;border:1px solid #ccc;"/>
          <label>Department</label>
          <input type="text" value="${tutor.department}" disabled style="padding:8px;border-radius:6px;border:1px solid #ccc;"/>
          <label>Module</label>
          <input type="text" value="${tutor.module}" disabled style="padding:8px;border-radius:6px;border:1px solid #ccc;"/>
          <label>Date & Time</label>
          <input type="datetime-local" id="sessionDate" style="padding:8px;border-radius:6px;border:1px solid #ccc;"/>
          <label>Topic / Help Needed</label>
          <textarea id="topicHelp" rows="3" style="padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button class="btn primary" id="bookBtn" style="padding:8px 14px;border-radius:8px;background:${THEME_COLOR};color:#fff;cursor:pointer;">📩 Book</button>
          <button class="btn warn" id="cancelBtn" style="padding:8px 14px;border-radius:8px;background:#ff4d4f;color:#fff;cursor:pointer;">Cancel</button>
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
        studentName: student.name,
        studentId: student.id,
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

  // EXAMPLE: simulate login (replace with your actual login inputs)
  // loginStudent('stu567','Karabo'); 

})();


