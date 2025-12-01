console.log("🚀 activityLog.js loaded!");

// ============================
// 🔹 Helper Shortcut
// ============================
const el = id => document.getElementById(id);

// ============================
// 🔹 Global Variables
// ============================
let requestsData = [];
let originalData = [];
let currentUser = null;
let currentRequestId = null;

// ============================
// 🔹 Status Configuration
// ============================
const STATUS_MAP = {
  1: { label: 'Pending', class: 'status-pending', value: 'pending' },
  2: { label: 'Rejected (Available)', class: 'status-rejected', value: 'rejected' },
  3: { label: 'Approved', class: 'status-approved', value: 'approved' },
  4: { label: 'Taken Out (Unavailable)', class: 'status-taken-out', value: 'taken-out' },
  5: { label: 'Returned (Available)', class: 'status-available', value: 'available' }
};

// ============================
// 🔹 Toast Notifications
// ============================
function showToast(message, type = "success") {
  const container = el("toastContainer");
  if (!container) {
    const toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "fixed top-4 right-4 z-50 space-y-2";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  const icon = type === "success" ? "✓" : "✕";
  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  
  toast.className = "toast";
  toast.innerHTML = `
    <div class="${bgColor} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
      ${icon}
    </div>
    <span class="font-medium">${message}</span>
  `;
  
  const finalContainer = el("toastContainer");
  finalContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================
// 🔹 Initialize on Page Load
// ============================
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

async function initApp() {
  console.log("📄 Initializing app...");
  await loadCurrentUser();
  await loadRequests();
  setupEventListeners();
  console.log("✅ App initialized!");
}

// ============================
// 🔹 Load Current User Info
// ============================
async function loadCurrentUser() {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error("Not logged in");
    currentUser = await res.json();
    console.log("✅ User loaded:", currentUser);
  } catch (err) {
    console.warn("⚠️ Could not load user", err);
  }
}

// ============================
// 🔹 Setup Event Listeners
// ============================
function setupEventListeners() {
  el("filterBtn")?.addEventListener("click", applyFilters);
  el("resetBtn")?.addEventListener("click", resetFilters);
  el("searchRequest")?.addEventListener("input", applyFilters);
  el("logoutBtn")?.addEventListener("click", handleLogout);
  
  const cancelBtn = el("cancelReject");
  const confirmBtn = el("confirmReject");
  
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRejectModal();
    });
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmReject();
    });
  }
  
  const modal = el("rejectModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeRejectModal();
      }
    });
  }
}

// ============================
// 🔹 Load All File Movement Requests
// ============================
async function loadRequests() {
  try {
    console.log("🔍 Starting to fetch requests...");
    
    const res = await fetch("/api/file-movements", {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Response not OK:", errorText);
      throw new Error(`Failed to load requests: ${res.status}`);
    }

    const data = await res.json();
    console.log("✅ Data received:", data);
    console.log("📊 Number of records:", data.length);

    requestsData = data;
    originalData = [...data];

    renderTable(requestsData);
    updateStats(requestsData);

  } catch (err) {
    console.error("💥 Error loading requests:", err);
    showToast("Failed to load file requests", "error");
  }
}

// ============================
// 🔹 Render Requests Table
// ============================
function renderTable(requests) {
  const tbody = el("requestTableBody");
  const noRequests = el("noRequests");
  
  if (!tbody) {
    console.error("❌ Table body not found!");
    return;
  }
  
  tbody.innerHTML = "";

  if (!requests || requests.length === 0) {
    console.warn("⚠️ No requests to display");
    if (noRequests) noRequests.classList.remove("hidden");
    return;
  }
  
  if (noRequests) noRequests.classList.add("hidden");

  console.log("🎨 Rendering", requests.length, "requests");

  requests.forEach(req => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 transition";
    
    const statusConfig = STATUS_MAP[req.status_id];
    if (req.status_id === 1) {
      row.classList.add("row-pending");
    }
    
    const fileNames = Array.isArray(req.files) 
      ? req.files.map(f => f.file_name).join(", ") 
      : (req.file_name || "-");
    
    const requestedBy = req.user_name || req.requestedBy || "-";
    const moveDate = req.move_date ? formatDateTime(req.move_date) : '-';
    const approvedBy = req.approved_by_name || req.approvedBy || '<span class="text-gray-400">-</span>';
    const statusBadge = getStatusBadge(req, statusConfig);
    const actionBtn = getActionButton(req);

    row.innerHTML = `
      <td class="px-4 py-3 text-center font-semibold">#${req.move_id}</td>
      <td class="px-4 py-3">${escapeHtml(fileNames)}</td>
      <td class="px-4 py-3">${escapeHtml(requestedBy)}</td>
      <td class="px-4 py-3">${moveDate}</td>
      <td class="px-4 py-3">${approvedBy}</td>
      <td class="px-4 py-3 text-center">${statusBadge}</td>
      <td class="px-4 py-3 text-center">${actionBtn}</td>
    `;
    
    tbody.appendChild(row);
  });

  console.log("✅ Table rendered successfully");
}

