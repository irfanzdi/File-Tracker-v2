console.log("🔧 staff.js loading...");

// ---------------------------
// Helpers
// ---------------------------
const el = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

function showToast(message, type = "success") {
  const toast = el("successToast");
  if (!toast) return console.warn("Toast element not found");
  
  el("toastTitle").textContent = type === "success" ? "Success!" : "Error!";
  el("toastMessage").textContent = message;
  toast.classList.remove("hidden", "bg-red-500", "bg-green-500");
  toast.classList.add(type === "success" ? "bg-green-500" : "bg-red-500");
  
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
}

// ---------------------------
// Global state
// ---------------------------
let allFolders = [];
let currentFolderId = null;
let folderToDelete = null;
let userDepartment = null; // Store logged-in user's department

// ---------------------------
// DOM Ready
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded — initializing UI...");



  // Buttons
  el("registerFolderBtn")?.addEventListener("click", () => {
    el("folderFormSection")?.classList.remove("hidden");
    el("fileFormSection")?.classList.add("hidden");
    generateSerialNumber();
  });

  el("registerFileBtn")?.addEventListener("click", () => {
    el("fileFormSection")?.classList.remove("hidden");
    el("folderFormSection")?.classList.add("hidden");
    loadFoldersForFileRegistration();
  });

  // Cancel buttons
  el("cancelFolderBtn")?.addEventListener("click", cancelRegistration);
  el("cancelFileBtn")?.addEventListener("click", cancelRegistration);

  // Forms
  el("folderForm")?.addEventListener("submit", createFolder);
  el("fileForm")?.addEventListener("submit", createFile);
  el("editFolderForm")?.addEventListener("submit", saveFolderChanges);

  // Filters
  el("searchBtn")?.addEventListener("click", applyFilters);
  el("resetFiltersBtn")?.addEventListener("click", clearAllFilters);
  el("exportCSVBtn")?.addEventListener("click", exportToCSV);
  el("printTableBtn")?.addEventListener("click", printTable);
  el("searchInput")?.addEventListener("keypress", e => e.key === "Enter" && applyFilters());

  ["sortBy", "departmentFilter", "locationFilter"].forEach(id => el(id)?.addEventListener("change", applyFilters));

  // Logout
  el("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch(e){ }
    localStorage.clear();
    window.location.href = "/login.html";
  });

  // Modals
  el("closeViewModalBtn")?.addEventListener("click", closeViewModal);
  el("closeViewModalBtn2")?.addEventListener("click", closeViewModal);
  el("downloadQrBtn")?.addEventListener("click", downloadQrCode);
  el("downloadBarcodeBtn")?.addEventListener("click", downloadBarcode);
  el("printDetailsBtn")?.addEventListener("click", printFolderDetails);

  el("closeEditModalBtn")?.addEventListener("click", closeEditModal);
  el("cancelEditBtn")?.addEventListener("click", closeEditModal);

  el("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);
  el("confirmDeleteBtn")?.addEventListener("click", confirmDelete);

  el("fileFolderSelect")?.addEventListener("change", autoFillFileForm);

  // Load initial data
  loadDepartments();
  loadLocations();
  loadFolders();
});

async function loadUserDepartment() {
  await getUserDepartment(); // your existing function
  const deptInput = document.getElementById("folderDepartment");
  if (deptInput && userDepartment) {
    deptInput.value = userDepartment; // correct for input
  } else {
    console.warn("folderDepartment input not found or userDepartment is null");
  }
}

document.addEventListener("DOMContentLoaded", loadUserDepartment);
// ---------------------------
// Get User Department
// ---------------------------
async function getUserDepartment() {
  try {
    const res = await fetch("/api/users/me");
    if (res.ok) {
      const userData = await res.json();

      // FIX: accept any possible key your backend uses
      userDepartment =
        userData.department_id ||   // what frontend expects
        userData.dept ||            // backend session value
        null;

      console.log("User department loaded from API:", userDepartment);
      return;
    }
  } catch (e) {
    console.warn("Could not fetch user department from API");
  }

  // Fallback: localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  userDepartment =
    storedUser.department_id ||    // expected
    storedUser.dept ||             // backend session key
    storedUser.department ||       // if only name exists
    null;

  console.log("User department loaded from localStorage:", userDepartment);
}

