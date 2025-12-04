// /js/admin/admin.js
// Fixed version with working View, Edit buttons and Mobile Menu

console.log("🔧 admin.js loading...");

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

// Test immediately
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM Content Loaded - Testing user info...");
    loadUserInfo();
});


// ---------------------------
// Helper
// ---------------------------
const el = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

function showToast(message, type = "success") {
  const toast = el("successToast");
  if (!toast) {
    console.warn("Toast element not found");
    return;
  }
  el("toastTitle").textContent = type === "success" ? "Success!" : "Error!";
  el("toastMessage").textContent = message;
  toast.classList.remove("hidden");
  toast.classList.remove("bg-red-500", "bg-green-500");
  toast.classList.add(type === "success" ? "bg-green-500" : "bg-red-500");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// ---------------------------
// Global state
// ---------------------------
let allFolders = [];
let currentFolderId = null;
let folderToDelete = null;

// ---------------------------
// DOM ready
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded — initializing UI...");

  // ========================================
  // MOBILE MENU SETUP
  // ========================================
  const mobileMenuBtn = el("mobileMenuBtn");
  const sidebar = el("sidebar");
  const sidebarOverlay = el("sidebarOverlay");
  
  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("Mobile menu clicked");
      sidebar.classList.toggle("active");
      sidebarOverlay.classList.toggle("active");
    });
    
    sidebarOverlay.addEventListener("click", function() {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
    
    // Close sidebar when nav link clicked on mobile
    const navLinks = document.querySelectorAll(".sidebar nav a");
    navLinks.forEach(link => {
      link.addEventListener("click", function() {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove("active");
          sidebarOverlay.classList.remove("active");
        }
      });
    });
  }

  // Buttons that show forms
  const registerFolderBtn = el("registerFolderBtn");
  const registerFileBtn = el("registerFileBtn");
  const existingFileBtn = el("existingFileBtn");
  const folderFormSection = el("folderFormSection");
  const fileFormSection = el("fileFormSection");
  const existingFormSection = el("existingFormSection");

  if (registerFolderBtn) {
    registerFolderBtn.addEventListener("click", () => {
      folderFormSection?.classList.remove("hidden");
      fileFormSection?.classList.add("hidden");
      existingFormSection?.classList.add("hidden");
      generateSerialNumber();
    });
  }
  if (registerFileBtn) {
    registerFileBtn.addEventListener("click", () => {
      fileFormSection?.classList.remove("hidden");
      folderFormSection?.classList.add("hidden");
      existingFormSection?.classList.add("hidden");
      loadFoldersForFileRegistration();
    });
  }
  if (existingFileBtn) {
    existingFileBtn.addEventListener("click", async () => {
      fileFormSection?.classList.add("hidden");
      folderFormSection?.classList.add("hidden");
      existingFormSection?.classList.remove("hidden");

      await loadFoldersForExistingFile();
      bindExistingFolderAutoFill();
    });
  }

  // Cancel buttons
  el("cancelFolderBtn")?.addEventListener("click", cancelRegistration);
  el("cancelFileBtn")?.addEventListener("click", cancelRegistration);
  el("cancelExistingBtn")?.addEventListener("click", cancelRegistration);

  // Forms submit
  el("folderForm")?.addEventListener("submit", createFolder);
  el("fileForm")?.addEventListener("submit", createFile);
  el("editFolderForm")?.addEventListener("submit", saveFolderChanges);
  el("existingForm")?.addEventListener("submit", createExisting);

  // Filters and search
  el("searchBtn")?.addEventListener("click", applyFilters);
  el("resetFiltersBtn")?.addEventListener("click", clearAllFilters);
  el("exportCSVBtn")?.addEventListener("click", exportToCSV);
  el("printTableBtn")?.addEventListener("click", printTable);
  el("searchInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") applyFilters();
  });

  // Sort change
  el("sortBy")?.addEventListener("change", applyFilters);
  el("departmentFilter")?.addEventListener("change", applyFilters);
  el("locationFilter")?.addEventListener("change", applyFilters);

  // Logout
  el("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try { 
      await fetch("/api/auth/logout", { method: "POST" }); 
    } catch(e) { 
      /* ignore */ 
    }
    localStorage.clear();
    window.location.href = "/login.html";
  });

  // View modal
  el("closeViewModal")?.addEventListener("click", closeViewModal);
  el("closeViewModalBtn2")?.addEventListener("click", closeViewModal);
  el("downloadQrBtn")?.addEventListener("click", downloadQrCode);
  el("downloadBarcodeBtn")?.addEventListener("click", downloadBarcode);
  el("printDetailsBtn")?.addEventListener("click", printFolderDetails);

  // Edit modal
  el("closeEditModalBtn")?.addEventListener("click", closeEditModal);

  // Delete modal
  el("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);
  el("confirmDeleteBtn")?.addEventListener("click", confirmDelete);

  // File folder select
  el("fileFolderSelect")?.addEventListener("change", autoFillFileForm);

  // Load initial data
  loadDepartments();
  loadLocations();
  loadFolders();
});