// ============================
// 🔹 Get Status Badge with Approval Time
// ============================
function getStatusBadge(req, statusConfig) {
  if (!statusConfig) {
    return '<span class="status-badge bg-gray-100 text-gray-800">Unknown</span>';
  }
  
  const statusId = req.status_id;
  
  if (statusId === 1 || statusId === 2) {
    return `<span class="status-badge ${statusConfig.class}">${statusConfig.label}</span>`;
  }
  
  if (statusId === 3 || statusId === 4 || statusId === 5) {
    const approvedAt = req.approved_at ? formatDateTime(req.approved_at) : 'N/A';
    return `
      <div class="flex flex-col items-center gap-1">
        <span class="status-badge ${statusConfig.class}">${statusConfig.label}</span>
        <span class="text-xs text-gray-500">${approvedAt}</span>
      </div>
    `;
  }
  
  return `<span class="status-badge ${statusConfig.class}">${statusConfig.label}</span>`;
}

// ============================
// 🔹 Get Action Button Based on Status
// ============================
function getActionButton(req) {
  switch(req.status_id) {
    case 1:
      return `
        <div class="flex items-center justify-center gap-2">
          <button onclick="approveRequest(${req.move_id}, event)" 
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition">
            Approve
          </button>

          <button onclick="openRejectModal(${req.move_id}, event)" 
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition">
            Reject
          </button>
        </div>
      `;
      
    case 2:
      return '<span class="text-gray-500 text-xs">File Available</span>';
      
    case 3:
      return `
        <button onclick="takeOutFile(${req.move_id}, event)" 
          class="btn-info">
          Mark as Taken Out
        </button>
      `;
      
    case 4:
      return `
        <button onclick="returnFile(${req.move_id}, event)" 
          class="btn-warning">
          Return File
        </button>
      `;
      
    case 5:
      return '<span class="text-gray-500 text-xs">File Available</span>';
      
    default:
      return '<span class="text-gray-400 text-xs">-</span>';
  }
}

// ============================
// 🔹 Admin: Approve Request (Status 1 → 3)
// ============================
async function approveRequest(move_id) {
  try {
    const res = await fetch(`/api/file-movements/approve/${move_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to approve request");

    alert("Request approved successfully!");
    await loadRequests();

  } catch (err) {
    console.error("Error approving request:", err);
    alert("Error approving request: " + err.message);
  }
}

// ============================
// 🔹 Open Reject Modal
// ============================
function openRejectModal(move_id, event) {
  if (event) event.stopPropagation();
  currentRequestId = move_id;
  const modal = el("rejectModal");
  if (modal) modal.classList.add("active");
}

// ============================
// 🔹 Close Reject Modal
// ============================
function closeRejectModal() {
  currentRequestId = null;
  const rejectReason = el("rejectReason");
  if (rejectReason) rejectReason.value = "";
  const modal = el("rejectModal");
  if (modal) modal.classList.remove("active");
}

// ============================
// 🔹 Admin: Confirm Reject Request (Status 1 → 2)
// ============================
async function confirmReject() {
  const reason = el("rejectReason")?.value.trim();
  
  if (!reason) {
    showToast("Please provide a reason for rejection", "error");
    return;
  }

  const request = requestsData.find(r => r.move_id === currentRequestId);
  if (!request) return;

  try {
    const res = await fetch(`/api/file-movements/${currentRequestId}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        remark: reason
      })
    });

    if (res.ok) {
      showToast("Request rejected. File is now available.", "success");
      closeRejectModal();
      await loadRequests();
    } else {
      const error = await res.json();
      showToast(error.error || "Failed to reject request", "error");
    }
  } catch (err) {
    console.error("Error rejecting request:", err);
    showToast("Failed to reject request", "error");
  }
}

