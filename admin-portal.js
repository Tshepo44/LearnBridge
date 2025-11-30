// admin-portal.js
// LearnBridge Admin Portal JS
// Features: Dashboard, Manage Users, Local Storage Persistence, Logout, Modals, Stats

// ======== Local Storage Setup ========
const STORAGE_KEY = "learnbridge_admin_users";

// Initialize users data if not present
let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Example admin credentials
const ADMIN_CREDENTIALS = { email: "admin@gmail.com", password: "admin123" };

// ======== DOM Elements ========
const dashboardCard = document.getElementById("dashboard-card");
const mainContent = document.getElementById("main-content");
const logoutBtn = document.getElementById("logout-btn");
const manageUsersBtn = document.getElementById("menu-manage-users");

// ======== Utility Functions ========

// Save users to local storage
function saveUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Generate Dashboard Summary HTML
function renderDashboard() {
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalTutors = users.filter(u => u.role === "tutor").length;
  const totalCounsellors = users.filter(u => u.role === "counsellor").length;
  const suspendedUsers = users.filter(u => u.suspended).length;
  const newThisWeek = 0; // For simplicity, can add date check

  mainContent.innerHTML = `
    <h1>📊 Admin Dashboard</h1>
    <div class="dashboard-cards">
      <div class="card" id="card-students">
        👩‍🎓 Students<br>
        ${totalStudents} Active, ${newThisWeek} New This Week
      </div>
      <div class="card" id="card-tutors">
        👨‍🏫 Tutors<br>
        ${totalTutors} Active, ${newThisWeek} New This Week
      </div>
      <div class="card" id="card-counsellors">
        🧑‍⚕️ Counsellors<br>
        ${totalCounsellors} Active, ${newThisWeek} New This Week
      </div>
      <div class="card" id="card-suspended">
        ⛔ Suspended Users<br>
        ${suspendedUsers}
      </div>
    </div>
    <p style="margin-top:20px;">Click on any card to manage users 👇</p>
  `;

  // Add click event to all cards to go to Manage Users
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      loadManageUsers();
      highlightMenu("menu-manage-users");
    });
  });
}

// ======== Manage Users Page ========
function loadManageUsers() {
  mainContent.innerHTML = `
    <h1>👥 Manage Users</h1>
    <div class="tabs">
      <button class="tab-btn active" data-tab="all">All Users</button>
      <button class="tab-btn" data-tab="new">New Registrations</button>
      <button class="tab-btn" data-tab="activity">Activity Logs</button>
    </div>
    <div id="tab-content">
      <!-- Users table goes here -->
    </div>
  `;
  setupTabs();
  renderAllUsersTab();
}

// Setup tabs functionality
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const selectedTab = tab.dataset.tab;
      if (selectedTab === "all") renderAllUsersTab();
      else if (selectedTab === "new") renderNewUsersTab();
      else if (selectedTab === "activity") renderActivityTab();
    });
  });
}

// Render All Users Tab
function renderAllUsersTab() {
  const container = document.getElementById("tab-content");
  if (users.length === 0) {
    container.innerHTML = `<p>ℹ️ There are no users at the moment.</p>`;
    return;
  }

  let html = `<table class="users-table">
    <thead>
      <tr>
        <th>Name</th><th>Role</th><th>Email</th><th>Department</th>
        <th>Created</th><th>Avg Logins/Week</th><th>Last Active</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>
  `;

  users.forEach((u, index) => {
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
          <button onclick="viewUser(${index})">View</button>
          <button onclick="toggleSuspend(${index})">${u.suspended ? "Reinstate" : "Suspend"}</button>
          <button onclick="deleteUser(${index})">Delete</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// Render New Users Tab
function renderNewUsersTab() {
  const container = document.getElementById("tab-content");
  const newUsers = users.filter(u => u.new || false);
  if (newUsers.length === 0) {
    container.innerHTML = `<p>ℹ️ There are no new users at the moment.</p>`;
    return;
  }

  let html = `<table class="users-table">
    <thead>
      <tr>
        <th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>
  `;

  newUsers.forEach((u, index) => {
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

  html += "</tbody></table>";
  container.innerHTML = html;
}

// Render Activity Tab
function renderActivityTab() {
  const container = document.getElementById("tab-content");
  if (users.length === 0) {
    container.innerHTML = `<p>ℹ️ No user activity yet.</p>`;
    return;
  }

  let html = `<table class="users-table">
    <thead>
      <tr>
        <th>Name</th><th>Role</th><th>Last Login</th><th>Sessions Requested</th><th>Videos Watched</th>
      </tr>
    </thead>
    <tbody>
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

  html += "</tbody></table>";
  container.innerHTML = html;
}

// ======== User Actions ========
function viewUser(index) {
  const u = users[index];
  alert(`👤 User Info\nName: ${u.name}\nRole: ${u.role}\nEmail: ${u.email}\nDepartment: ${u.department || "-"}\nSuspended: ${u.suspended ? "Yes" : "No"}`);
}

function toggleSuspend(index) {
  const u = users[index];
  u.suspended = !u.suspended;
  saveUsers();
  renderAllUsersTab();
  alert(u.suspended ? `⛔ User suspended` : `✅ User reinstated`);
}

function deleteUser(index) {
  if (confirm("⚠️ Are you sure you want to permanently delete this user?")) {
    users.splice(index, 1);
    saveUsers();
    renderAllUsersTab();
    alert("🗑️ User deleted successfully");
  }
}

function approveUser(index) {
  users[index].verified = true;
  users[index].new = false;
  saveUsers();
  renderNewUsersTab();
  alert("✅ User approved");
}

function denyUser(index) {
  users.splice(index, 1);
  saveUsers();
  renderNewUsersTab();
  alert("❌ User denied and removed");
}

// ======== Helpers ========
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Highlight menu
function highlightMenu(id) {
  document.querySelectorAll(".sidebar button").forEach(btn => btn.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ======== Logout ========
logoutBtn.addEventListener("click", () => {
  window.location.href = "uj.html"; // redirect to login page
});

// ======== Sidebar Buttons ========
dashboardCard.addEventListener("click", () => {
  renderDashboard();
  highlightMenu("menu-dashboard");
});

manageUsersBtn.addEventListener("click", () => {
  loadManageUsers();
  highlightMenu("menu-manage-users");
});

// ======== Initial Load ========
renderDashboard();
