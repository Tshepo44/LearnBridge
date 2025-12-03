/* student-portal.js
   Student Portal – LearnBridge Unified Storage System
   STORAGE KEY: 'learnbridge_data'

   Structure:
   {
     users: [],
     audit: [],
     sessions: {},
     tutorData: {},
     studentData: {
        bookingRequests: [],    // <— student pending requests
        counsellingRequests: [] // <— student pending counsellor bookings
     },
     counsellorData: {}
   }
*/

(() => {

  /* ---------- CONSTANTS ---------- */
  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  /* ---------- DB Helpers ---------- */
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || `{
      "users":[],
      "audit":[],
      "sessions":{},
      "tutorData":{},
      "studentData":{"bookingRequests":[],"counsellingRequests":[]},
      "counsellorData":{}
    }`);
  }

  function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  /* ---------- Student Data Helpers ---------- */
  function loadStudentRequests() {
    const db = loadDB();
    db.studentData = db.studentData || { bookingRequests: [], counsellingRequests: [] };
    return db.studentData;
  }

  function saveStudentRequests(data) {
    const db = loadDB();
    db.studentData = data;
    saveDB(db);
  }

  /* ---------- Utility ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : "—";

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ---------- Ensure DB Exists ---------- */
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveDB({
      users: [],
      audit: [],
      sessions: {},
      tutorData: {},
      studentData: {
        bookingRequests: [],
        counsellingRequests: []
      },
      counsellorData: {}
    });
  }

  /* ---------- UI Builder ---------- */
  function buildUI() {

    /* Inject Styles */
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{
          --theme:${THEME_COLOR};
          --panel:#fff;
          --muted:#555;
          --radius:12px;
          font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto;
        }
        *{box-sizing:border-box}
        body{
          margin:0;
          background:linear-gradient(135deg,#020611,#001f12);
          color:#222;
          min-height:100vh;
          padding:20px;
          display:flex;
          justify-content:center;
        }
        .portal{
          width:100%;
          max-width:1200px;
        }
        .student-dashboard{
          width:100%;
          margin-top:12px;
          display:flex;
          background:rgba(255,255,255,0.97);
          border-radius:var(--radius);
          overflow:hidden;
          box-shadow:0 12px 40px rgba(0,0,0,.25);
        }
        .side{
          width:260px;
          background:linear-gradient(180deg,var(--theme),#222);
          color:#fff;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          padding:12px 0;
        }
        .side h2{
          margin:0;
          padding:12px;
          text-align:center;
          font-size:1.1rem;
          border-bottom:1px solid rgba(255,255,255,.1);
        }
        .nav{display:flex;flex-direction:column}
        .nav button{
          background:none;
          border:none;
          color:#fff;
          padding:12px 18px;
          text-align:left;
          cursor:pointer;
          font-size:14px;
          border-top:1px solid rgba(255,255,255,.06);
        }
        .nav button.active,
        .nav button:hover{
          background:rgba(255,255,255,.08);
        }
        .content{
          flex:1;
          padding:18px;
          max-height:calc(100vh - 80px);
          overflow:auto;
        }
        .topbar{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:12px;
        }
        .tag{
          padding:6px 10px;
          background:#eee;
          border-radius:8px;
          font-size:13px;
        }
        .card{
          background:#fff;
          border-radius:10px;
          padding:14px;
          box-shadow:0 6px 16px rgba(0,0,0,.08);
          margin-bottom:12px;
        }
        .cards{
          display:flex;
          flex-wrap:wrap;
          gap:12px;
        }
        .card .title{font-weight:700;margin-bottom:6px}
        .card .big{font-size:1.5rem;font-weight:800;color:var(--theme)}
        .small-muted{color:var(--muted);font-size:13px}
        .empty{
          padding:20px;
          border:2px dashed #ddd;
          text-align:center;
          color:var(--muted);
          border-radius:10px;
        }
        .btn{
          padding:8px 10px;
          border-radius:8px;
          border:none;
          cursor:pointer;
        }
        .btn.primary{background:var(--theme);color:#fff}
        .btn.ghost{background:transparent;border:1px solid #ddd}
        .modal-back{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.4);
          display:flex;
          justify-content:center;
          align-items:center;
          z-index:9999;
        }
        .modal{
          background:#fff;
          padding:18px;
          max-width:600px;
          width:100%;
          border-radius:12px;
          box-shadow:0 10px 40px rgba(0,0,0,.25);
        }
      </style>
    `);

    /* Build Page */
    document.body.innerHTML = `
      <div class="portal">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;font-weight:700;font-size:1.2rem">
          <img src="assets/logos/uj.png" style="height:56px;border-radius:8px;background:#fff;padding:6px"
               onerror="this.style.display='none'"/>
          University of Johannesburg — Student Portal
        </div>

        <div class="student-dashboard">
          
          <!-- Sidebar -->
          <aside class="side">
            <div>
              <h2>Student Menu</h2>
              <div class="nav">
                <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
                <button class="nav-btn" data-view="tutor-booking">📚 Tutor Booking</button>
                <button class="nav-btn" data-view="counsellor-booking">💬 Counsellor Booking</button>
              </div>
            </div>
            <div style="padding:12px">
              <div style="margin-bottom:8px;color:#fff">Student • UJ</div>
              <button id="logoutBtn" class="btn ghost" style="width:100%;color:#fff;border:1px solid rgba(255,255,255,.2)">Logout</button>
            </div>
          </aside>

          <!-- MAIN -->
          <main class="content">
            <div class="topbar">
              <div><strong>Student Portal</strong> <span class="small-muted">— Book Tutors & Counsellors</span></div>
              <div class="tag" id="clockTag">${new Date().toLocaleString()}</div>
            </div>

            <div id="viewContainer"></div>
          </main>

        </div>
      </div>
    `;

    setInterval(() => {
      const el = $('#clockTag');
      if (el) el.textContent = new Date().toLocaleString();
    }, 1000);
  }

  /* ---------- ROUTING ---------- */
  function render() {
    renderSidebarHandlers();
    showView('dashboard');
  }

  function renderSidebarHandlers() {
    $$('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        $$('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      };
    });
  }

  function showView(view) {
    if (view === 'dashboard') renderDashboard();
    if (view === 'tutor-booking') renderTutorBookingPage();   // <-- PART 2
    if (view === 'counsellor-booking') renderCounsellorBookingPage(); // <-- PART 3
  }

  /* ---------- DASHBOARD ---------- */
  function renderDashboard() {
    const studentData = loadStudentRequests();
    const tutors = loadDB().users.filter(u => u.role === "tutor" && u.active);
    const counsellors = loadDB().users.filter(u => u.role === "counsellor" && u.active);

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div class="title">Welcome to LearnBridge Student Portal</div>
        <div class="small-muted">Book tutors, book counsellors, and manage your academic support.</div>
      </div>

      <div class="cards">
        
        <!-- Tutor Booking BOX -->
        <div class="card" id="tutorDashBox" style="cursor:pointer;min-width:240px;flex:1">
          <div class="title">📚 Tutor Booking</div>
          <div class="big">${tutors.length}</div>
          <div class="small-muted">${tutors.length === 0 ? "No active tutors" : "Active tutors available"}</div>
        </div>

        <!-- Counsellor Booking BOX -->
        <div class="card" id="counsellorDashBox" style="cursor:pointer;min-width:240px;flex:1">
          <div class="title">💬 Counsellor Booking</div>
          <div class="big">${counsellors.length}</div>
          <div class="small-muted">${counsellors.length === 0 ? "No active counsellors" : "Active counsellors available"}</div>
        </div>

      </div>
    `;

    $('#tutorDashBox').onclick = () => {
      $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'tutor-booking'));
      renderTutorBookingPage();
    };

    $('#counsellorDashBox').onclick = () => {
      $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'counsellor-booking'));
      renderCounsellorBookingPage();
    };
  }

  /* -------------------------------------------------------------
     END OF PART 1
     NEXT MESSAGE = PART 2 (Tutor Booking Full Module)
  ------------------------------------------------------------- */

  // Expose placeholder functions (filled in Part 2 & 3)
  window.renderTutorBookingPage = function(){};
  window.renderCounsellorBookingPage = function(){};

  buildUI();
  render();

})();