// ============================
// 🔹 HR: Take Out File (Status 3 → 4)
// ============================
async function takeOutFile(move_id, event) {
  if (event) event.stopPropagation();
  
  const request = requestsData.find(r => r.move_id === move_id);
  if (!request) return;

  const confirmed = confirm("Mark file as TAKEN OUT?\n\nThis confirms the file has been physically taken out.");
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/file-movements/${move_id}/take-out`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (res.ok) {
      showToast("File marked as taken out (unavailable)", "success");
      await loadRequests();
    } else {
      const error = await res.json();
      showToast(error.error || "Failed to update status", "error");
    }
  } catch (err) {
    console.error("Error taking out file:", err);
    showToast("Failed to update status", "error");
  }
}

// ============================
// 🔹 HR: Return File (Status 4 → 5)
// ============================
async function returnFile(move_id, event) {
  if (event) event.stopPropagation();
  
  const request = requestsData.find(r => r.move_id === move_id);
  if (!request) return;

  const confirmed = confirm("Mark file as RETURNED?\n\nThis confirms the file has been returned.");
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/file-movements/${move_id}/Return`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (res.ok) {
      showToast("File returned and is now available", "success");
      await loadRequests();
    } else {
      const error = await res.json();
      showToast(error.error || "Failed to mark as returned", "error");
    }
  } catch (err) {
    console.error("Error marking returned:", err);
    showToast("Failed to mark as returned", "error");
  }
}

// ============================
// 🔹 Update Statistics
// ============================
function updateStats(requests) {
  const stats = {
    pending: 0,
    rejected: 0,
    approved: 0,
    takenOut: 0,
    available: 0
  };

  requests.forEach(req => {
    switch(req.status_id) {
      case 1: stats.pending++; break;
      case 2: stats.rejected++; break;
      case 3: stats.approved++; break;
      case 4: stats.takenOut++; break;
      case 5: stats.available++; break;
    }
  });

  if (el('statPending')) el('statPending').textContent = stats.pending;
  if (el('statRejected')) el('statRejected').textContent = stats.rejected;
  if (el('statApproved')) el('statApproved').textContent = stats.approved;
  if (el('statTakenOut')) el('statTakenOut').textContent = stats.takenOut;
  if (el('statAvailable')) el('statAvailable').textContent = stats.available;
}

// ============================
// 🔹 Apply Filters
// ============================
function applyFilters() {
  const statusFilter = el('filterStatus')?.value;
  const dateFilter = el('filterDate')?.value;
  const searchFilter = el('searchRequest')?.value.toLowerCase();

  let filtered = [...originalData];

  if (statusFilter) {
    filtered = filtered.filter(r => {
      const statusConfig = STATUS_MAP[r.status_id];
      return statusConfig && statusConfig.value === statusFilter;
    });
  }

  if (dateFilter) {
    filtered = filtered.filter(r => {
      if (!r.move_date) return false;
      const moveDate = new Date(r.move_date).toISOString().split('T')[0];
      return moveDate === dateFilter;
    });
  }

  if (searchFilter) {
    filtered = filtered.filter(r => {
      const fileName = Array.isArray(req.files) 
        ? r.files.map(f => f.file_name).join(" ").toLowerCase()
        : (r.file_name || "").toLowerCase();
      
      const requestedBy = (r.user_name || r.requestedBy || "").toLowerCase();
      
      return fileName.includes(searchFilter) || requestedBy.includes(searchFilter);
    });
  }

  renderTable(filtered);
  updateStats(filtered);
}

// ============================
// 🔹 Reset Filters
// ============================
function resetFilters() {
  if (el('filterStatus')) el('filterStatus').value = '';
  if (el('filterDate')) el('filterDate').value = '';
  if (el('searchRequest')) el('searchRequest').value = '';
  
  renderTable(originalData);
  updateStats(originalData);
}

// ============================
// 🔹 Logout Handler
// ============================
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    })
      .then(() => {
        window.location.href = '/login.html';
      })
      .catch(() => {
        window.location.href = '/login.html';
      });
  }
}

// ============================
// 🔹 Helper Functions
// ============================
function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================
// 🔹 Expose Functions Globally
// ============================
window.approveRequest = approveRequest;
window.openRejectModal = openRejectModal;
window.confirmReject = confirmReject;
window.closeRejectModal = closeRejectModal;
window.takeOutFile = takeOutFile;
window.returnFile = returnFile;