async function showUserDepartmentTopRight() {
  try {
    const res = await fetch("/api/users/me");
    if (!res.ok) throw new Error("Failed to fetch user");

    const userData = await res.json();
    const displayEl = document.getElementById("userDepartmentDisplay");
    if (displayEl) {
      displayEl.textContent = userData.department_name || userData.department || "N/A";
    }

    // Store department ID for folder form
    window.userDeptId = userData.department_id || userData.dept || null;
  } catch (err) {
    console.error("Failed to load user department:", err);
    const displayEl = document.getElementById("userDepartmentDisplay");
    if (displayEl) displayEl.textContent = "N/A";
    window.userDeptId = null;
  }
}

document.addEventListener("DOMContentLoaded", showUserDepartmentTopRight);


async function loadUserDepartmentForForm() {
  try {
    const res = await fetch("/api/users/me");
    if (!res.ok) throw new Error("Failed to fetch user");
    const userData = await res.json();

    // Populate folder form input with name
    const deptInput = document.getElementById("folderDepartment");
    if (deptInput) {
      deptInput.value = userData.department_name || userData.department || "N/A";
    }

    // Store the ID for saving
    window.userDeptId = userData.department_id || userData.dept || null;

  } catch (err) {
    console.error("Failed to load department for form:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadUserDepartmentForForm);

// Or if you show the form dynamically:
function showFolderForm() {
  const section = document.getElementById("folderFormSection");
  section.classList.remove("hidden");
  loadUserDepartmentForForm(); // populate input after showing
}


// ---------------------------
// Cancel Registration
// ---------------------------
function cancelRegistration() {
  el("folderForm")?.reset();
  el("fileForm")?.reset();
  el("folderFormSection")?.classList.add("hidden");
  el("fileFormSection")?.classList.add("hidden");
}

// ---------------------------
// Serial Number Generation
// ---------------------------
function generateSerialNumber() {
  const deptSelect = el("folderDepartmentSelect");
  const serialInput = el("folderSerial");
  if (!deptSelect || !serialInput) return;

  // STAFF: Pre-select user's department and disable the select
  if (userDepartment) {
    deptSelect.value = userDepartment;
    deptSelect.disabled = true;
    
    // Automatically generate serial for user's department
    const deptText = deptSelect.options[deptSelect.selectedIndex]?.textContent || "";
    const deptCode = deptText.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();

    generateSerialForDepartment(userDepartment, deptCode, year, serialInput);
  } else {
    serialInput.value = "Department not found";
  }
}

async function generateSerialForDepartment(deptId, deptCode, year, serialInput) {
  try {
    const res = await fetch(`/api/folder/next-id?department_id=${deptId}`);
    const data = await res.json();
    const nextId = data.next_id || 1;
    serialInput.value = `SGV/${year}/${deptCode}/${String(nextId).padStart(3, "0")}`;
  } catch (e) {
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    const deptText = el("folderDepartmentSelect").options[el("folderDepartmentSelect").selectedIndex]?.textContent || "";
    const count = folders.filter(f => f.department === deptText).length + 1;
    serialInput.value = `SGV/${year}/${deptCode}/${String(count).padStart(3, "0")}`;
  }
}

// ---------------------------
// Load Departments
// ---------------------------
async function loadDepartments() {
  const selects = [el("folderDepartmentSelect"), el("editDepartmentSelect"), el("departmentFilter")].filter(Boolean);
  if (!selects.length) return;

  try {
    const res = await fetch("/api/departments");
    if (!res.ok) throw new Error("API failed");
    const data = await res.json();
    selects.forEach((select, idx) => {
      select.innerHTML = (idx === 2) ? "<option value=''>All Departments</option>" : "<option value=''>Select Department</option>";
      data.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.department_id;
        opt.textContent = d.department;
        select.appendChild(opt);
      });
    });
  } catch (e) {
    const fallback = [
      { department_id: 1, department: "HR" },
      { department_id: 2, department: "Finance" },
      { department_id: 3, department: "IT" },
      { department_id: 4, department: "Operations" },
      { department_id: 5, department: "Marketing" },
      { department_id: 6, department: "Sales" },
    ];
    selects.forEach((select, idx) => {
      select.innerHTML = (idx === 2) ? "<option value=''>All Departments</option>" : "<option value=''>Select Department</option>";
      fallback.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.department_id;
        opt.textContent = d.department;
        select.appendChild(opt);
      });
    });
  }
}