// ---------------------------
// Cancel registration
// ---------------------------
function cancelRegistration() {
  el("folderForm")?.reset();
  el("fileForm")?.reset();
  el("existingForm")?.reset();
  el("folderFormSection")?.classList.add("hidden");
  el("fileFormSection")?.classList.add("hidden");
  el("existingFormSection")?.classList.add("hidden");
}

// ---------------------------
// Generate Serial Number
// ---------------------------
function generateSerialNumber() {
  const deptSelect = el("folderDepartmentSelect");
  const serialInput = el("folderSerial");
  if (!deptSelect || !serialInput) return;

  serialInput.value = "Select department first";

  if (!deptSelect.dataset.listenerBound) {
    deptSelect.addEventListener("change", async () => {
      const deptId = deptSelect.value;
      if (!deptId) {
        serialInput.value = "Select department first";
        return;
      }
      const deptText = deptSelect.options[deptSelect.selectedIndex]?.textContent || "";
      const deptCode = deptText.substring(0, 3).toUpperCase();
      const year = new Date().getFullYear();

      try {
        const res = await fetch(`/api/folder/next-id?department_id=${deptId}`);
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        const nextId = data.next_id || 1;
        serialInput.value = `SGV/${year}/${deptCode}/${String(nextId).padStart(3, "0")}`;
      } catch (e) {
        const folders = JSON.parse(localStorage.getItem("folders") || "[]");
        const count = folders.filter(f => f.department === deptText).length + 1;
        serialInput.value = `SGV/${year}/${deptCode}/${String(count).padStart(3, "0")}`;
      }
    });
    deptSelect.dataset.listenerBound = "1";
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
// Load Folders
// ---------------------------
async function loadFolders() {
  try {
    const res = await fetch("/api/folder");
    if (!res.ok) throw new Error("API failed");
    allFolders = await res.json();
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
        },
        {
          folder_id: 2,
          folder_name: "Payroll Documents",
          department: "Finance",
          location: "Building A - Floor 2",
          serial_num: "SGV/2025/FIN/001",
          used_for: "Monthly payroll processing",
          files_inside: ["Payslip_Jan.pdf", "Tax_Forms.pdf"],
          created_at: new Date().toISOString(),
          created_by: "Finance Team",
          is_active: true
        }
      ];
      localStorage.setItem("folders", JSON.stringify(allFolders));
    }
  }
  applyFilters();
}

// ---------------------------
// Render table
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

    // Action buttons - Using onclick for better compatibility
    const actionsCell = el(`actions-${folderId}`);
    if (actionsCell) {
      // View button
      const viewBtn = document.createElement("button");
      viewBtn.className = "action-btn action-btn-view";
      viewBtn.textContent = "View";
      viewBtn.type = "button";
      viewBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("View clicked for folder:", folderId);
        openViewModal(folderId);
      };

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "action-btn action-btn-edit";
      editBtn.textContent = "Edit";
      editBtn.type = "button";
      editBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Edit clicked for folder:", folderId);
        openEditModal(folderId);
      };

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-btn action-btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.type = "button";
      deleteBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Delete clicked for folder:", folderId);
        openDeleteModal(folderId, folder.folder_name, folder.serial_num);
      };

      actionsCell.appendChild(viewBtn);
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);
    }
  });
}

// ---------------------------
// escapeHtml
// ---------------------------
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
}

