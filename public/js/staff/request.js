// staffRequest.js - FILE-FIRST VERSION
// ============================
// 🔹 Helper Shortcut
// ============================
const el = id => document.getElementById(id);

// ============================
// 🔹 Global Variables
// ============================
let files = [];
let requestsData = [];
let originalData = [];
let currentUser = null;

// ============================
// 🔹 Debug Logger
// ============================
function debugLog(message, data = null) {
  console.log(`[DEBUG] ${message}`, data || '');
}

// ============================
// 🔹 Status Configuration
// ============================
const STATUS_MAP = {
  1: { label: 'Pending', class: 'status-badge status-pending' },
  2: { label: 'Rejected', class: 'status-badge status-rejected' },
  3: { label: 'Approved', class: 'status-badge status-approved' },
  4: { label: 'Taken Out', class: 'status-badge status-taken-out' },
  5: { label: 'Returned', class: 'status-badge status-returned' }
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
  toast.className = `toast flex items-center gap-2 bg-white border rounded-lg shadow-lg px-4 py-3 animate-slideIn ${
    type === "success" ? "border-green-500" : "border-red-500"
  }`;
  toast.innerHTML = `
    <span class="text-lg">${type === "success" ? "✅" : "❌"}</span>
    <p class="text-gray-700 font-medium">${message}</p>
  `;

  const finalContainer = el("toastContainer");
  finalContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================
// 🔹 Init
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  debugLog("App initialized");
  setupEventListeners();
  await loadCurrentUser();
  await loadFiles();
  await loadRequests();
});

// ============================
// 🔹 Setup Event Listeners
// ============================
function setupEventListeners() {
  el("filterBtn")?.addEventListener("click", applyFilters);
  el("resetBtn")?.addEventListener("click", resetFilters);
  el("searchRequest")?.addEventListener("input", applyFilters);
  el("logoutBtn")?.addEventListener("click", handleLogout);
  el("refreshBtn")?.addEventListener("click", () => loadRequests());
  el("newRequestBtn")?.addEventListener("click", () => openRequestModal());
  el("closeModalBtn")?.addEventListener("click", closeRequestModal);
  el("cancelBtn")?.addEventListener("click", closeRequestModal);

  // File select change -> auto-fill folder
  el("fileSelect")?.addEventListener("change", (e) => {
    const fileId = e.target.value;
    if (fileId) {
      autoFillFolder(fileId);
    } else {
      clearFolderField();
    }
  });

  el("newRequestModal")?.addEventListener("click", (e) => {
    if (e.target.id === "newRequestModal") closeRequestModal();
  });

  el("detailsModal")?.addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") closeDetailsModal();
  });

  el("requestForm")?.addEventListener("submit", handleNewRequestSubmit);
}

// ============================
// 🔹 Load Current User
// ============================
async function loadCurrentUser() {
  try {
    debugLog("Loading current user...");
    const res = await fetch("/api/auth/me", { credentials: "include" });
    debugLog("User API response status:", res.status);
    
    if (res.ok) {
      currentUser = await res.json();
      debugLog("Current user loaded:", currentUser);
    } else {
      // Use mock user if auth fails
      currentUser = {
        user_id: 1,
        name: "Test User",
        username: "testuser",
        email: "test@example.com"
      };
      debugLog("User not authenticated, using mock user:", currentUser);
    }
  } catch (err) {
    console.error("❌ Failed to load user:", err);
    currentUser = {
      user_id: 1,
      name: "Test User",
      username: "testuser",
      email: "test@example.com"
    };
    debugLog("Using mock user due to error:", currentUser);
  }
}