// ---------------------------
// Load Locations
// ---------------------------
async function loadLocations() {
  const selects = [el("folderLocationsSelect"), el("editLocationSelect"), el("locationFilter")].filter(Boolean);
  if (!selects.length) return;

  try {
    const res = await fetch("/api/locations");
    if (!res.ok) throw new Error("API failed");
    const data = await res.json();
    selects.forEach((select, idx) => {
      select.innerHTML = (idx === 2) ? "<option value=''>All Locations</option>" : "<option value=''>Select Location</option>";
      data.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.location_id;
        opt.textContent = l.location_name;
        select.appendChild(opt);
      });
    });
  } catch (e) {
    const fallback = [
      { location_id: 1, location_name: "Building A - Floor 1" },
      { location_id: 2, location_name: "Building A - Floor 2" },
      { location_id: 3, location_name: "Building B - Floor 1" },
      { location_id: 4, location_name: "Building B - Floor 2" },
      { location_id: 5, location_name: "Archive Room" },
    ];
    selects.forEach((select, idx) => {
      select.innerHTML = (idx === 2) ? "<option value=''>All Locations</option>" : "<option value=''>Select Location</option>";
      fallback.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.location_id;
        opt.textContent = l.location_name;
        select.appendChild(opt);
      });
    });
  }
}

// ---------------------------
// Load Folders (STAFF: Filter by user department)
// ---------------------------
async function loadFolders() {
  try {
    const res = await fetch("/api/folder");
    if (!res.ok) throw new Error("API failed");
    const allData = await res.json();
    
    // STAFF: Only show folders from user's department
    if (userDepartment) {
      const deptSelect = el("folderDepartmentSelect");
      const userDeptName = deptSelect?.options[Array.from(deptSelect.options).findIndex(opt => opt.value == userDepartment)]?.textContent;
      allFolders = allData.filter(f => f.department === userDeptName || f.department_id == userDepartment);
    } else {
      allFolders = allData;
    }
    
    console.log("Loaded folders from API:", allFolders.length);
  } catch (e) {
    allFolders = JSON.parse(localStorage.getItem("folders") || "[]");
    console.log("Using local folders:", allFolders.length);
    
    if (allFolders.length === 0) {
      allFolders = [
        {
          folder_id: 1,
          folder_name: "Employee Records",
          department: "HR",
          location: "Building A - Floor 1",
          serial_num: "SGV/2025/HRD/001",
          used_for: "Employee documentation and records",
          files_inside: ["Contract.pdf", "Resume.pdf", "ID Copy.pdf"],
          created_at: new Date().toISOString(),
          created_by: "HR Admin",
          is_active: true
        }
      ];
      localStorage.setItem("folders", JSON.stringify(allFolders));
    }
  }
  applyFilters();
}