// ---------------------------
// Toggle files row
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
// Open View Modal
// ---------------------------
async function openViewModal(id) {
  console.log("openViewModal called with id:", id);

  try {
    const res = await fetch(`/api/folder/${id}`);
    
    if (!res.ok) {
      throw new Error(`Failed to load folder: ${res.status}`);
    }

    const folder = await res.json();
    console.log("Loaded folder details:", folder);

    // Safe text setter helper
    const setText = (elementId, text) => {
      const element = document.getElementById(elementId);
      if (element) element.textContent = text ?? "-";
    };

    // Populate folder information
    setText("viewFolderName", folder.folder_name);
    setText("viewDepartment", folder.department);
    setText("viewLocation", folder.location_name || folder.location);
    setText("viewCreatedBy", folder.created_by);
    setText("viewCreatedAt", folder.created_at ? new Date(folder.created_at).toLocaleString() : "-");
    setText("viewSerial", folder.serial_num);
    setText("filesCount", folder.files_inside?.length ?? 0);

    // Used For section (optional field)
    const usedForSection = el("viewUsedForSection");
    const usedForText = el("viewUsedFor");
    if (usedForSection && usedForText) {
      if (folder.used_for) {
        usedForText.textContent = folder.used_for;
        usedForSection.classList.remove("hidden");
      } else {
        usedForSection.classList.add("hidden");
      }
    }

    // QR Code
    const qrImg = el("viewQr");
    if (qrImg) {
      if (folder.qr_code) {
        qrImg.src = folder.qr_code;
        console.log("QR code loaded from API:", folder.qr_code);
      } else if (folder.serial_num && window.QRCode) {
        console.log("Generating QR code for serial:", folder.serial_num);
        QRCode.toDataURL(folder.serial_num, { width: 200 }, (err, url) => {
          if (!err && qrImg) {
            qrImg.src = url;
          }
        });
      }
    }

    // Barcode generation
    try {
      if (window.JsBarcode && folder.serial_num) {
        const barcodeElement = document.querySelector("#viewBarcode");
        if (barcodeElement) {
          JsBarcode("#viewBarcode", folder.serial_num, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true
          });
        }
      }
    } catch (e) {
      console.warn("Barcode generation error:", e);
    }

    // Files list
    const viewFiles = el("viewFiles");
    if (viewFiles) {
      viewFiles.innerHTML = "";
      
      if (folder.files_inside && folder.files_inside.length > 0) {
        folder.files_inside.forEach(fileName => {
          const div = document.createElement("div");
          div.className = "file-item";
          div.innerHTML = `
            <span class="text-blue-900">📄</span>
            <span class="text-gray-700">${escapeHtml(fileName)}</span>
          `;
          viewFiles.appendChild(div);
        });
      } else {
        viewFiles.innerHTML = '<div class="text-gray-500 italic text-center py-8">No files in this folder</div>';
      }
    }

    // Show modal with animation
    const modal = el("viewModal");
    if (modal) {
      modal.classList.remove("hidden");
      setTimeout(() => modal.classList.add("modal-show"), 10);
    }

  } catch (err) {
    console.error("Error opening view modal:", err);
    showToast("Failed to load folder details", "error");
  }
}

function closeViewModal() {
  const modal = el("viewModal");
  if (!modal) return;
  modal.classList.remove("modal-show");
  setTimeout(() => modal.classList.add("hidden"), 200);
}