/* -------------------------------------------------------------
   PART 2 — TUTOR BOOKING SYSTEM
   This overwrites the placeholder function from Part 1.
------------------------------------------------------------- */

window.renderTutorBookingPage = function () {

  const db = loadDB();
  const tutors = db.users.filter(u => u.role === "tutor" && u.active);

  $('#viewContainer').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
        <div class="small-muted">Search tutors and submit a booking request</div>
      </div>
      <button class="btn ghost" id="backDash">← Dashboard</button>
    </div>

    <div class="card">

      <div class="title" style="margin-bottom:8px">Search</div>

      <div class="search-row" style="display:flex;gap:12px;margin-bottom:12px">
        <input id="tutorSearchName" type="text" placeholder="Tutor name…" style="flex:1">
        <input id="tutorSearchModule" type="text" placeholder="Module…" style="flex:1">
        <input id="tutorSearchDept" type="text" placeholder="Department…" style="flex:1">
        <button id="tutorSearchBtn" class="btn primary">Search</button>
      </div>

      <div id="tutorResults"></div>

    </div>
  `;

  $('#backDash').onclick = () => showView('dashboard');
  $('#tutorSearchBtn').onclick = () => drawTutorResults();

  drawTutorResults();

  /* ------------ RENDER TUTOR SEARCH RESULTS ------------ */
  function drawTutorResults() {

    const nameQ = ($('#tutorSearchName').value || "").toLowerCase();
    const moduleQ = ($('#tutorSearchModule').value || "").toLowerCase();
    const deptQ = ($('#tutorSearchDept').value || "").toLowerCase();

    let filtered = tutors.filter(t => {
      return (
        (!nameQ || t.name.toLowerCase().includes(nameQ)) &&
        (!moduleQ || (t.module || "").toLowerCase().includes(moduleQ)) &&
        (!deptQ || (t.department || "").toLowerCase().includes(deptQ))
      );
    });

    if (filtered.length === 0) {
      $('#tutorResults').innerHTML = `
        <div class="empty">No active tutors found.</div>
      `;
      return;
    }

    $('#tutorResults').innerHTML = `
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead>
          <tr style="background:#fafafa">
            <th style="padding:8px;text-align:left">Name</th>
            <th style="padding:8px;text-align:left">Department</th>
            <th style="padding:8px;text-align:left">Module</th>
            <th style="padding:8px;text-align:left">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(t => `
            <tr>
              <td style="padding:8px">${escapeHtml(t.name)}</td>
              <td style="padding:8px">${escapeHtml(t.department || "—")}</td>
              <td style="padding:8px">${escapeHtml(t.module || "—")}</td>
              <td style="padding:8px">
                <button class="btn primary" data-id="${t.id}">Book</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    // attach BOOK handlers
    $$('button[data-id]').forEach(btn => {
      btn.onclick = () => openTutorBookingModal(btn.dataset.id);
    });
  }

  /* ------------ BOOKING MODAL ------------ */
  function openTutorBookingModal(tutorID) {

    const db = loadDB();
    const tutor = db.users.find(u => u.id === tutorID);
    const activeStudent = db.sessions.currentStudent || { name: "Student", number: "000000000" };

    const m = document.createElement("div");
    m.className = "modal-back";

    m.innerHTML = `
      <div class="modal">

        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;font-size:1.1rem">Book Tutor</div>
          <button class="btn" id="closeBookX">✖</button>
        </div>

        <div style="margin-top:12px">

          <div style="margin-bottom:10px">
            <label><b>Student Name</b></label>
            <input type="text" value="${escapeHtml(activeStudent.name)}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Tutor Name</b></label>
            <input type="text" value="${escapeHtml(tutor.name)}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Department</b></label>
            <input type="text" value="${escapeHtml(tutor.department || "—")}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Module</b></label>
            <input type="text" value="${escapeHtml(tutor.module || "—")}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Select Date</b></label>
            <input id="bookDate" type="date" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Select Time</b></label>
            <input id="bookTime" type="time" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Topic / Description</b></label>
            <textarea id="bookTopic" rows="4"
              placeholder="Explain the topic you need help with..."
              style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd"></textarea>
          </div>

        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">
          <button class="btn ghost" id="cancelBooking">Cancel</button>
          <button class="btn primary" id="confirmBooking">Book</button>
        </div>

      </div>
    `;

    document.body.appendChild(m);

    $('#closeBookX').onclick = () => m.remove();
    $('#cancelBooking').onclick = () => m.remove();

    $('#confirmBooking').onclick = () => {

      const date = $('#bookDate').value.trim();
      const time = $('#bookTime').value.trim();
      const topic = $('#bookTopic').value.trim();

      if (!date || !time) {
        alert("Please choose both date and time.");
        return;
      }

      const datetimeISO = new Date(`${date}T${time}`).toISOString();

      // Save to studentData.bookingRequests
      const studentData = loadStudentRequests();
      studentData.bookingRequests.unshift({
        id: uid(),
        type: "tutor",
        studentName: activeStudent.name,
        studentNumber: activeStudent.number,
        tutorName: tutor.name,
        tutorID: tutor.id,
        module: tutor.module || "",
        department: tutor.department || "",
        topic: topic || "",
        datetime: datetimeISO,
        status: "pending",
        createdAt: now()
      });

      saveStudentRequests(studentData);

      // placeholder for future tutor notifications
      console.log("Tutor notification placeholder for:", tutor.id);

      m.remove();
      alert("Your tutor booking has been submitted.");

      renderTutorBookingPage();
    };
  }

};

/* -------------------------------------------------------------
   PART 3 — COUNSELLOR BOOKING SYSTEM
   This overwrites the placeholder function from Part 1.
------------------------------------------------------------- */

window.renderCounsellorBookingPage = function () {

  const db = loadDB();
  const counsellors = db.users.filter(u => u.role === "counsellor" && u.active);

  $('#viewContainer').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:1.2rem;font-weight:700">Counsellor Booking</div>
        <div class="small-muted">Search counsellors and submit a counselling request</div>
      </div>
      <button class="btn ghost" id="backDash">← Dashboard</button>
    </div>

    <div class="card">

      <div class="title" style="margin-bottom:8px">Search</div>

      <div class="search-row" style="display:flex;gap:12px;margin-bottom:12px">
        <input id="counSearchName" type="text" placeholder="Counsellor name…" style="flex:1">
        <input id="counSearchDept" type="text" placeholder="Department…" style="flex:1">
        <button id="counSearchBtn" class="btn primary">Search</button>
      </div>

      <div id="counResults"></div>

    </div>
  `;

  $('#backDash').onclick = () => showView('dashboard');
  $('#counSearchBtn').onclick = () => drawCounsellorResults();

  drawCounsellorResults();

  /* ------------ RENDER COUNSELLOR SEARCH RESULTS ------------ */
  function drawCounsellorResults() {

    const nameQ = ($('#counSearchName').value || "").toLowerCase();
    const deptQ = ($('#counSearchDept').value || "").toLowerCase();

    let filtered = counsellors.filter(c => {
      return (
        (!nameQ || c.name.toLowerCase().includes(nameQ)) &&
        (!deptQ || (c.department || "").toLowerCase().includes(deptQ))
      );
    });

    if (filtered.length === 0) {
      $('#counResults').innerHTML = `
        <div class="empty">No active counsellors found.</div>
      `;
      return;
    }

    $('#counResults').innerHTML = `
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead>
          <tr style="background:#fafafa">
            <th style="padding:8px;text-align:left">Name</th>
            <th style="padding:8px;text-align:left">Department</th>
            <th style="padding:8px;text-align:left">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(c => `
            <tr>
              <td style="padding:8px">${escapeHtml(c.name)}</td>
              <td style="padding:8px">${escapeHtml(c.department || "—")}</td>
              <td style="padding:8px">
                <button class="btn primary" data-id="${c.id}">Book</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    $$('button[data-id]').forEach(btn => {
      btn.onclick = () => openCounsellorModal(btn.dataset.id);
    });
  }

  /* ------------ BOOKING MODAL ------------ */
  function openCounsellorModal(counID) {

    const db = loadDB();
    const coun = db.users.find(u => u.id === counID);
    const activeStudent = db.sessions.currentStudent || { name: "Student", number: "000000000" };

    const m = document.createElement("div");
    m.className = "modal-back";

    m.innerHTML = `
      <div class="modal">

        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;font-size:1.1rem">Book Counsellor</div>
          <button class="btn" id="closeCounX">✖</button>
        </div>

        <div style="margin-top:12px">

          <div style="margin-bottom:10px">
            <label><b>Student Name</b></label>
            <input type="text" value="${escapeHtml(activeStudent.name)}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Counsellor Name</b></label>
            <input type="text" value="${escapeHtml(coun.name)}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Department</b></label>
            <input type="text" value="${escapeHtml(coun.department || "—")}" disabled style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Select Date</b></label>
            <input id="counDate" type="date" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Select Time</b></label>
            <input id="counTime" type="time" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd">
          </div>

          <div style="margin-bottom:10px">
            <label><b>Topic / Issue Description</b></label>
            <textarea id="counTopic" rows="4"
              placeholder="Explain what you would like to discuss..."
              style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd"></textarea>
          </div>

        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">
          <button class="btn ghost" id="cancelCoun">Cancel</button>
          <button class="btn primary" id="confirmCoun">Book</button>
        </div>

      </div>
    `;

    document.body.appendChild(m);

    $('#closeCounX').onclick = () => m.remove();
    $('#cancelCoun').onclick = () => m.remove();

    $('#confirmCoun').onclick = () => {

      const date = $('#counDate').value.trim();
      const time = $('#counTime').value.trim();
      const topic = $('#counTopic').value.trim();

      if (!date || !time) {
        alert("Please select both date and time.");
        return;
      }

      const datetimeISO = new Date(`${date}T${time}`).toISOString();

      // Save to studentData.counsellingRequests
      const studentData = loadStudentRequests();
      studentData.counsellingRequests.unshift({
        id: uid(),
        type: "counsellor",
        studentName: activeStudent.name,
        studentNumber: activeStudent.number,
        counsellorName: coun.name,
        counsellorID: coun.id,
        department: coun.department || "",
        topic: topic || "",
        datetime: datetimeISO,
        status: "pending",
        createdAt: now()
      });

      saveStudentRequests(studentData);

      console.log("Counsellor notification placeholder:", coun.id);

      m.remove();
      alert("Your counselling booking has been submitted.");

      renderCounsellorBookingPage();
    };
  }

};



