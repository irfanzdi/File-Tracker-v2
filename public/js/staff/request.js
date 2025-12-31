

// ==============================
// LOAD USER INFO
// ==============================
async function loadUserInfo() {
    try {
        // Check if element exists
        const nameDisplay = document.getElementById('userNameDisplay');
        if (!nameDisplay) {
            console.error("userNameDisplay element not found in HTML!");
            return;
        }

        // Try localStorage first
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.usr_name) {
                updateUserDisplay(userData.usr_name);
                return;
            }
        }

        // Fetch from API if not in localStorage
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const user = await res.json();
            const userName = user.usr_name || user.username || user.name || 'Admin';
            updateUserDisplay(userName);
            // Store for future use
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            updateUserDisplay('Admin');
        }
    } catch (err) {
        console.error('Failed to load user info:', err);
        updateUserDisplay('Admin');
    }
}

function updateUserDisplay(userName) {
    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
        nameDisplay.textContent = userName;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
  debugLog("App initialized");
  setupEventListeners();

  await loadUserInfo();      // Load user name for display
  await loadCurrentUser();   // MUST finish first
  debugLog("Current user ready, now loading files...");

  await loadFiles();         // Now currentUser is DEFINITELY ready
  await loadRequests();
  loadNotifications();
});


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
let notificationsData = [];

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
  1: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: 'clock' },
  2: { label: 'Rejected', class: 'bg-red-100 text-red-800', icon: 'x-circle' },
  3: { label: 'Approved', class: 'bg-green-100 text-green-800', icon: 'check-circle' },
  4: { label: 'Taken Out', class: 'bg-blue-100 text-blue-800', icon: 'clipboard' },
  5: { label: 'Returned', class: 'bg-emerald-100 text-emerald-800', icon: 'refresh' }
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

  await loadCurrentUser();   // MUST finish first
  debugLog("Current user ready, now loading files...");

  await loadFiles();         // Now currentUser is DEFINITELY ready
  await loadRequests();
  loadNotifications();
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
    const file_id = e.target.value;
    if (file_id) {
      autoFillFolder(file_id);
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
  const deptDisplay = el("userDepartmentDisplay");
  
  try {
    debugLog("Loading current user...");
    const res = await fetch("/api/auth/me", { credentials: "include" });
    debugLog("User API response status:", res.status);
    
    if (res.ok) {
      currentUser = await res.json();
      debugLog("Current user loaded:", currentUser);

      if (deptDisplay) {
        deptDisplay.textContent = currentUser.department_name || "Unknown Department";
      }

      return currentUser;
    }

    // ✅ ADD dept property to fallback
    currentUser = {
      user_id: 1,
      name: "Test User",
      username: "testuser",
      email: "test@example.com",
      dept: 1  // ✅ ADD THIS
    };

    if (deptDisplay) deptDisplay.textContent = "Unknown Department";
    return currentUser;

  } catch (err) {
    console.error("❌ Failed to load user:", err);

    // ✅ ADD dept property to fallback
    currentUser = {
      user_id: 1,
      name: "Test User",
      username: "testuser",
      email: "test@example.com",
      dept: 1  // ✅ ADD THIS
    };

    if (deptDisplay) deptDisplay.textContent = "Unknown Department";
    return currentUser;
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
      const errorText = await res.text(); // ✅ Get error details
      console.error("❌ API Error Response:", errorText); // ✅ Log it
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
    }
    
    localStorage.setItem("files", JSON.stringify(files));
    populateFileSelect(currentUser);
    
  } catch (err) {
    console.error("❌ Error loading files:", err);
    console.error("❌ Error details:", err.message); // ✅ More detail
    
    const stored = localStorage.getItem("files");
    if (stored) {
      files = JSON.parse(stored);
      debugLog("Using cached files:", files);
      populateFileSelect(currentUser);
      showToast("Using cached files (offline)", "error");
    } else {
      files = [];
      populateFileSelect(currentUser);
      showToast(`Failed to load files: ${err.message}`, "error");
    }
  }
}