// ---------------------------
// Open Edit Modal
// ---------------------------
async function openEditModal(folderId) {
  try {
    const res = await fetch(`/api/folder/${folderId}`);
    if (!res.ok) throw new Error("Failed to fetch folder data");
    const folder = await res.json();

    const editModal = el("editModal");
    const folderNameInput = el("editFolderName");
    const deptSelect = el("editDepartmentSelect");
    const locSelect = el("editLocationSelect");
    const filesContainer = el("editFilesList");
    const editForm = el("editFolderForm");

    if (!editModal || !folderNameInput || !deptSelect || !locSelect || !filesContainer || !editForm) {
      console.error("Missing modal elements");
      return;
    }

    editForm.dataset.folderId = folderId;

    folderNameInput.value = folder.folder_name || "";
    deptSelect.value = folder.department_id || "";
    locSelect.value = folder.location_id || "";

    filesContainer.innerHTML = "";

    if (folder.files_inside?.length > 0) {
      folder.files_inside.forEach((fileName, i) => {
        const fileId = folder.file_ids?.[i];

        const div = document.createElement("div");
        div.className = "file-item flex justify-between items-center bg-white p-2 rounded border";

        div.innerHTML = `
          <span>${escapeHtml(fileName)}</span>
          <button 
            type="button"
            class="text-red-600 hover:text-red-800 remove-file-btn"
            data-file-id="${fileId}"
          >✖</button>
        `;

        filesContainer.appendChild(div);
      });
    } else {
      filesContainer.innerHTML = `
        <div class="text-gray-500 italic py-2">No files in this folder</div>
      `;
    }

    editModal.classList.remove("hidden");
    setTimeout(() => editModal.classList.add("modal-show"), 10);

    filesContainer.querySelectorAll(".remove-file-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        const fileDiv = e.currentTarget.closest(".file-item");

        if (!fileId || !fileDiv) return;

        try {
          const unlinkRes = await fetch(`/api/files/${fileId}/unlink`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_id: null })
          });

          if (!unlinkRes.ok) throw new Error("Failed to unlink file");

          fileDiv.remove();
          showToast("File removed from folder", "success");

        } catch (err) {
          console.error(err);
          showToast("Error removing file", "error");
        }
      });
    });

  } catch (err) {
    console.error(err);
    showToast("Failed to open edit modal", "error");
  }
}

function closeEditModal() {
  const modal = el("editModal");
  currentFolderId = null;
  if (!modal) return;

  modal.classList.remove("modal-show");

  setTimeout(() => {
    modal.classList.add("hidden");
    location.reload(); 
  }, 200); 
}

