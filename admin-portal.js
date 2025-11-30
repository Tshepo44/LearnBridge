// ======== Local Storage Setup ========
const STORAGE_KEY = "learnbridge_admin_users";
let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// ======== DOM Elements ========
const mainContent = document.getElementById("main-content");
const logoutBtn = document.getElementById("logout-btn");
const manageUsersBtn = document.getElementById("menu-manage-users");
const dashboardBtn = document.getElementById("menu-dashboard");

// ======== Utility Functions ========
function saveUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ======== Dashboard ========
function renderDashboard() {
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalTutors = users.filter(u => u.role === "tutor").length;
  const totalCounsellors = users.filter(u => u.role === "counsellor").length;
  const suspendedUsers = users.filter(u => u.suspended).length;

  mainContent.innerHTML = `
    <h1>📊 Admin Dashboard</h1>
    <div class="dashboard-cards">
      <div class="card">👩‍🎓 Students<br>${totalStudents}</div>
      <div class="card">👨‍🏫 Tutors<br>${totalTutors}</div>
      <div class="card">🧑‍⚕️ Counsellors<br>${totalCounsellors}</div>
      <div class="card">⛔ Suspended<br>${suspendedUsers}</div>
    </div>
    <p style="margin-top:20px;">Click any card to open Manage Users</p>
  `;

  document.querySelectorAll(".card").forEach(card => {
    card.onclick = () => {
      loadManageUsers();
      highlightMenu("menu-manage-users");
    };
  });
}

// ======== Manage Users ========
function loadManageUsers() {
  mainContent.innerHTML = `
    <h1>👥 Manage Users</h1>
    <div class="tabs">
      <button class="tab-btn active" data-tab="all">All Users</button>
      <button class="tab-btn" data-tab="new">New Registrations</button>
      <button class="tab-btn" data-tab="activity">Activity Logs</button>
    </div>
    <div id="tab-content"></div>
  `;
  setupTabs();
  renderAllUsersTab();
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const t = tab.dataset.tab;

      if (t === "all") renderAllUsersTab();
      else if (t === "new") renderNewUsersTab();
      else renderActivityTab();
    };
  });
}

// ======== Tabs ========
function renderAllUsersTab() {
  const container = document.getElementById("tab-content");
  if (users.length === 0) return container.innerHTML = "<p>No users found.</p>";

  let html = `
    <table class="users-table">
      <thead>
        <tr>
          <th>Name</th><th>Role</th><th>Email</th><th>Department</th>
          <th>Created</th><th>Logins/Week</th><th>Last Active</th><th>Actions</th>
        </tr>
      </thead><tbody>
  `;

  users.forEach((u, i) => {
    html += `
      <tr>
        <td>${u.name}</td>
        <td>${capitalize(u.role)}</td>
        <td>${u.email}</td>
        <td>${u.department || "-"}</td>
        <td>${u.createdAt || "N/A"}</td>
        <td>${u.avgLogins || 0}</td>
        <td>${u.lastActive || "N/A"}</td>
        <td>
          <button onclick="viewUser(${i})">View</button>
          <button onclick="toggleSuspend(${i})">${u.suspended ? "Reinstate" : "Suspend"}</button>
          <button onclick="deleteUser(${i})">Delete</button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html + "</tbody></table>";
}

function renderNewUsersTab() {
  const container = document.getElementById("tab-content");
  const list = users.filter(u => u.new);

  if (list.length === 0) return container.innerHTML = "<p>No new users.</p>";

  let html = `
    <table class="users-table">
      <thead>
        <tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr>
      </thead><tbody>
  `;

  list.forEach(u => {
    const index = users.indexOf(u); // FIX: real index
    html += `
      <tr>
        <td>${u.name}</td>
        <td>${capitalize(u.role)}</td>
        <td>${u.email}</td>
        <td>${u.verified ? "Verified" : "Unverified"}</td>
        <td>
          <button onclick="approveUser(${index})">Approve</button>
          <button onclick="denyUser(${index})">Deny</button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html + "</tbody></table>";
}

function renderActivityTab() {
  const container = document.getElementById("tab-content");
  if (users.length === 0) return container.innerHTML = "<p>No activity yet.</p>";

  let html = `
    <table class="users-table">
      <thead>
        <tr><th>Name</th><th>Role</th><th>Last Login</th><th>Sessions</th><th>Videos</th></tr>
      </thead><tbody>
  `;

  users.forEach(u => {
    html += `
      <tr>
        <td>${u.name}</td>
        <td>${capitalize(u.role)}</td>
        <td>${u.lastActive || "N/A"}</td>
        <td>${u.sessions || 0}</td>
        <td>${u.videos || 0}</td>
      </tr>
    `;
  });

  container.innerHTML = html + "</tbody></table>";
}

// ======== User Actions ========
function viewUser(i) { alert(JSON.stringify(users[i], null, 2)); }

function toggleSuspend(i) {
  users[i].suspended = !users[i].suspended;
  saveUsers();
  renderAllUsersTab();
}

function deleteUser(i) {
  if (!confirm("Delete user?")) return;
  users.splice(i, 1);
  saveUsers();
  renderAllUsersTab();
}

function approveUser(i) {
  users[i].verified = true;
  users[i].new = false;
  saveUsers();
  renderNewUsersTab();
}

function denyUser(i) {
  users.splice(i, 1);
  saveUsers();
  renderNewUsersTab();
}

// ======== Helpers ========
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ======== Menu Highlight ========
function highlightMenu(id) {
  document.querySelectorAll(".sidebar button").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ======== Sidebar Clicks ========
dashboardBtn.onclick = () => { renderDashboard(); highlightMenu("menu-dashboard"); };
manageUsersBtn.onclick = () => { loadManageUsers(); highlightMenu("menu-manage-users"); };

// ======== Initial Load ========
renderDashboard();


