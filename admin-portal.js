/* admin-portal.js
   Full Admin Dashboard + Manage Users (single-file)
   - Replaces page content with dashboard UI
   - Persists to localStorage (keys: 'learnbridge_users', 'learnbridge_audit')
   - Logout -> 'login.html' or reload
*/

(() => {
  /* ---------- Config & Storage Keys ---------- */
  const STORAGE_USERS = 'learnbridge_users';
  const STORAGE_AUDIT = 'learnbridge_audit';
  const UNI_KEY = 'uj'; // keep a consistent prefix if you want per-uni later
  const THEME_COLOR = '#ff7a00'; // UJ orange - can be dynamic later

  /* ---------- Utility ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const now = () => new Date().toISOString();
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  function saveUsers(users){ localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }
  function loadUsers(){ return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]'); }
  function saveAudit(a){ localStorage.setItem(STORAGE_AUDIT, JSON.stringify(a)); }
  function loadAudit(){ return JSON.parse(localStorage.getItem(STORAGE_AUDIT) || '[]'); }
  function recordAudit(action, by='admin', details=''){ const a = loadAudit(); a.unshift({id:uid(), action, by, details, time: now()}); saveAudit(a); }

  /* ---------- Initial Data (if none) ---------- */
  if(!localStorage.getItem(STORAGE_USERS)){
    saveUsers([]); // start empty as user requested
    saveAudit([]);
  }

  /* ---------- Replace Page with Dashboard UI ---------- */
  function buildUI(){
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        :root{ --theme:${THEME_COLOR}; --panel:#fff; --muted:#666; --radius:12px; font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;}
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(135deg,#001, #061);color:#222;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;}
        .admin-dashboard{width:100%;max-width:1200px;margin:12px auto;display:flex;border-radius:var(--radius);overflow:hidden;background:rgba(255,255,255,0.97);box-shadow:0 12px 35px rgba(0,0,0,.18);}
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
        @media(max-width:900px){ .admin-dashboard{flex-direction:column} .side{width:100%;order:2} .content{order:1} .cards{flex-direction:column} }
      </style>
    `);

    document.body.innerHTML = `
      <div style="width:100%;max-width:1200px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/logos/uj.png" alt="logo" style="height:56px;border-radius:8px;background:#fff;padding:6px" onerror="this.style.display='none'"/>
          <div style="color:#fff;font-weight:700;font-size:1.2rem">University of Johannesburg — Admin Portal</div>
        </div>
        <div>
          <button id="logoutBtnTop" class="btn ghost">🔒 Logout</button>
        </div>
      </div>

      <div class="admin-dashboard" id="adminDashboardRoot">
        <aside class="side">
          <div>
            <h2>LearnBridge Admin</h2>
            <div class="nav" role="navigation">
              <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
              <button class="nav-btn" data-view="manage-users">👥 Manage Users</button>
              <button class="nav-btn" data-view="reports">🧾 Reports</button>
              <button class="nav-btn" data-view="settings">⚙️ Settings</button>
            </div>
          </div>
          <div style="padding:12px;">
            <div style="margin-bottom:8px;color:rgba(255,255,255,.85)">Admin • UJ</div>
            <button id="logoutBtn" class="btn" style="width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);color:#fff">🔒 Logout</button>
          </div>
        </aside>

        <main class="content" id="mainContent">
          <div class="topbar">
            <div><strong>Admin Portal</strong> <span class="muted">—Manage Users, Activity & System Status</span></div>
            <div class="mini">
              <div class="tag">${UNI_KEY.toUpperCase()}</div>
              <div class="tag" id="timeTag">${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div id="viewContainer"></div>
        </main>
      </div>
    `;

    // Update time every 1 second (live clock)
    setInterval(()=>{ const el = document.getElementById('timeTag'); if(el) el.textContent = new Date().toLocaleString(); },1000);
  }

  /* ---------- Rendering Views ---------- */
  function render(){
    renderSidebarHandlers();
    showView('dashboard');
  }

  function renderSidebarHandlers(){
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        $$('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        showView(view);
      });
    });
    $('#logoutBtn').addEventListener('click', logout);
    $('#logoutBtnTop').addEventListener('click', logout);
  }

  function showView(view, opts = {}){
    const container = $('#viewContainer');
    if(!container) return;
    if(view === 'dashboard') renderDashboard();
    else if(view === 'manage-users') renderManageUsers(opts && opts.tab ? opts.tab : 'all');
    else container.innerHTML = `<div class="card"><h3>Coming Soon</h3><p class="muted">Reports & settings will be added later.</p></div>`;
  }

  /* ---------- DASHBOARD ---------- */
  function renderDashboard(){
    const users = loadUsers();
    const counts = {
      students: users.filter(u=>u.role==='student').length,
      tutors: users.filter(u=>u.role==='tutor').length,
      counsellors: users.filter(u=>u.role==='counsellor').length,
      suspended: users.filter(u=>u.suspended).length,
      newThisWeek: users.filter(u=>{
        if(!u.created) return false;
        const created = new Date(u.created);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
        return created >= weekAgo;
      }).length
    };

    $('#viewContainer').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <div style="font-size:1.1rem;font-weight:700">Dashboard</div>
            <div class="small-muted">Summary of platform usage and performance</div>
          </div>
          <div class="flex">
            <button id="openManageBtn" class="btn primary">Go to Manage Users ➜</button>
          </div>
        </div>

        <div class="cards">
          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="students">
            <div class="title">👩‍🎓 Students</div>
            <div class="big">${counts.students}</div>
            <div class="small-muted">${counts.newThisWeek} new this week</div>
          </div>

          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="tutors">
            <div class="title">🧑‍🏫 Tutors</div>
            <div class="big">${counts.tutors}</div>
            <div class="small-muted">${counts.newThisWeek>0?counts.newThisWeek+' new':'0 new'}</div>
          </div>

          <div class="card" style="min-width:180px;flex:1;cursor:pointer" data-target="counsellors">
            <div class="title">💬 Counsellors</div>
            <div class="big">${counts.counsellors}</div>
            <div class="small-muted">Monitoring & support</div>
          </div>

          <div class="card" style="min-width:140px;flex:0 0 160px;cursor:pointer" data-target="suspended">
            <div class="title">⛔ Suspended</div>
            <div class="big">${counts.suspended}</div>
            <div class="small-muted">Review suspensions</div>
          </div>
        </div>
      </div>


    // card click -> open Manage Users with tab and filter
    $$('.card[data-target]').forEach(c=>{
      c.addEventListener('click', () => {
        const t = c.dataset.target;
        // map to tabs: students -> students, tutors -> tutors, counsellors -> counsellors, suspended -> all (with suspended filter)
        if(t === 'suspended') showView('manage-users', {tab:'all', q:'', filter:{suspended:true}});
        else showView('manage-users', {tab:'all', q:'', filter:{role:t.slice(0,-1) || t}}); // crude mapping
        // activate sidebar manage-users
        $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='manage-users'));
      });
    });

    $('#openManageBtn').addEventListener('click', () => {
      showView('manage-users', {tab:'all'});
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='manage-users'));
    });


  }

  /* ---------- MANAGE USERS ---------- */
  function renderManageUsers(initialTab = 'all', extra = {}) {
    const users = loadUsers();
    const audit = loadAudit();

    // Build UI
    $('#viewContainer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:1.1rem">Manage Users</div>
          <div class="small-muted">All users, new registrations, and activity logs</div>
        </div>
        <div class="flex">
          <button id="backToDash" class="btn ghost">← Dashboard</button>
          <button id="newUserBtn" class="btn primary">➕ New User</button>
        </div>
      </div>

      <div class="card">
        <div class="tabs" id="manageTabs">
          <div class="tab active" data-tab="all">All Users</div>
          <div class="tab" data-tab="new">New Registrations</div>
          <div class="tab" data-tab="activity">Activity Logs</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          <div class="search-row" style="flex:1">
            <input id="searchInput" placeholder="Search by name, email, or role..." type="text"/>
            <select id="filterRole">
              <option value="">All roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="counsellor">Counsellors</option>
            </select>
            <select id="filterStatus">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div style="display:flex;gap:8px">
            <button id="refreshBtn" class="btn">🔄 Refresh</button>
          </div>
        </div>

        <div id="manageBody"></div>
      </div>
    `;

    // Tabs handlers
    $$('#manageTabs .tab').forEach(t => t.addEventListener('click', () => {
      $$('#manageTabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      drawManageBody(t.dataset.tab);
    }));

    $('#backToDash').addEventListener('click', () => {
      showView('dashboard');
      $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='dashboard'));
    });
    $('#newUserBtn').addEventListener('click', ()=>openUserModal('create'));
    $('#refreshBtn').addEventListener('click', ()=>drawManageBody(getActiveTab()));

    $('#searchInput').addEventListener('input', ()=>drawManageBody(getActiveTab()));
    $('#filterRole').addEventListener('change', ()=>drawManageBody(getActiveTab()));
    $('#filterStatus').addEventListener('change', ()=>drawManageBody(getActiveTab()));

    // start with requested tab
    setTimeout(()=> {
      const tab = initialTab === 'new' ? 'new' : (initialTab === 'activity' ? 'activity' : 'all');
      $$('#manageTabs .tab').forEach(x=>x.classList.toggle('active', x.dataset.tab===tab));
      drawManageBody(tab, extra.filter || {});
    }, 0);

    /* ---------- Helper: active tab ---------- */
    function getActiveTab(){ const act = $('.tab.active', $('#manageTabs')); return act ? act.dataset.tab : 'all'; }

    /* ---------- drawManageBody ---------- */
    function drawManageBody(tab, prefilter = {}) {
      const users = loadUsers();
      const audit = loadAudit();
      const q = $('#searchInput').value.trim().toLowerCase();
      const roleFilter = $('#filterRole').value || '';
      const statusFilter = $('#filterStatus').value || '';

      if(tab === 'activity'){
        const rows = audit.map(a=>`<tr>
          <td>${formatDate(a.time)}</td><td>${a.by}</td><td>${a.action}</td><td class="muted">${a.details||''}</td>
        </tr>`).join('') || `<tr><td colspan="4" class="empty">No activity recorded yet.</td></tr>`;
        $('#manageBody').innerHTML = `<table><thead><tr><th>Time</th><th>By</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>`;
        return;
      }

      // Filter users for 'all' or 'new'
      let list = users.slice();

      // prefilter (from dashboard card)
      if(prefilter && typeof prefilter === 'object'){
        if(prefilter.role) list = list.filter(u => u.role === prefilter.role);
        if(prefilter.suspended) list = list.filter(u => u.suspended === true);
      }

      if(tab === 'new'){
        // consider new = created within last 7 days or flagged unverified
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
        list = list.filter(u => {
          const created = u.created ? new Date(u.created) : null;
          return (!u.verified) || (created && created >= weekAgo);
        });
      }

      if(q) {
        list = list.filter(u => [u.name, u.email, u.role, u.department].join(' ').toLowerCase().includes(q));
      }
      if(roleFilter) list = list.filter(u => u.role === roleFilter);
      if(statusFilter) {
        if(statusFilter === 'suspended') list = list.filter(u => u.suspended);
        else list = list.filter(u => !u.suspended);
      }

      if(list.length === 0){
        $('#manageBody').innerHTML = `<div class="empty">No users match this view. There are no users at the moment.</div>`;
        return;
      }

      // Build table
      const rows = list.map(u => `
        <tr data-id="${u.id}">
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.role)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.department||'—')}</td>
          <td>${formatDate(u.created)}</td>
          <td>${u.suspended ? '<span style="color:#ff4d4f">Suspended</span>' : 'Active'}</td>
          <td>
            <div class="flex">
              <button class="btn" data-action="view">👁️ View</button>
              <button class="btn" data-action="edit">✏️ Edit</button>
              <button class="btn" data-action="${u.suspended ? 'reinstate' : 'suspend'}">${u.suspended ? '↺ Reinstate' : '⛔ Suspend'}</button>
              <button class="btn warn" data-action="delete">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      $('#manageBody').innerHTML = `<table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;

      // attach actions
      $$('#manageBody button').forEach(btn => btn.addEventListener('click', (ev) => {
        const tr = ev.target.closest('tr');
        const id = tr.dataset.id;
        const action = btn.dataset.action;
        if(action === 'view') openUserModal('view', id);
        if(action === 'edit') openUserModal('edit', id);
        if(action === 'suspend') handleSuspend(id);
        if(action === 'reinstate') handleReinstate(id);
        if(action === 'delete') handleDelete(id);
      }));
    } // drawManageBody

    /* ---------- actions ---------- */
    function handleSuspend(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Suspend ${u.name}?`)){
        u.suspended = true;
        saveUsers(users);
        recordAudit(`Suspended user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
    function handleReinstate(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Reinstate ${u.name}?`)){
        u.suspended = false;
        saveUsers(users);
        recordAudit(`Reinstated user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
    function handleDelete(id){
      const users = loadUsers();
      const u = users.find(x=>x.id===id);
      if(!u) return alert('User not found');
      if(confirm(`Permanently delete ${u.name}? This cannot be undone.`)){
        const remaining = users.filter(x=>x.id!==id);
        saveUsers(remaining);
        recordAudit(`Deleted user ${u.name}`, 'admin', `id:${u.id}`);
        drawManageBody(getActiveTab());
      }
    }
  } // renderManageUsers

  /* ---------- Modals: View / Edit / Create ---------- */
  function openUserModal(mode='view', id=null){
    // mode: view | edit | create
    const users = loadUsers();
    const user = id ? users.find(u=>u.id===id) : null;

    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700">${mode==='create' ? 'Create User' : mode==='edit' ? 'Edit User' : 'User Details'}</div>
          <div><button class="btn" id="closeModal">✖️ Close</button></div>
        </div>
        <div id="modalBody">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
              <label class="small-muted">Full name</label>
              <input id="m_name" type="text" value="${escapeHtml(user?user.name:'')}" />
            </div>
            <div style="width:180px">
              <label class="small-muted">Role</label>
              <select id="m_role">
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="counsellor">Counsellor</option>
              </select>
            </div>
            <div style="flex:1;min-width:220px">
              <label class="small-muted">Email</label>
              <input id="m_email" type="text" value="${escapeHtml(user?user.email:'')}" />
            </div>
            <div style="flex:1;min-width:180px">
              <label class="small-muted">Department</label>
              <input id="m_dept" type="text" value="${escapeHtml(user?user.department||'':'')}" />
            </div>

            <div style="flex-basis:100%;height:8px"></div>

            <div style="flex:1">
              <label class="small-muted">Notes</label>
              <textarea id="m_notes" rows="3">${escapeHtml(user?user.notes||'':'')}</textarea>
            </div>

            <div style="width:220px">
              <label class="small-muted">Created</label>
              <div style="padding:8px;background:#f7f7f7;border-radius:8px">${user?formatDate(user.created):formatDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          ${mode==='view' ? `<button class="btn" id="editFromView">✏️ Edit</button>` : ''}
          ${mode!=='view' ? `<button class="btn" id="saveUser" class="btn primary">💾 Save</button>` : ''}
          <button class="btn" id="closeModal2">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // set role option
    if(user) $('#m_role', modal).value = user.role;

    // handlers
    $('#closeModal', modal).addEventListener('click', ()=>modal.remove());
    $('#closeModal2', modal).addEventListener('click', ()=>modal.remove());
    if(mode==='view'){
      $('#editFromView', modal).addEventListener('click', ()=>{
        modal.remove();
        openUserModal('edit', id);
      });
    } else {
      $('#saveUser', modal).addEventListener('click', ()=>{
        const name = $('#m_name').value.trim();
        const role = $('#m_role').value;
        const email = $('#m_email').value.trim();
        const department = $('#m_dept').value.trim();
        const notes = $('#m_notes').value.trim();
        if(!name || !email){ alert('Name and email are required'); return; }

        if(mode==='create'){
          const users = loadUsers();
          const newUser = {
            id: uid(),
            name, role, email, department,
            notes,
            created: now(),
            verified: true,
            suspended: false,
            stats: {avgLoginsWeek:0}
          };
          users.unshift(newUser);
          saveUsers(users);
          recordAudit(`Created user ${name}`, 'admin', `id:${newUser.id}`);
          modal.remove();
          showView('manage-users', {tab:'all'});
        } else if(mode==='edit' && user){
          const users = loadUsers();
          const idx = users.findIndex(u=>u.id===user.id);
          if(idx === -1) { alert('User not found'); modal.remove(); return; }
          users[idx] = {...users[idx], name, role, email, department, notes};
          saveUsers(users);
          recordAudit(`Edited user ${name}`, 'admin', `id:${users[idx].id}`);
          modal.remove();
          showView('manage-users', {tab:'all'});
        }
      });
    }
  }

  /* ---------- Logout ---------- */
  function logout(){
    // clear any session flags (if you have them) and redirect
    try {
      // if you maintain an auth flag, remove it here. For now just redirect
      window.location.href = 'login.html';
      setTimeout(()=> location.reload(), 700);
    } catch(e){
      location.reload();
    }
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  /* ---------- INIT ---------- */
  buildUI();
  render();

})();  