// ---------------------------
// Save folder changes
// ---------------------------
async function saveFolderChanges(e) {
  e.preventDefault();

  const form = el("editFolderForm");
  const folderId = form?.dataset.folderId;

  if (!folderId) {
    return showToast("Error: No folder selected", "error");
  }

  const folderName = el("editFolderName")?.value.trim();
  const departmentId = el("editDepartmentSelect")?.value;
  const locationId = el("editLocationSelect")?.value;

  if (!folderName || !departmentId || !locationId) {
    return showToast("Please fill all required fields", "error");
  }

  try {
    const res = await fetch(`/api/folder/${folderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder_name: folderName,
        department_id: departmentId,
        location_id: locationId
      })
    });

    if (!res.ok) throw new Error("Failed to save folder changes");

    showToast("Folder updated successfully", "success");
    closeEditModal();
    setTimeout(() => location.reload(), 250);

  } catch (err) {
    console.error(err);
    showToast("Error saving folder changes", "error");
  }
}

// ---------------------------
// Delete Modal
// ---------------------------
function openDeleteModal(folderId, folderName, folderSerial) {
  console.log("openDeleteModal called:", folderId, folderName, folderSerial);
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
// Create Folder
// ---------------------------
async function createFolder(e) {
  e.preventDefault();
  const folder_name = el("folderTitle")?.value?.trim();
  const department_id = el("folderDepartmentSelect")?.value;
  const location_id = el("folderLocationsSelect")?.value;
  const serial_num = el("folderSerial")?.value;
  const used_for = el("folderUsedFor")?.value?.trim() || "";

  if (!folder_name || !department_id || !location_id) {
    return showToast("Please fill all required fields!", "error");
  }

  const deptText = el("folderDepartmentSelect").options[el("folderDepartmentSelect").selectedIndex]?.textContent || "";
  const locText = el("folderLocationsSelect").options[el("folderLocationsSelect").selectedIndex]?.textContent || "";

  try {
    const res = await fetch("/api/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_name, department_id, location_id, serial_num, used_for })
    });
    if (!res.ok) throw new Error("API failed");
    showToast("Folder successfully added!");
    e.target.reset();
    cancelRegistration();
    await loadFolders();
  } catch (err) {
    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    folders.push({
      folder_id: Date.now(),
      folder_name,
      department: deptText,
      location: locText,
      serial_num,
      used_for,
      files_inside: [],
      created_at: new Date().toISOString(),
      created_by: "Admin User",
      is_active: true
    });
    localStorage.setItem("folders", JSON.stringify(folders));
    showToast("Folder added (local)!");
    e.target.reset();
    cancelRegistration();
    await loadFolders();
  }
}

// ---------------------------
// Create File
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
// Create Existing File
// ---------------------------
async function createExisting(e) {
  e.preventDefault();

  const file_id = el("existingFileSelect")?.value;
  const folder_id = el("existingFileFolderSelect")?.value;
  const description = el("existingFileDescription")?.value?.trim() || "";

  if (!file_id || !folder_id) {
    return showToast("Please select a folder and file!", "error");
  }

  try {
    const res = await fetch("/api/files/existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id, folder_id })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "API failed");
    }

    showToast("Existing file successfully added!");
    el("existingForm")?.reset();
    cancelRegistration();
    await loadFolders();

  } catch (err) {
    console.error("Error adding existing file:", err);

    const files = JSON.parse(localStorage.getItem("files") || "[]");
    files.push({ 
      file_id: Date.now(), 
      file_name: el("existingFileSelect")?.selectedOptions[0]?.text || "Unknown",
      folder_id, 
      description, 
      created_at: new Date().toISOString() 
    });
    localStorage.setItem("files", JSON.stringify(files));

    const folders = JSON.parse(localStorage.getItem("folders") || "[]");
    const folder = folders.find(f => String(f.folder_id) === String(folder_id));
    if (folder) {
      folder.files_inside = folder.files_inside || [];
      folder.files_inside.push(el("existingFileSelect")?.selectedOptions[0]?.text || "Unknown");
      localStorage.setItem("folders", JSON.stringify(folders));
    }

    showToast("Existing file added (local)!");
    el("existingForm")?.reset();
    cancelRegistration();
    await loadFolders();
  }
}

// ---------------------------
// Load folders and files for existing registration
// ---------------------------
async function loadFoldersForExistingFile() {
  const folderSelect = el("existingFileFolderSelect");
  const fileSelect = el("existingFileSelect");
  if (!folderSelect || !fileSelect) return;

  folderSelect.innerHTML = "<option value=''>Loading folders...</option>";
  fileSelect.innerHTML = "<option value=''>Select File</option>";

  try {
    const res = await fetch("/api/folder");
    const folders = res.ok ? await res.json() : JSON.parse(localStorage.getItem("folders") || "[]");

    const activeFolders = folders.filter(f => f.is_active !== false);

    folderSelect.innerHTML = "<option value=''>Select Folder</option>";
    activeFolders.forEach(f => {
      const o = document.createElement("option");
      o.value = f.folder_id;
      o.textContent = `${f.serial_num || "-"} - ${f.folder_name || "-"}`;
      o.dataset.files = JSON.stringify(f.files_inside || []);
      o.dataset.department = f.department || "";
      o.dataset.location = f.location_name || f.location || "";
      folderSelect.appendChild(o);
    });

    fileSelect.innerHTML = "<option value=''>Select File</option>";

  } catch (err) {
    console.error("Failed to load folders for existing file:", err);
    folderSelect.innerHTML = "<option value=''>Failed to load folders</option>";
    fileSelect.innerHTML = "<option value=''>Select File</option>";
  }
}

// ---------------------------
// Autofill existing form folder data
// ---------------------------
function bindExistingFolderAutoFill() {
  const folderSelect = el("existingFileFolderSelect");
  const fileSelect = el("existingFileSelect");
  const deptInput = el("existingFileDepartment");
  const locInput = el("existingFileLocation");

  if (!folderSelect || !fileSelect || !deptInput || !locInput) return;

  folderSelect.addEventListener("change", function() {
    const opt = folderSelect.options[folderSelect.selectedIndex];
    deptInput.value = opt?.dataset.department || "";
    locInput.value = opt?.dataset.location || "";

    fileSelect.innerHTML = "<option value=''>Select File</option>";
    if (!opt?.dataset.files) return;
    const files = JSON.parse(opt.dataset.files);
    files.forEach(f => {
      const o = document.createElement("option");
      o.value = f;
      o.textContent = f;
      fileSelect.appendChild(o);
    });
  });
}

// ---------------------------
// Load folders for file registration
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
// Autofill file form
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
// Print Table
// ---------------------------
function printTable() { 
  window.print(); 
}

// ---------------------------
// Download QR Code
// ---------------------------
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

// ---------------------------
// Download Barcode
// ---------------------------
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

// ---------------------------
// Print Folder Details
// ---------------------------
function printFolderDetails() { 
  window.print(); 
}

console.log("✅ admin.js loaded successfully!");