// ---------------------------
// Render Table
// ---------------------------
function renderTable(folders) {
  const tbody = el("foldersTableBody");
  const noFiles = el("noFiles");
  const resultsCount = el("resultsCount");
  if (!tbody) return;

  tbody.innerHTML = "";

  const active = (folders || []).filter(f => f.is_active !== false);

  if (!active.length) {
    if (noFiles) noFiles.classList.remove("hidden");
    if (resultsCount) resultsCount.innerHTML = 'Showing <span class="font-semibold text-navy">0</span> folders';
    return;
  }
  if (noFiles) noFiles.classList.add("hidden");
  if (resultsCount) resultsCount.innerHTML = `Showing <span class="font-semibold text-navy">${active.length}</span> folders`;

  active.forEach(folder => {
    const filesCount = folder.files_inside?.length || 0;
    const folderId = folder.folder_id ?? folder.id ?? Date.now();

    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition";
    tr.dataset.folderId = folderId;

    tr.innerHTML = `
      <td class="px-4 py-3 text-sm font-mono text-blue-900">${escapeHtml(folder.serial_num || "-")}</td>
      <td class="px-4 py-3 text-sm">
        <a href="#" class="folder-name-link" data-folder-id="${folderId}">${escapeHtml(folder.folder_name || "-")}</a>
      </td>
      <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(folder.department || "-")}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(folder.location_name || folder.location || "-")}</td>
      <td class="px-4 py-3 text-center">
        <span class="badge bg-blue-100 text-blue-800">${filesCount} ${filesCount === 1 ? 'file' : 'files'}</span>
      </td>
      <td class="px-4 py-3 text-center">
        <div class="flex justify-center gap-2" id="actions-${folderId}"></div>
      </td>
    `;

    tbody.appendChild(tr);

    // Folder name click
    const link = tr.querySelector(".folder-name-link");
    if (link) {
      link.onclick = (e) => {
        e.preventDefault();
        toggleFiles(e, folderId);
      };
    }

    // Action buttons
    const actionsCell = el(`actions-${folderId}`);
    if (actionsCell) {
      const viewBtn = document.createElement("button");
      viewBtn.className = "action-btn action-btn-view";
      viewBtn.textContent = "View";
      viewBtn.type = "button";
      viewBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        openViewModal(folderId);
      };

      // const editBtn = document.createElement("button");
      // editBtn.className = "action-btn action-btn-edit";
      // editBtn.textContent = "Edit";
      // editBtn.type = "button";
      // editBtn.onclick = function(e) {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   openEditModal(folderId);
      // };

      // const deleteBtn = document.createElement("button");
      // deleteBtn.className = "action-btn action-btn-delete";
      // deleteBtn.textContent = "Delete";
      // deleteBtn.type = "button";
      // deleteBtn.onclick = function(e) {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   openDeleteModal(folderId, folder.folder_name, folder.serial_num);
      // };

      actionsCell.appendChild(viewBtn);
      // actionsCell.appendChild(editBtn);
      // actionsCell.appendChild(deleteBtn);
    }
  });
}

// ---------------------------
// Toggle Files Row
// ---------------------------
function toggleFiles(event, folderId) {
  event.preventDefault();
  const existing = el(`files-row-${folderId}`);
  if (existing) { 
    existing.remove(); 
    return; 
  }

  const folder = allFolders.find(f => String(f.folder_id ?? f.id) === String(folderId));
  if (!folder) return;

  const tr = event.target.closest("tr");
  const filesRow = document.createElement("tr");
  filesRow.id = `files-row-${folderId}`;
  filesRow.className = "files-expanded-row";

  let filesHTML = '';
  if (folder.files_inside && folder.files_inside.length) {
    filesHTML = folder.files_inside.map(fn => 
      `<div class="file-item"><span class="text-blue-900">📄</span><span class="text-gray-700">${escapeHtml(fn)}</span></div>`
    ).join('');
  } else {
    filesHTML = '<div class="text-gray-500 italic text-center py-4">No files in this folder</div>';
  }

  filesRow.innerHTML = `
    <td colspan="6" class="px-4 py-4">
      <div class="bg-white rounded-lg border border-blue-200 p-4">
        <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span class="text-blue-900">📎</span> Files in "${escapeHtml(folder.folder_name)}"
        </h4>
        <div class="files-list-container space-y-2">${filesHTML}</div>
      </div>
    </td>
  `;
  tr.after(filesRow);
}