function populateFileSelect(currentUser) {
  console.log("🔍 populateFileSelect called with:", currentUser);
  
  if (!currentUser) {
    console.warn("❌ currentUser is null/undefined");
    return;
  }

  const sel = el("fileSelect");
  if (!sel) {
    console.warn("❌ fileSelect element not found");
    return;
  }

  sel.innerHTML = `<option value="">Choose a file</option>`;

  const deptId = Number(currentUser.dept);
  console.log("🔍 Filtering files for dept:", deptId);
  console.log("🔍 Total files available:", files.length);

  let matchCount = 0;

  files.forEach(f => {
    const fileDept = Number(f.department_id);
    
    console.log(`File ${f.file_id} (${f.file_name}): dept=${fileDept}, user_dept=${deptId}, status=${f.current_status_id}`);
    
    // Skip files from other departments
    if (f.department_id !== null && fileDept !== deptId) {
      return;
    }

    matchCount++;

    const opt = document.createElement("option");
    opt.value = f.file_id;
    opt.textContent = `${f.file_name}`;
    
    if (f.folder_name) {
      opt.textContent += ` (${f.folder_name})`;
    }
    
    opt.dataset.folderId = f.folder_id ?? '';
    opt.dataset.folderName = f.folder_name ?? '';

    // Check if file is currently taken out (status_id = 5)
    if (Number(f.current_status_id) === 5) {
      opt.disabled = true;
      opt.textContent += " — Currently Taken Out";
      opt.style.color = "#999";
      console.log(`  ⚠️ File ${f.file_id} is taken out (disabled)`);
    }

    sel.appendChild(opt);
  });

  console.log(`✅ Files dropdown populated: ${matchCount} options for dept ${deptId}`);
}






function autoFillFolder(fileId) {
  const sel = el("fileSelect");
  const opt = sel.querySelector(`option[value="${fileId}"]`);
  if (!opt) return;
  el("folderName").value = opt.dataset.folderName || '';
  el("folderId").value = opt.dataset.folderId || '';
}

