// adminNavbar.js
function loadNavbar() {
  const navbarHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <img src="/Images/SAFWA-R Logo.png" alt="Logo" class="sidebar-logo">
        <h1 class="sidebar-title">
          <span class="icon">📁</span>
          Admin Panel
        </h1>
      </div>
<<<<<<< HEAD
      
      <nav class="sidebar-nav">
        <a href="admin.html" class="nav-link">
          <span class="nav-icon">📋</span>
          <span class="nav-text">Add Files Record</span>
        </a>
        <a href="activityLog.html" class="nav-link">
          <span class="nav-icon">📊</span>
          <span class="nav-text">Activity Log</span>
        </a>
        <a href="locations.html" class="nav-link">
          <span class="nav-icon">📍</span>
          <span class="nav-text">Cabinet Locations</span>
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <button id="logoutBtn" class="logout-btn">
          <span class="logout-icon">🚪</span>
          <span>Logout</span>
        </button>
=======
    `;
  } catch (err) {
    console.error("Error loading latest folder:", err);
    document.getElementById("latestRecord").innerHTML =
      `<p class="text-red-500 italic">Failed to load latest folder.</p>`;
  }
}

// ============================
// 🔹 Render Table
// ============================
function renderTable(folders) {
  const tbody = document.querySelector("#fileTable tbody");
  tbody.innerHTML = "";

  if (!folders.length) {
    document.getElementById("noFiles").classList.remove("hidden");
    return;
  }

  document.getElementById("noFiles").classList.add("hidden");

  folders.forEach(folder => {
    const filesList = folder.files_inside?.length
      ? folder.files_inside.join(", ")
      : "No files inside";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-3 py-2">${folder.serial_num || "-"}</td>
      <td class="px-3 py-2">${folder.folder_name || "-"}</td>
      <td class="px-3 py-2">${folder.department || "-"}</td>
      <td class="px-3 py-2">${folder.location_name || "-"}</td>
      <td class="px-3 py-2 text-center">${filesList}</td>
      <td class="px-3 py-2 text-center">
        <div class="flex justify-center gap-2">
          <button class="btn-action btn-view" data-id="${folder.folder_id}">View</button>
          <button class="btn-action btn-edit" 
            data-folder='${JSON.stringify(folder)
              .replace(/'/g, "&apos;")
              .replace(/"/g, "&quot;")}'>Edit</button>
          <button class="btn-action btn-delete" data-id="${folder.folder_id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  // ✅ Now attach listeners AFTER table rows exist
  setTimeout(() => {
    document.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        try {
          const folderData = btn.dataset.folder
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          const folder = JSON.parse(folderData);
          openEditModal(folder);
        } catch (err) {
          console.error("Error parsing folder JSON:", err);
        }
      });
    });

    document.querySelectorAll(".btn-view").forEach(btn => {
      btn.addEventListener("click", () => openViewModal(btn.dataset.id));
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => deleteFolder(btn.dataset.id));
    });
  }, 100); // ensure DOM fully rendered before attaching
}


// ============================
// 🔹 Delete Folder
// ============================
async function deleteFolder(id) {
  if (!confirm("Are you sure you want to delete this folder?")) return;
  try {
    const res = await fetch(`/api/folder/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast("Folder deleted!");
    loadFolder();
    loadFiles();
    loadLatestFolder();
  } catch (err) {
    console.error(err);
    showToast("Failed to delete folder", "error");
  }
}

// ============================
// 🔹 Edit Modal Functions
// ============================
async function loadDropdownsForEdit(folder) {
  try {
    const depId = folder.department_id || null;
    const locId = folder.location_id || null;
    const selectedFiles = folder.file_ids || [];

    // 🔹 Load departments and preselect
    const depRes = await fetch("/api/departments");
    const depData = await depRes.json();
    const depSelect = document.getElementById("editDepartmentSelect");

    depSelect.innerHTML = depData
      .map(d => `
        <option value="${d.department_id}" ${d.department_id === depId ? "selected" : ""}>
          ${d.department}
        </option>`)
      .join("");

    if (!depSelect.value && depId) depSelect.value = depId;

    // 🔹 Load locations and preselect
    const locRes = await fetch("/api/locations");
    const locData = await locRes.json();
    const locSelect = document.getElementById("editLocationSelect");

    locSelect.innerHTML = locData
      .map(l => `
        <option value="${l.location_id}" ${l.location_id === locId ? "selected" : ""}>
          ${l.location_name}
        </option>`)
      .join("");

    if (!locSelect.value && locId) locSelect.value = locId;

    // 🔹 Load files with disabling logic
    // 🔹 Load files with disabling logic (frontend-only using /api/folder)
const [allFoldersRes, fileRes] = await Promise.all([
  fetch("/api/folder"),    // returns folders with folder.file_ids array
  fetch("/api/files")      // returns files
]);

const foldersData = await allFoldersRes.json();
const fileData = await fileRes.json();
const fileSelect = document.getElementById("editFileSelect");

// build set of assigned file IDs (assigned to any folder)
const assignedSet = new Set();
foldersData.forEach(fold => {
  (fold.file_ids || []).forEach(fid => assignedSet.add(Number(fid)));
});

// remove files assigned to THIS folder (we want them selectable and preselected)
(selectedFiles || []).forEach(fid => assignedSet.delete(Number(fid)));

fileSelect.innerHTML = fileData.map(f => {
  const id = Number(f.file_id);
  const isSelected = selectedFiles.includes(id);
  const isAssignedToAnother = assignedSet.has(id);

  return `
    <option 
      value="${f.file_id}"
      ${isSelected ? "selected" : ""}
      ${isAssignedToAnother ? "disabled" : ""}>
      ${f.file_name} ${isAssignedToAnother ? "(Already in folder)" : ""}
    </option>
  `;
}).join("");

  } catch (err) {
    console.error("loadDropdownsForEdit error:", err);
  }
}