// ============================
// 🔹 Load All Files
// ============================
async function loadFiles() {
  try {
    debugLog("Fetching all files from API...");
    const res = await fetch("/api/files/list");
    debugLog("Files API response status:", res.status);
    
    if (!res.ok) {
      throw new Error(`Failed to load files: ${res.status} ${res.statusText}`);
    }
    
    files = await res.json();
    debugLog("✅ Files loaded from API:", files);
    
    if (!Array.isArray(files)) {
      console.error("❌ API returned non-array data:", files);
      throw new Error("Invalid files data format");
    }
    
    if (files.length === 0) {
      console.warn("⚠️ No files found in database");
      showToast("No files found in database", "error");
    }
    
    localStorage.setItem("files", JSON.stringify(files));
    populateFileSelect();
    
  } catch (err) {
    console.error("❌ Error loading files:", err);
    
    const stored = localStorage.getItem("files");
    if (stored) {
      files = JSON.parse(stored);
      debugLog("Using cached files:", files);
      populateFileSelect();
      showToast("Using cached files (offline)", "error");
    } else {
      files = [];
      populateFileSelect();
      showToast(`Failed to load files: ${err.message}`, "error");
    }
  }
}

function populateFileSelect() {
  const sel = el("fileSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">Choose a file</option>`;

  files.forEach(f => {
    const opt = document.createElement("option");

    const fileId = f.file_id ?? f.id;
    const fileName = f.file_name ?? f.name ?? f.filename ?? "Unnamed File";

    // ✅ Handle nested folder object
    let folderId = f.folder_id ?? f.folder?.id ?? '';
    let folderName = f.folder_name ?? f.folder?.name ?? 'No Folder';

    opt.value = fileId;
    opt.textContent = `${fileName} (${folderName})`;
    opt.dataset.folderId = folderId;
    opt.dataset.folderName = folderName;

    sel.appendChild(opt);
  });
}



// Auto-fill folder when file is selected
function autoFillFolder(fileId) {
  const sel = el("fileSelect");
  const opt = sel.querySelector(`option[value="${fileId}"]`);
  if (!opt) return;

  el("folderName").value = opt.dataset.folderName || '';
  el("folderId").value = opt.dataset.folderId || '';
}


function clearFolderField() {
  const folderInput = el("folderName");
  const folderIdInput = el("folderId");
  
  if (folderInput) folderInput.value = '';
  if (folderIdInput) folderIdInput.value = '';
}

// ============================
// 🔹 Load Requests
// ============================
async function loadRequests() {
  try {
    debugLog("Fetching requests from API...");
    const res = await fetch("/api/file-movements");
    debugLog("Requests API response status:", res.status);
    
    if (!res.ok) {
      throw new Error(`Failed to load requests: ${res.status} ${res.statusText}`);
    }
    
    requestsData = await res.json();
    debugLog("✅ Requests loaded:", requestsData);
    
    originalData = [...requestsData];
    localStorage.setItem("file_movements", JSON.stringify(requestsData));
    renderRequests(requestsData);
    updateStats(requestsData);
    
  } catch (err) {
    console.error("❌ Error loading requests:", err);
    
    const stored = localStorage.getItem("file_movements");
    if (stored) {
      requestsData = JSON.parse(stored);
      originalData = [...requestsData];
      renderRequests(requestsData);
      updateStats(requestsData);
      showToast("Using cached requests (offline)", "error");
    } else {
      requestsData = [];
      originalData = [];
      renderRequests([]);
      updateStats([]);
      showToast(`Failed to load requests: ${err.message}`, "error");
    }
  }
}

// ============================
// 🔹 Render Requests
// ============================
function renderRequests(requests) {
  const list = el("requestsList");
  const noRequests = el("noRequests");

  if (!list) return;

  list.innerHTML = "";

  if (!requests || requests.length === 0) {
    if (noRequests) noRequests.classList.remove("hidden");
    return;
  } else {
    if (noRequests) noRequests.classList.add("hidden");
  }

  requests.sort((a, b) => {
    const ta = a.move_date ? new Date(a.move_date).getTime() : 0;
    const tb = b.move_date ? new Date(b.move_date).getTime() : 0;
    return tb - ta;
  });

  requests.forEach(req => {
    const status = STATUS_MAP[req.status_id] || { label: 'Unknown', class: 'status-badge' };
    const moveDate = req.move_date ? formatDateTime(req.move_date) : '-';
    const requester = req.requested_by_name ?? req.requested_by ?? req.user_name ?? (currentUser?.name ?? 'User');

    const item = document.createElement("div");
    item.className = `request-item px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-start gap-4`;
    item.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-3">
          <div class="w-10 flex-shrink-0">
            <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
              ${escapeInitials(requester)}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center gap-4">
              <div class="truncate">
                <p class="font-semibold text-gray-800 truncate">${escapeHtml(req.folder_name || 'No folder')}</p>
                <p class="text-sm text-gray-500 truncate">${escapeHtml(req.file_name || 'Entire folder')} · Requested by ${escapeHtml(requester)}</p>
              </div>
              <div class="text-right text-sm">
                <p class="text-xs text-gray-400">${moveDate}</p>
                <div class="mt-2">${renderStatusBadgeInline(req.status_id)}</div>
              </div>
            </div>
            <div class="mt-2 text-sm text-gray-600 truncate">${escapeHtml((req.remark) ? (req.remark) : '')}</div>
          </div>
        </div>
      </div>
      <div class="flex-shrink-0">
        <button class="text-sm px-3 py-1 rounded border hover:bg-gray-100" onclick="showDetailsModal(${req.move_id}, event)">Details</button>
      </div>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      showDetailsModal(req.move_id, e);
    });

    list.appendChild(item);
  });
}

function renderStatusBadgeInline(statusId) {
  const map = STATUS_MAP[statusId] || { label: 'Unknown', class: 'status-badge' };
  return `<span class="${map.class}">${map.label}</span>`;
}

function escapeInitials(name) {
  if (!name) return 'U';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

// ============================
// 🔹 Filters
// ============================
function applyFilters() {
  const statusFilter = el('filterStatus')?.value;
  const searchFilter = el('searchRequest')?.value.trim().toLowerCase();

  let filtered = [...originalData];

  if (statusFilter) {
    const sid = parseInt(statusFilter);
    filtered = filtered.filter(r => r.status_id === sid);
  }

  if (searchFilter) {
    filtered = filtered.filter(r => {
      const hay = `${r.folder_name ?? ''} ${r.file_name ?? ''} ${r.remark ?? ''} ${(r.requested_by_name ?? '')}`.toLowerCase();
      return hay.includes(searchFilter);
    });
  }

  renderRequests(filtered);
  updateStats(filtered);
}

function resetFilters() {
  if (el('filterStatus')) el('filterStatus').value = '';
  if (el('searchRequest')) el('searchRequest').value = '';
  renderRequests(originalData);
  updateStats(originalData);
}

// ============================
// 🔹 Update Stats
// ============================
function updateStats(requests) {
  const stats = { pending:0, rejected:0, approved:0, takenOut:0, returned:0 };
  (requests || []).forEach(r => {
    switch (r.status_id) {
      case 1: stats.pending++; break;
      case 2: stats.rejected++; break;
      case 3: stats.approved++; break;
      case 4: stats.takenOut++; break;
      case 5: stats.returned++; break;
    }
  });

  if (el('statPending')) el('statPending').textContent = stats.pending;
  if (el('statRejected')) el('statRejected').textContent = stats.rejected;
  if (el('statApproved')) el('statApproved').textContent = stats.approved;
  if (el('statTakenOut')) el('statTakenOut').textContent = stats.takenOut;
  if (el('statReturned')) el('statReturned').textContent = stats.returned;
}

// ============================
// 🔹 New Request Modal Handlers
// ============================
async function openRequestModal() {
  debugLog("Opening new request modal");
  
  const form = el("requestForm");
  if (form) form.reset();
  
  clearFolderField();
  
  // Ensure files are loaded
  if (files.length === 0) {
    debugLog("⚠️ No files loaded, fetching now...");
    await loadFiles();
  }
  console.log(files);
  
  // Re-populate to ensure fresh
  populateFileSelect();
  
  const modal = el("newRequestModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
  
  debugLog(`Files available: ${files.length}`);
  
  if (files.length === 0) {
    console.warn("⚠️ No files available to display in modal");
    showToast("No files available. Please check your database.", "error");
  }
}

function closeRequestModal() {
  const modal = el("newRequestModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// ============================
// 🔹 Handle New Request Submit
// ============================
async function handleNewRequestSubmit(e) {
  e.preventDefault();
  
  const fileId = el("fileSelect")?.value;
  const folderId = el("folderId")?.value;
  const reqDate = el("reqDate")?.value;
  const reqTime = el("reqTime")?.value;
  const remark = el("remark")?.value?.trim() || null;

  if (!fileId) {
    showToast("Please select a file", "error");
    return;
  }
  
  if (!folderId) {
    showToast("Folder not found for selected file", "error");
    return;
  }

  if (!reqDate || !reqTime) {
    showToast("Please provide request date and time", "error");
    return;
  }

  // Combine date and time into ISO format
  const moveDateTime = new Date(`${reqDate}T${reqTime}`).toISOString();

  const payload = {
    folder_id: folderId,
    files: [fileId],  // Backend expects array
    move_type: "Take Out",
    move_date: moveDateTime,
    remark: remark,
    requested_by: currentUser?.user_id ?? currentUser?.id ?? null,
    requested_by_name: currentUser?.name ?? currentUser?.username ?? null,
    status_id: 1
  };

  try {
    debugLog("Submitting new request:", payload);
    const res = await fetch("/api/file-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const created = await res.json();
      debugLog("✅ Request created:", created);
      showToast("Request submitted successfully!");
      closeRequestModal();
      await loadRequests();
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("❌ Create request failed:", err);
      showToast(err.message || "Failed to create request, you only can request your department file", "error");
    }
  } catch (err) {
    console.error("❌ Create request error:", err);
    const tempId = Date.now();
    payload.move_id = tempId;
    requestsData.unshift(payload);
    originalData = [...requestsData];
    localStorage.setItem("file_movements", JSON.stringify(requestsData));
    showToast("Request saved locally (offline)", "success");
    closeRequestModal();
    renderRequests(requestsData);
    updateStats(requestsData);
  }
}

// ============================
// 🔹 Details Modal
// ============================
function showDetailsModal(moveId, event) {
  if (event) event.stopPropagation();

  let req = null;
  if (typeof moveId === "object") {
    req = moveId;
  } else {
    req = requestsData.find(r => Number(r.move_id) === Number(moveId)) || originalData.find(r => Number(r.move_id) === Number(moveId));
  }

  if (!req) {
    showToast("Request not found", "error");
    return;
  }

  const details = el("detailsBody");
  if (!details) return;

  const status = STATUS_MAP[req.status_id] || { label: 'Unknown', class: 'status-badge' };

  details.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 font-medium">Move ID</p>
          <p class="text-lg font-bold text-blue-600">#${req.move_id}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 font-medium">Status</p>
          <span class="${status.class}">${status.label}</span>
        </div>
      </div>

      <div class="border-t pt-3">
        <p class="text-sm text-gray-500 font-medium">Folder</p>
        <p class="text-base font-semibold text-gray-800">${escapeHtml(req.folder_name || 'N/A')}</p>
      </div>

      <div>
        <p class="text-sm text-gray-500 font-medium">File</p>
        <p class="text-base text-gray-800">${escapeHtml(req.file_name || '-')}</p>
      </div>

      <div>
        <p class="text-sm text-gray-500 font-medium">Requested At</p>
        <p class="text-sm text-gray-800">${req.move_date ? formatDateTime(req.move_date) : '-'}</p>
      </div>

      <div class="border-t pt-3">
        <p class="text-sm text-gray-500 font-medium">Remark</p>
        <p class="text-sm text-gray-800">${escapeHtml(req.remark || 'No remark provided')}</p>
      </div>

      <div>
        <p class="text-sm text-gray-500 font-medium">Requested By</p>
        <p class="text-sm text-gray-800">${escapeHtml(req.requested_by_name || 'Unknown')}</p>
      </div>
    </div>
  `;

  const modal = el("detailsModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeDetailsModal() {
  const modal = el("detailsModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// ============================
// 🔹 Logout
// ============================
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .finally(() => { window.location.href = '/login.html'; });
  }
}

// ============================
// 🔹 Small Helpers
// ============================
function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Expose to window for onclick handlers in HTML
window.showDetailsModal = showDetailsModal;
window.closeDetailsModal = closeDetailsModal;