// ---------------------------
// View Modal
// ---------------------------
function openViewModal(id) {
  console.log("openViewModal called with id:", id);
  const folder = allFolders.find(f => String(f.folder_id ?? f.id) === String(id));
  if (!folder) {
    console.error("Folder not found:", id);
    return showToast("Folder not found", "error");
  }

  el("viewFolderName").textContent = folder.folder_name || "-";
  el("viewDepartment").textContent = folder.department || "-";
  el("viewLocation").textContent = folder.location_name || folder.location || "-";
  el("viewCreatedBy").textContent = folder.created_by || "-";
  el("viewCreatedAt").textContent = folder.created_at ? new Date(folder.created_at).toLocaleString() : "-";
  el("viewSerial").textContent = folder.serial_num || "-";
  el("filesCount").textContent = folder.files_inside?.length || 0;

  const usedForSection = el("viewUsedForSection");
  const usedForText = el("viewUsedFor");
  if (folder.used_for) {
    usedForText.textContent = folder.used_for;
    usedForSection.classList.remove("hidden");
  } else {
    usedForSection.classList.add("hidden");
  }

  const viewFiles = el("viewFiles");
  if (viewFiles) {
    viewFiles.innerHTML = "";
    if (folder.files_inside && folder.files_inside.length) {
      folder.files_inside.forEach(f => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `<span class="text-blue-900">📄</span> <span class="text-gray-700">${escapeHtml(f)}</span>`;
        viewFiles.appendChild(div);
      });
    } else {
      viewFiles.innerHTML = '<div class="text-gray-500 italic text-center py-8">No files in this folder</div>';
    }
  }

  const qrImg = el("viewQr");
  if (qrImg) {
    if (folder.qr_code) {
      qrImg.src = folder.qr_code;
    } else if (folder.serial_num && window.QRCode) {
      try {
        QRCode.toDataURL(folder.serial_num, { width: 200 }, (err, url) => {
          if (!err) qrImg.src = url;
        });
      } catch (e) {
        console.warn("QR generation failed", e);
      }
    }
  }

  try {
    if (window.JsBarcode && folder.serial_num) {
      JsBarcode("#viewBarcode", folder.serial_num, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true
      });
    }
  } catch (e) {
    console.warn("Barcode generation error", e);
  }

  const modal = el("viewModal");
  if (modal) {
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.add("modal-show"), 10);
  }
}

function closeViewModal() {
  const modal = el("viewModal");
  if (!modal) return;
  modal.classList.remove("modal-show");
  setTimeout(() => modal.classList.add("hidden"), 200);
}

// ---------------------------
// Edit Modal
// ---------------------------
function openEditModal(id) {
  console.log("openEditModal called with id:", id);
  currentFolderId = id;
  const folder = allFolders.find(f => String(f.folder_id ?? f.id) === String(id));
  if (!folder) {
    console.error("Folder not found:", id);
    return showToast("Folder not found", "error");
  }

  // el("editFolderName").value = folder.folder_name || "";
  
  const dept = el("editDepartmentSelect");
  if (dept) {
    for (let i = 0; i < dept.options.length; i++) {
      if (dept.options[i].textContent === folder.department) {
        dept.selectedIndex = i;
        break;
      }
    }
  }

  const loc = el("editLocationSelect");
  if (loc) {
    for (let i = 0; i < loc.options.length; i++) {
      if (loc.options[i].textContent === (folder.location_name || folder.location)) {
        loc.selectedIndex = i;
        break;
      }
    }
  }

  const modal = el("editModal");
  if (modal) {
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.add("modal-show"), 10);
  }
}

function closeEditModal() {
  const modal = el("editModal");
  currentFolderId = null;
  if (!modal) return;
  modal.classList.remove("modal-show");
  setTimeout(() => modal.classList.add("hidden"), 200);
}