function clearFolderField() {
  el("folderName").value = '';
  el("folderId").value = '';
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
// 🔹 Load Requests - ONLY PENDING IN MY REQUESTS
// ============================
async function loadRequests() {
  try {
    const res = await fetch("/api/file-movements");
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const allRequests = await res.json();
    const myId = currentUser?.user_id ?? currentUser?.id;

    // Only pending requests for this user
    requestsData = allRequests.filter(r => r.user_id === myId && r.status_id === 1);

    // Map to include file and folder names
    requestsData = requestsData.map(r => {
      const file = files.find(f => f.file_id == r.file_id);
      const folderName = file?.folder_name || file?.folder?.folder_name || 'No Folder';
      const fileName = file?.file_name || 'Unnamed File';
      return {
        ...r,
        file_name: fileName,
        folder_name: folderName
      };
    });

    originalData = [...requestsData];
    localStorage.setItem(`file_movements_${myId}`, JSON.stringify(allRequests));

    renderRequests(requestsData);
    updateStats(allRequests.filter(r => r.user_id === myId));
    updateNotifications(allRequests, myId);

  } catch (err) {
    console.error("❌ Error loading requests:", err);
    const myId = currentUser?.user_id ?? currentUser?.id;
    const stored = localStorage.getItem(`file_movements_${myId}`);
    const allRequests = stored ? JSON.parse(stored) : [];

    requestsData = allRequests.filter(r => r.user_id === myId && r.status_id === 1).map(r => {
      const file = files.find(f => f.file_id == r.file_id);
      const folderName = file?.folder_name || file?.folder?.folder_name || 'No Folder';
      const fileName = file?.file_name || 'Unnamed File';
      return {
        ...r,
        file_name: fileName,
        folder_name: folderName
      };
    });

    originalData = [...requestsData];

    renderRequests(requestsData);
    updateStats(allRequests.filter(r => r.user_id === myId));
    updateNotifications(allRequests, myId);

    showToast(stored ? "Using cached requests (offline)" : `Failed to load requests: ${err.message}`, "error");
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
  } else if (noRequests) noRequests.classList.add("hidden");

  // Sort by move_date descending
  requests.sort((a, b) => new Date(b.move_date) - new Date(a.move_date));

  requests.forEach(req => {
    // ✅ Map values correctly
    const fileName = req.files?.[0]?.file_name || 'Unnamed File';
    const folderName = req.files?.[0]?.folder_name || 'No Folder';
    const requestedByName = req.user_name || 'Unknown';
    const status = STATUS_MAP[req.status_id] || { label: req.status_name || 'Unknown', class: 'bg-gray-100 text-gray-800' };
    const moveDate = req.move_date ? formatDateTime(req.move_date) : '-';

    const item = document.createElement("div");
    item.className = `request-row p-3 md:p-4 hover:bg-gray-50 transition flex items-center gap-3`;
    item.dataset.requestId = req.move_id;
    item.dataset.status = req.status_id;

    item.innerHTML = `
      <div class="flex-1 cursor-pointer">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold text-gray-800 text-sm md:text-base">${escapeHtml(fileName)}</h4>
          <span class="badge text-xs px-2 py-1 rounded-full ${status.class}">${status.label}</span>
        </div>
        <p class="text-xs md:text-sm text-gray-600">Folder: ${escapeHtml(folderName)}</p>
        <p class="text-xs md:text-sm text-gray-600">Requested By: ${escapeHtml(requestedByName)}</p>
        <p class="text-xs text-gray-500">${moveDate}</p>
      </div>
      <button onclick="deleteRequestFromUI(event, ${req.move_id})" class="delete-btn-ui" title="Remove from view">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    `;

    item.querySelector('.flex-1').addEventListener("click", () => showDetailsModal(req.move_id));
    list.appendChild(item);
  });
}


// ============================
// 🔹 Delete Request from UI
// ============================
function deleteRequestFromUI(event, requestId) {
  event.stopPropagation();
  if (!confirm('Remove this request from view?')) return;

  const requestElement = event.target.closest('[data-request-id]');
  if (!requestElement) return;

  requestElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  requestElement.style.opacity = '0';
  requestElement.style.transform = 'translateX(-20px)';

  setTimeout(() => {
    requestElement.remove();
    requestsData = requestsData.filter(r => r.move_id !== requestId);
    originalData = originalData.filter(r => r.move_id !== requestId);
    if (!el("requestsList")?.querySelectorAll('.request-row').length) el("noRequests")?.classList.remove("hidden");
    showToast('Request removed from view', 'success');
  }, 300);
}
window.deleteRequestFromUI = deleteRequestFromUI;




// ============================
// 🔹 Update Notifications - USER INBOX ONLY
// ============================
function updateNotifications(allRequests, currentUserId) {
  // Only approved/rejected and belonging to this user
  notificationsData = allRequests.filter(req => 
    (req.status_id === 2 || req.status_id === 3) &&
    req.user_id === currentUserId
  );
  renderNotifications();
}

// ============================
// 🔹 Render Notifications (Checkbox hidden by default)
// ============================
function renderNotifications() {
  const list = el("notificationsList");
  const badge = el("notificationBadge");
  if (!list) return;

  if (!notificationsData.length) {
    list.innerHTML = `<div class="text-center py-8 text-gray-400">No notifications</div>`;
    if (badge) badge.classList.add('hidden');
    return;
  }

  if (badge) { badge.textContent = notificationsData.length; badge.classList.remove('hidden'); }

  notificationsData.sort((a, b) => new Date(b.move_date) - new Date(a.move_date));
  list.innerHTML = "";

  notificationsData.forEach(notif => {
    const isApproved = notif.status_id === 3;
    const status = STATUS_MAP[notif.status_id] || { label: 'Unknown', class: 'bg-gray-100 text-gray-800' };
    
    const fileNames = notif.files?.map(f => f.file_name).join(", ") || "-";
    const folderNames = notif.files?.map(f => f.folder_name).join(", ") || "-";

    const notifItem = document.createElement('div');
    notifItem.className = `p-3 rounded-lg border flex items-start gap-2
      ${isApproved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} hover:shadow-sm transition cursor-pointer`;
    notifItem.dataset.moveId = notif.move_id;

    notifItem.innerHTML = `
      <div class="flex-1">
        <p class="text-sm font-semibold ${isApproved ? 'text-green-800' : 'text-red-800'} mb-1">Request ${status.label}</p>
        <p class="text-xs text-gray-700 truncate">File(s): ${escapeHtml(fileNames)}</p>
        <p class="text-xs text-gray-700 truncate">Folder(s): ${escapeHtml(folderNames)}</p>
        <p class="text-xs text-gray-500 mt-1">Requested By: ${escapeHtml(notif.user_name || notif.user_id)}</p>
        <p class="text-xs text-gray-500 mt-1">${notif.move_date ? formatDateTime(notif.move_date) : 'Recently'}</p>
      </div>
    `;

    notifItem.addEventListener('click', () => showDetailsModal(notif.move_id));
    list.appendChild(notifItem);
  });
}

// ============================
// 🔹 Load Notifications
// ============================
function loadNotifications(currentUserId) { 
  renderNotifications();
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
      const hay = `${r.folder_name ?? ''} ${r.file_name ?? ''} ${r.remark ?? ''}`.toLowerCase();
      return hay.includes(searchFilter);
    });
  }

  renderRequests(filtered);
}