async function saveFolderChanges() {
  const folderNameInput = el("editFolderName");
  const deptSelect = el("editDepartmentSelect");
  const locSelect = el("editLocationSelect");
  const fileSelect = el("editFileSelect");

  const folder_name = folderNameInput.value.trim();
  const department_id = deptSelect.value;
  const location_id = locSelect.value;
  const file_ids = Array.from(fileSelect.selectedOptions).map(opt => opt.value);

  if (!folder_name) return alert("Please enter a folder name.");

  try {
    const res = await fetch(`/api/folder/${editingFolderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_name, department_id, location_id, file_ids }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);

    alert("✅ Folder updated successfully!");

    // ✅ Update QR in edit modal if present
    const qrImg = el("viewQr");
    if (qrImg && data.qr_code) {
      qrImg.src = data.qr_code;
    }

    // ✅ Refresh file select inside edit modal
    if (editingFolderId) {
      await loadDropdownsForEdit({
        folder_id: editingFolderId,
        folder_name,
        department_id,
        location_id,
        file_ids: file_ids.map(Number),
      });
    }

    // ✅ Refresh table and latest folder section
    loadFolder();
    loadLatestFolder();
    loadFiles();  // refresh Add Folder select list
    closeEditModal()
  } catch (err) {
    console.error("saveFolderChanges error:", err);
    alert("❌ Failed to save folder changes.");
  }
}


// ============================
// 🔹 View Modal + QR + Print
// ============================
async function openViewModal(id) {
  const res = await fetch(`/api/folder/${id}`);
  const data = await res.json();

    el("viewFolderName").textContent = data.folder_name || "-";
    el("viewDepartment").textContent = data.department || "-";
    el("viewLocation").textContent = data.location_name || "-";
    el("viewCreatedBy").textContent = data.created_by || "-";
    el("viewCreatedAt").textContent = data.created_at ? new Date(data.created_at).toLocaleString(): "-";
    el("viewSerial").textContent = data.serial_num || "-";

  const qrImg = el("viewQr");
  qrImg.src = data.qr_code || "https://api.qrserver.com/v1/create-qr-code/?data=No+QR+Available&size=150x150";

  const list = el("viewFiles");
  list.innerHTML = "";
  (data.files_inside || ["No files inside"]).forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    list.appendChild(li);
  });

  el("viewModal").classList.add("show");
  el("viewModal").classList.remove("hidden");
}

function closeViewModal() {
  el("viewModal").classList.remove("show");
  setTimeout(() => el("viewModal").classList.add("hidden"), 300);
}

function downloadQrCode() {
  const qr = el("viewQr").src;
  const link = document.createElement("a");
  link.href = qr;
  link.download = "Folder_QR_Code.png";
  link.click();
  showToast("QR downloaded!");
}

function printFolderDetails() {
  const qr = el("viewQr").src;
  const name = el("viewFolderName").textContent;
  const dept = el("viewDepartment").textContent;
  const loc = el("viewLocation").textContent;
  const by = el("viewCreatedBy").textContent;
  const at = el("viewCreatedAt").textContent;
  const serial = el("viewSerial").textContent;
  const files = Array.from(el("viewFiles").children).map(li => li.textContent).join("<br>");

  const printContent = `
    <div style="font-family: Arial; padding: 20px;">
      <div style="text-align:center;">
        <img src="${qr}" style="width:120px;height:120px;border:1px solid #ccc;border-radius:10px;">
        <h2>${name}</h2><p>Serial: ${serial}</p>
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
      </div>
    </aside>
  `;
  
  document.getElementById('navbar-container').innerHTML = navbarHTML;
  
  // Set active link based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'admin.html')) {
      link.classList.add('active');
    }
  });
  
  // Add logout event listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to logout?')) {
        // Clear any stored session data if needed
        localStorage.removeItem('userSession'); // Optional
        window.location.href = 'login.html';
      }
    });
  }
}

// Load navbar when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
  loadNavbar();
}