async function saveFolderChanges(e) {
  e.preventDefault();
  if (!currentFolderId) return;

  const folder_name = el("editFolderName")?.value?.trim();
  const department_id = el("editDepartmentSelect")?.value;
  const location_id = el("editLocationSelect")?.value;
  
  if (!folder_name || !department_id || !location_id) {
    return showToast("Please fill all fields!", "error");
  }

  try {
    const res = await fetch(`/api/folder/${currentFolderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_name, department_id, location_id })
    });
    if (!res.ok) throw new Error("API failed");
    showToast("Folder updated successfully!");
    closeEditModal();
    await loadFolders();
  } catch (e) {
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    const idx = folders.findIndex(f => String(f.folder_id ?? f.id) === String(currentFolderId));
    if (idx !== -1) {
      const deptText = el("editDepartmentSelect")?.options[el("editDepartmentSelect").selectedIndex]?.textContent || "";
      const locText = el("editLocationSelect")?.options[el("editLocationSelect").selectedIndex]?.textContent || "";
      folders[idx].folder_name = folder_name;
      folders[idx].department = deptText;
      folders[idx].location = locText;
      localStorage.setItem("folders", JSON.stringify(folders));
      showToast("Folder updated (local)!");
      closeEditModal();
      await loadFolders();
    } else {
      showToast("Folder not found", "error");
    }
  }
}

// ---------------------------
// Delete Modal
// ---------------------------
function openDeleteModal(folderId, folderName, folderSerial) {
  folderToDelete = folderId;
  el("deleteFolderName").textContent = folderName || "-";
  el("deleteFolderSerial").textContent = folderSerial || "-";
  const modal = el("deleteModal");
  if (modal) {
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.add("modal-show"), 10);
  }
}

function closeDeleteModal() {
  folderToDelete = null;
  const modal = el("deleteModal");
  if (!modal) return;
  modal.classList.remove("modal-show");
  setTimeout(() => modal.classList.add("hidden"), 200);
}

async function confirmDelete() {
  if (!folderToDelete) return;
  
  try {
    const res = await fetch(`/api/folder/${folderToDelete}`, { method: "DELETE" });
    if (!res.ok) throw new Error("API failed");
    showToast("Folder deleted successfully!");
    await loadFolders();
  } catch (e) {
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    const idx = folders.findIndex(f => String(f.folder_id ?? f.id) === String(folderToDelete));
    if (idx !== -1) {
      folders[idx].is_active = false;
      localStorage.setItem("folders", JSON.stringify(folders));
      showToast("Folder deleted (local)!");
      await loadFolders();
    } else {
      showToast("Folder not found", "error");
    }
  }
  closeDeleteModal();
}

// ---------------------------
// Create Folder (STAFF: Location empty, department auto-filled)
// ---------------------------
// Assume getUserDepartment() gives you both id and name
// userDepartment = { id: 6, name: "IT" }

async function createFolder(e) {
  e.preventDefault();

  const folder_name = document.getElementById("folderTitle")?.value?.trim();
  const serial_num = document.getElementById("folderSerial")?.value || null;
  const used_for = document.getElementById("folderUsedFor")?.value?.trim() || "";
  const location_id = document.getElementById("folderLocationsSelect")?.value || null;

  // Validation
  if (!folder_name) return showToast("Folder title is required!", "error");
  if (!userDeptId) return showToast("Department not loaded yet!", "error");

  // Build payload
  const payload = {
    folder_name,
    department_id: Number(userDeptId), // send ID as number
    location_id: location_id ? Number(location_id) : 6,
    serial_num,
    used_for
  };

  console.log("Saving folder payload:", payload);

  try {
    const res = await fetch("/api/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to save folder");
    }

    showToast("Folder successfully added! HR will assign location.");
    e.target.reset();
    cancelRegistration();
    await loadFolders();

  } catch (err) {
    console.error("Failed to save folder:", err);

    // Local fallback
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    folders.push({
      folder_id: Date.now(),
      folder_name,
      department: document.getElementById("folderDepartment")?.value || "N/A",
      location: "Unassigned",
      serial_num,
      used_for,
      files_inside: [],
      created_at: new Date().toISOString(),
      created_by: "Staff User",
      is_active: true
    });
    localStorage.setItem("folders", JSON.stringify(folders));

    showToast("Folder added locally! HR will assign location.");
    e.target.reset();
    cancelRegistration();
    await loadFolders();
  }
}

// Attach form submit
document.getElementById("folderForm")?.addEventListener("submit", createFolder);

// ---------------------------
// Create File (Normal: Choose folder)
// ---------------------------
async function createFile(e) {
  e.preventDefault();
  const file_name = el("fileName")?.value?.trim();
  const folder_id = el("fileFolderSelect")?.value;
  const description = el("fileDescription")?.value?.trim() || "";

  if (!file_name || !folder_id) {
    return showToast("Please fill all required fields!", "error");
  }

  try {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name, folder_id, description })
    });
    if (!res.ok) throw new Error("API failed");
    showToast("File successfully added!");
    e.target.reset();
    cancelRegistration();
    await loadFolders();
  } catch (e) {
    const files = JSON.parse(localStorage.getItem("files") || "[]");
    files.push({ 
      file_id: Date.now(), 
      file_name, 
      folder_id, 
      description, 
      created_at: new Date().toISOString() 
    });
    localStorage.setItem("files", JSON.stringify(files));
    
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    const folder = folders.find(f => String(f.folder_id) === String(folder_id));
    if (folder) {
      folder.files_inside = folder.files_inside || [];
      folder.files_inside.push(file_name);
      localStorage.setItem("folders", JSON.stringify(folders));
    }
    
    showToast("File added (local)!");
    e.target.reset();
    cancelRegistration();
    await loadFolders();
  }
}

// ---------------------------
// Load Folders for File Registration
// ---------------------------
async function loadFoldersForFileRegistration() {
  const select = el("fileFolderSelect");
  if (!select) return;
  select.innerHTML = "<option value=''>Loading folders...</option>";

  try {
    const res = await fetch("/api/folder");
    if (!res.ok) throw new Error("API failed");
    const folders = await res.json();
    const active = folders.filter(f => f.is_active !== false);
    select.innerHTML = "<option value=''>Select Folder</option>";
    active.forEach(f => {
      const o = document.createElement("option");
      o.value = f.folder_id;
      o.textContent = `${f.serial_num} - ${f.folder_name}`;
      o.dataset.department = f.department || "";
      o.dataset.location = f.location_name || f.location || "";
      select.appendChild(o);
    });
  } catch (e) {
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    select.innerHTML = "<option value=''>Select Folder</option>";
    folders.filter(f => f.is_active !== false).forEach(f => {
      const o = document.createElement("option");
      o.value = f.folder_id;
      o.textContent = `${f.serial_num} - ${f.folder_name}`;
      o.dataset.department = f.department || "";
      o.dataset.location = f.location || "";
      select.appendChild(o);
    });
  }
}

// ---------------------------
// Autofill File Form
// ---------------------------
function autoFillFileForm() {
  const select = el("fileFolderSelect");
  if (!select) return;
  const opt = select.options[select.selectedIndex];
  if (opt && opt.value) {
    el("fileDepartment").value = opt.dataset.department || "";
    el("fileLocation").value = opt.dataset.location || "";
  } else {
    el("fileDepartment").value = "";
    el("fileLocation").value = "";
  }
}

// ---------------------------
// Apply Filters
// ---------------------------
function applyFilters() {
  const searchText = el("searchInput")?.value?.toLowerCase() || "";
  const deptVal = el("departmentFilter")?.value || "";
  const locVal = el("locationFilter")?.value || "";
  const sortBy = el("sortBy")?.value || "created_desc";

  let filtered = (allFolders || []).filter(f => f.is_active !== false);

  if (searchText) {
    filtered = filtered.filter(f => 
      (f.folder_name || "").toLowerCase().includes(searchText) || 
      (f.serial_num || "").toLowerCase().includes(searchText)
    );
  }
  
  if (deptVal) {
    const deptName = el("departmentFilter").options[el("departmentFilter").selectedIndex].textContent;
    filtered = filtered.filter(f => f.department === deptName);
  }
  
  if (locVal) {
    const locName = el("locationFilter").options[el("locationFilter").selectedIndex].textContent;
    filtered = filtered.filter(f => (f.location || f.location_name) === locName);
  }

  switch (sortBy) {
    case "created_desc": 
      filtered.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); 
      break;
    case "created_asc": 
      filtered.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); 
      break;
    case "name_asc": 
      filtered.sort((a,b) => (a.folder_name || "").localeCompare(b.folder_name || "")); 
      break;
    case "name_desc": 
      filtered.sort((a,b) => (b.folder_name || "").localeCompare(a.folder_name || "")); 
      break;
    case "files_desc": 
      filtered.sort((a,b) => (b.files_inside?.length || 0) - (a.files_inside?.length || 0)); 
      break;
    case "files_asc": 
      filtered.sort((a,b) => (a.files_inside?.length || 0) - (b.files_inside?.length || 0)); 
      break;
  }

  updateFilterChips(searchText, deptVal, locVal);
  renderTable(filtered);
}

// ---------------------------
// Clear All Filters
// ---------------------------
function clearAllFilters() {
  el("searchInput").value = "";
  el("departmentFilter").selectedIndex = 0;
  el("locationFilter").selectedIndex = 0;
  el("sortBy").selectedIndex = 0;
  applyFilters();
}

// ---------------------------
// Update Filter Chips
// ---------------------------
function updateFilterChips(searchText, deptFilter, locFilter) {
  const chipsContainer = el("filterChips");
  const activeFiltersDiv = el("activeFilters");
  if (!chipsContainer || !activeFiltersDiv) return;
  
  chipsContainer.innerHTML = "";
  const chips = [];
  
  if (searchText) chips.push(`Search: "${searchText}"`);
  
  if (deptFilter) {
    const name = el("departmentFilter").options[el("departmentFilter").selectedIndex].textContent;
    chips.push(`Department: ${name}`);
  }
  
  if (locFilter) {
    const name = el("locationFilter").options[el("locationFilter").selectedIndex].textContent;
    chips.push(`Location: ${name}`);
  }
  
  if (chips.length) {
    activeFiltersDiv.classList.remove("hidden");
    chips.forEach(c => {
      const s = document.createElement("span");
      s.className = "filter-chip";
      s.textContent = c;
      chipsContainer.appendChild(s);
    });
  } else {
    activeFiltersDiv.classList.add("hidden");
  }
}

// ---------------------------
// Export to CSV
// ---------------------------
function exportToCSV() {
  const activeFolders = (allFolders || []).filter(f => f.is_active !== false);
  let csv = 'Serial Number,Folder Name,Department,Location,Files Count,Created By,Created At\n';
  
  activeFolders.forEach(folder => {
    const filesCount = folder.files_inside?.length || 0;
    const createdAt = folder.created_at ? new Date(folder.created_at).toLocaleString() : '-';
    csv += `"${folder.serial_num || ''}","${folder.folder_name || ''}","${folder.department || ''}","${folder.location || ''}",${filesCount},"${folder.created_by || ''}","${createdAt}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `folders_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported successfully!");
}

// ---------------------------
// Print, QR, Barcode
// ---------------------------
function printTable() { window.print(); }

function downloadQrCode() {
  const qrImg = el("viewQr");
  const serial = el("viewSerial")?.textContent || "qr";
  if (!qrImg || !qrImg.src) return showToast("No QR available", "error");
  
  const a = document.createElement("a");
  a.href = qrImg.src;
  a.download = `QR_${serial}.png`;
  a.click();
  showToast("QR Code downloaded!");
}

function downloadBarcode() {
  const svg = q("#viewBarcode");
  const serial = el("viewSerial")?.textContent || "barcode";
  if (!svg) return showToast("No barcode", "error");
  
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `Barcode_${serial}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Barcode downloaded!");
  };
  
  img.src = url;
}

function printFolderDetails() { window.print();}

console.log("✅ staff.js loaded successfully!");