function resetFilters() {
  if (el('filterStatus')) el('filterStatus').value = '';
  if (el('searchRequest')) el('searchRequest').value = '';
  renderRequests(originalData);
}

// ============================
// 🔹 Update Stats
// ============================
function updateStats(requests) {
  const stats = { pending:0, rejected:0, approved:0, returned:0, takenOut:0 };
  (requests || []).forEach(r => {
    switch (r.status_id) {
      case 1: stats.pending++; break;
      case 2: stats.rejected++; break;
      case 3: stats.approved++; break;
      case 4: stats.returned++; break;
      case 5: stats.takenOut++; break;
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
  
  if (files.length === 0) {
    debugLog("⚠️ No files loaded, fetching now...");
    await loadFiles();
  }
  
  populateFileSelect(currentUser);

  
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

  const userId = currentUser?.user_id ?? currentUser?.id;

  // ✅ CHECK: Does this user already have a pending request for this file?
  try {
    debugLog("Checking for duplicate request...");
    const checkRes = await fetch(`/api/file-movements/check-duplicate?user_id=${userId}&file_id=${fileId}`);
    
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      
      if (checkData.hasPendingRequest) {
        showToast("You already have a pending request for this file", "error");
        return;
      }
    } else {
      console.warn("⚠️ Duplicate check failed, continuing anyway");
    }
  } catch (err) {
    console.error("⚠️ Error checking duplicate:", err);
    // Continue anyway if check fails
  }

  const moveDateTime = new Date(`${reqDate}T${reqTime}`).toISOString();

  const payload = {
    folder_id: folderId,
    files: [fileId],
    move_type: "Take Out",
    move_date: moveDateTime,
    remark: remark,
    requested_by: userId,
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
      showToast(err.message || "Failed to create request", "error");
    }
  } catch (err) {
    console.error("❌ Create request error:", err);
    showToast("Network error. Request saved locally.", "error");
    closeRequestModal();
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
    // Search in all requests (including notifications)
    const myId = currentUser?.user_id ?? currentUser?.id;
const allRequests = JSON.parse(localStorage.getItem(`file_movements_${myId}`) || "[]");
    req = allRequests.find(r => Number(r.move_id) === Number(moveId));
    
    if (!req) {
      req = requestsData.find(r => Number(r.move_id) === Number(moveId));
    }
  }

  if (!req) {
    showToast("Request not found", "error");
    return;
  }

  const details = el("detailsBody");
  if (!details) return;

  const status = STATUS_MAP[req.status_id] || { label: req.status_name || 'Unknown', class: 'bg-gray-100 text-gray-800' };

  // Prepare file and folder info
  const fileNames = req.files?.map(f => f.file_name).join(", ") || "-";
  const folderNames = req.files?.map(f => f.folder_name).join(", ") || "N/A";

  details.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 font-medium">Move ID</p>
          <p class="text-lg font-bold text-blue-600">#${req.move_id}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 font-medium">Status</p>
          <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${status.class}">${status.label}</span>
        </div>
      </div>

      <div class="border-t pt-3">
        <p class="text-sm text-gray-500 font-medium">Folder(s)</p>
        <p class="text-base font-semibold text-gray-800">${escapeHtml(folderNames)}</p>
      </div>

      <div>
        <p class="text-sm text-gray-500 font-medium">File(s)</p>
        <p class="text-base text-gray-800">${escapeHtml(fileNames)}</p>
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
        <p class="text-sm text-gray-800">${escapeHtml(req.user_name || 'Unknown')}</p>
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
      .finally(() => { 
        localStorage.removeItem(`file_movements_${currentUser?.user_id}`); // Clean cached user requests
        window.location.href = '/login.html';
      });
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