/* student-portal.js
   Student Portal for Tutor & Counsellor Booking
   SINGLE STORAGE KEY: 'learnbridge_data'
*/

(() => {

  const STORAGE_KEY = 'learnbridge_data';
  const THEME_COLOR = '#ff7a00';
  const UNI_KEY = 'uj';

  // ===== Utility Functions =====
  function loadDB() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify({
      users: [], audit: [], sessions: {}, tutorData: {}, studentData: {}, counsellorData: {},
      tutoringRequests: [], counsellingRequests: []
    }));
  }

  function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();
  const escapeHtml = s => s ? String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : '';

  function recordAudit(action, by='student', details='') {
    const db = loadDB();
    db.audit.unshift({ id: uid(), action, by, details, time: now() });
    saveDB(db);
  }

  // ===== UI Helpers =====
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $$(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

  // ===== Build Portal UI =====
  function buildUI() {
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{--theme:${THEME_COLOR};--panel:#fff;--muted:#666;--radius:12px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
        *{box-sizing:border-box}
        body{margin:0;background:#f2f2f2;color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;}
        .portal{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.97);box-shadow:0 12px 35px rgba(0,0,0,.18);}
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
        input[type="text"], input[type="date"], input[type="time"], textarea, select {padding:8px;border-radius:8px;border:1px solid #ddd}
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
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px"/>
          <div style="color:#222;font-weight:700;font-size:1.2rem">University of Johannesburg — Student Portal</div>
        </div>
      </div>

      <div class="portal">
        <aside class="side">
          <div>
            <h2>LearnBridge</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="tutoring-requests">📚 Tutor Booking</button>
              <button class="nav-btn" data-view="counselling-requests">💬 Counsellor Booking</button>
            </div>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Student Portal</strong> <span class="muted">—Book Tutors & Counsellors</span></div>
            <div class="mini">
              <div class="tag">${UNI_KEY.toUpperCase()}</div>
              <div class="tag" id="timeTag">${new Date().toLocaleString()}</div>
            </div>
          </div>
          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    setInterval(()=>{ const el=document.getElementById('timeTag'); if(el) el.textContent=new Date().toLocaleString(); },1000);
    renderSidebarHandlers();
    showView('dashboard');
  }

  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      });
    });
  }

  // ===== Views =====
  function showView(view){
    if(view==='dashboard') renderDashboard();
    else if(view==='tutoring-requests') renderTutoring();
    else if(view==='counselling-requests') renderCounselling();
  }

  // ===== Dashboard =====
  function renderDashboard(){
    const tutors = loadDB().tutoringRequests || [];
    const counsellors = loadDB().counsellingRequests || [];
    $('#viewContainer').innerHTML = `
      <div class="cards">
        <div class="card tutoring-small-box" style="cursor:pointer">
          <div class="title">📚 Tutor Booking</div>
          <div><b>${tutors.length}</b> total</div>
          <div class="small-muted" style="margin-top:6px">Click to book</div>
        </div>
        <div class="card counselling-small-box" style="cursor:pointer">
          <div class="title">💬 Counsellor Booking</div>
          <div><b>${counsellors.length}</b> total</div>
          <div class="small-muted" style="margin-top:6px">Click to book</div>
        </div>
      </div>
    `;
    $('.tutoring-small-box').onclick = () => { 
      $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='tutoring-requests'));
      showView('tutoring-requests'); 
    };
    $('.counselling-small-box').onclick = () => { 
      $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='counselling-requests'));
      showView('counselling-requests'); 
    };
  }

  // ===== Tutoring =====
  function renderTutoring(){
    const db = loadDB();
    const body = $('#viewContainer');
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:1.2rem;font-weight:700">Tutor Booking</div>
        <button id="backDashX" class="btn ghost">← Dashboard</button>
      </div>
      <div class="card">
        <div class="search-row">
          <input id="tutSearch" placeholder="Search by name/module…" style="flex:1"/>
          <button id="tutAddBtn" class="btn primary">+ Book Tutor</button>
        </div>
        <div id="tutBody" style="margin-top:10px"></div>
      </div>
    `;
    $('#backDashX').onclick = () => showView('dashboard');
    $('#tutSearch').oninput = drawTutList;
    $('#tutAddBtn').onclick = openTutBookModal;
    drawTutList();
  }

  function drawTutList(){
    const search=($('#tutSearch')?.value||'').toLowerCase();
    const list=(loadDB().tutoringRequests||[]).filter(x=> (x.tutorName||'').toLowerCase().includes(search) || (x.module||'').toLowerCase().includes(search));
    const body=$('#tutBody');
    if(list.length===0){ body.innerHTML=`<div class="empty">No tutor requests.</div>`; return; }
    body.innerHTML=`<table>
      <thead><tr><th>Name</th><th>Module</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${list.map(x=>`<tr>
        <td>${escapeHtml(x.tutorName)}</td>
        <td>${escapeHtml(x.module)}</td>
        <td>${escapeHtml(x.datetime||'')}</td>
        <td>${escapeHtml(x.status)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function openTutBookModal(){
    const m = document.createElement('div'); m.className='modal-back';
    m.innerHTML=`
      <div class="modal">
        <div style="display:flex;justify-content:space-between">
          <div style="font-weight:700">Book Tutor</div>
          <button class="btn" id="closeX">✖</button>
        </div>
        <div style="margin-top:10px">
          <input placeholder="Tutor Name" id="tutName" style="width:100%;margin-bottom:6px"/>
          <input placeholder="Module" id="tutModule" style="width:100%;margin-bottom:6px"/>
          <input type="date" id="tutDate" style="margin-bottom:6px"/>
          <input type="time" id="tutTime" style="margin-bottom:6px"/>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
          <button class="btn warn" id="cancelBtn">Cancel</button>
          <button class="btn primary" id="bookBtn">Book</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    $('#closeX').onclick = $('#cancelBtn').onclick = ()=> m.remove();
    $('#bookBtn').onclick = ()=>{
      const name=$('#tutName').value, module=$('#tutModule').value, date=$('#tutDate').value, time=$('#tutTime').value;
      if(!name||!module) return alert('Fill in name and module');
      const db = loadDB();
      db.tutoringRequests.unshift({id:uid(), tutorName:name, module, datetime:`${date} ${time}`, status:'pending', createdAt:now()});
      saveDB(db); recordAudit('Added tutoring request');
      m.remove(); drawTutList(); renderDashboard();
    };
  }

  // ===== Counselling =====
  function renderCounselling(){
    const body = $('#viewContainer');
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:1.2rem;font-weight:700">Counsellor Booking</div>
        <button id="backDashX" class="btn ghost">← Dashboard</button>
      </div>
      <div class="card">
        <div class="search-row">
          <input id="counSearch" placeholder="Search by name/department…" style="flex:1"/>
          <button id="counAddBtn" class="btn primary">+ Book Counsellor</button>
        </div>
        <div id="counBody" style="margin-top:10px"></div>
      </div>
    `;
    $('#backDashX').onclick = ()=>showView('dashboard');
    $('#counSearch').oninput = drawCounList;
    $('#counAddBtn').onclick = openCounBookModal;
    drawCounList();
  }

  function drawCounList(){
    const search=($('#counSearch')?.value||'').toLowerCase();
    const list=(loadDB().counsellingRequests||[]).filter(x=> (x.name||'').toLowerCase().includes(search) || (x.department||'').toLowerCase().includes(search));
    const body=$('#counBody');
    if(list.length===0){ body.innerHTML=`<div class="empty">No counsellor requests.</div>`; return; }
    body.innerHTML=`<table>
      <thead><tr><th>Name</th><th>Department</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${list.map(x=>`<tr>
        <td>${escapeHtml(x.name)}</td>
        <td>${escapeHtml(x.department)}</td>
        <td>${escapeHtml(x.datetime||'')}</td>
        <td>${escapeHtml(x.status)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function openCounBookModal(){
    const m = document.createElement('div'); m.className='modal-back';
    m.innerHTML=`
      <div class="modal">
        <div style="display:flex;justify-content:space-between">
          <div style="font-weight:700">Book Counsellor</div>
          <button class="btn" id="closeX">✖</button>
        </div>
        <div style="margin-top:10px">
          <input placeholder="Counsellor Name" id="counName" style="width:100%;margin-bottom:6px"/>
          <input placeholder="Department" id="counDept" style="width:100%;margin-bottom:6px"/>
          <input type="date" id="counDate" style="margin-bottom:6px"/>
          <input type="time" id="counTime" style="margin-bottom:6px"/>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
          <button class="btn warn" id="cancelBtn">Cancel</button>
          <button class="btn primary" id="bookBtn">Book</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    $('#closeX').onclick = $('#cancelBtn').onclick = ()=> m.remove();
    $('#bookBtn').onclick = ()=>{
      const name=$('#counName').value, dept=$('#counDept').value, date=$('#counDate').value, time=$('#counTime').value;
      if(!name||!dept) return alert('Fill in name and department');
      const db = loadDB();
      db.counsellingRequests.unshift({id:uid(), name, department:dept, datetime:`${date} ${time}`, status:'pending', createdAt:now()});
      saveDB(db); recordAudit('Added counselling request');
      m.remove(); drawCounList(); renderDashboard();
    };
  }

  // ===== Init =====
  buildUI();

})();


