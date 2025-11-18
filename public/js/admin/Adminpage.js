// ============================
// 🔹 Helper Shortcut
// ============================
const el = id => document.getElementById(id);
let editingFolderId = null;
let allFiles = [];

// ============================
// 🔹 Toast Notifications
// ============================
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className =
    "toast flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2 animate-slideIn";
  toast.innerHTML = `
    <span class="text-lg">${type === "success" ? "✅" : "❌"}</span>
    <p class="text-gray-700 font-medium">${message}</p>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============================
// 🔹 Load Departments
// ============================
async function loadDepartments() {
  try {
    const res = await fetch("/api/departments");
    const data = await res.json();
    const select = el("departmentSelect");
    select.innerHTML = "<option value=''>-- Select Department --</option>";
    data.forEach(dept => {
      const option = document.createElement("option");
      option.value = dept.department_id;
      option.textContent = dept.department;
      select.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}

// ============================
// 🔹 Load Locations
// ============================
async function loadLocations() {
  try {
    const res = await fetch("/api/locations");
    const data = await res.json();
    const select = el("locationsSelect");
    select.innerHTML = "<option value=''>-- Select Location --</option>";
    data.forEach(loc => {
      const option = document.createElement("option");
      option.value = loc.location_id;
      option.textContent = loc.location_name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}

// ============================
// 🔹 Load Files (for select)
// ============================
async function loadFiles() {
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    const select = el("fileSelect");
    select.innerHTML = "";

    if (!data.length) {
      select.innerHTML = "<option disabled>No files available</option>";
      return;
    }

    const foldersRes = await fetch("/api/folder");
    const folders = await foldersRes.json();
    const assignedSet = new Set();
    folders.forEach(fold => {
      (fold.file_ids || []).forEach(fid => assignedSet.add(Number(fid)));
    });

    data.forEach(file => {
      const opt = document.createElement("option");
      opt.value = file.file_id;
      opt.textContent = file.file_name || file.title || `File ${file.file_id}`;

      if (assignedSet.has(Number(file.file_id))) {
        opt.disabled = true;
        opt.textContent += " (Already in folder)";
        opt.classList.add("text-gray-400");
      }

      select.appendChild(opt);
    });

    // 🔹 Trigger change event to refresh selected count
    select.dispatchEvent(new Event("change"));

  } catch (err) {
    console.error("❌ Error loading files:", err);
  }
}


// ============================
// 🔹 Create Folder
// ============================
async function createFolder(e) {
  e.preventDefault();
  const folder_name = el("title").value.trim();
  const department_id = el("departmentSelect").value;
  const location_id = el("locationsSelect").value;
  const file_ids = Array.from(el("fileSelect").selectedOptions).map(opt => opt.value);

  if (!folder_name || !department_id)
    return showToast("Folder name and department are required!", "error");

  try {
    const res = await fetch("/api/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_name, department_id, location_id, file_ids }),
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast("Folder created successfully!");
    e.target.reset();
    loadFolder();
    loadFiles();
    loadLatestFolder();
  } catch (err) {
    console.error(err);
    showToast("Error creating folder", "error");
  }
}

// ============================
// 🔹 Load Folder List
// ============================
async function loadFolder() {
  try {
    const res = await fetch("/api/folder");
    const folders = await res.json();
    renderTable(folders);
  } catch (err) {
    console.error("Load folder error:", err);
  }
}


// ============================
// 🔹 Load Latest Folder (for display at top)
// ============================
async function loadLatestFolder() {
  try {
    const res = await fetch("/api/folder/latest");
    const folder = await res.json();

    const latestDiv = document.getElementById("latestRecord");
    if (!res.ok || !folder || Object.keys(folder).length === 0) {
      latestDiv.innerHTML = `<p class="text-gray-500 italic">No record found.</p>`;
      return;
    }

    // ✅ Build QR Section
    const qrImg = folder.qr_code
      ? `<img src="${folder.qr_code}" alt="QR Code" class="w-32 border rounded-lg shadow-sm p-2" />`
      : `<p class="text-gray-500">No QR Code</p>`;

    // ✅ Files list
    const filesList =
      folder.files_inside && folder.files_inside.length > 0
        ? `<ul class="list-disc ml-6 text-sm mt-1">${folder.files_inside
            .map((f) => `<li>${f}</li>`)
            .join("")}</ul>`
        : `<p class="text-gray-500 text-sm">No files inside</p>`;

    // ✅ Display folder details
    latestDiv.innerHTML = `
      <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
        ${qrImg}
        <div>
          <p><strong>Serial Number:</strong> ${folder.serial_number || "-"}</p>
          <p><strong>Folder Title:</strong> ${folder.folder_title || "-"}</p>
          <p><strong>Department:</strong> ${folder.department || "-"}</p>
          <p><strong>Location:</strong> ${folder.location || "-"}</p>
          <p><strong>Created At:</strong> ${
            folder.created_at
              ? new Date(folder.created_at).toLocaleString()
              : "-"
          }</p>
          <p><strong>Created By:</strong> ${folder.created_by || "-"}</p>
          <div class="mt-2">
            <p class="font-semibold">Files Inside:</p>
            ${filesList}
          </div>
        </div>
      </div>
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



async function openViewModal(id) {
  try {
    const res = await fetch(`/api/folder/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load folder");

    // 🧩 Fill data
    el("viewFolderName").textContent = data.folder_title || data.folder_name || "-";
    el("viewDepartment").textContent = data.department || "-";
    el("viewLocation").textContent = data.location || data.location_name || "-";
    el("viewCreatedBy").textContent = data.created_by || "-";
    el("viewCreatedAt").textContent = data.created_at
      ? new Date(data.created_at).toLocaleString()
      : "-";
    el("viewSerial").textContent = data.serial_number || data.serial_num || "-";

    // 🧩 Show QR
    const qrImg = el("viewQr");
    qrImg.src =
      data.qr_code ||
      "https://api.qrserver.com/v1/create-qr-code/?data=No+QR+Available&size=150x150";

    // 🧩 Files list
    const list = el("viewFiles");
    list.innerHTML = "";
    (data.files_inside && data.files_inside.length
      ? data.files_inside
      : ["No files inside"]
    ).forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });

    // 🧩 Make modal visible
    const modal = el("viewModal");
    const content = el("viewModalContent");
    modal.classList.remove("hidden");
    modal.classList.add("flex", "show");

    // 🧩 Animate in the modal content
    setTimeout(() => {
      content.classList.remove("opacity-0", "translate-y-10");
      content.classList.add("opacity-100", "translate-y-0");
    }, 50);
  } catch (err) {
    console.error("❌ Error opening view modal:", err);
    showToast("Failed to load folder details", "error");
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
      </div>
      <hr>
      <p><b>Department:</b> ${dept}</p>
      <p><b>Location:</b> ${loc}</p>
      <p><b>Created By:</b> ${by}</p>
      <p><b>Created At:</b> ${at}</p>
      <h3>Files Inside:</h3><p>${files || "No files"}</p>
    </div>`;
  const w = window.open();
  w.document.write(printContent);
  w.document.close();
  w.print();
}

// ============================
// 🔹 Init
// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadDepartments();
  loadLocations();
  loadFiles();         // only populates `fileSelect` for add
  loadFolder();
  el("fileForm").addEventListener("submit", createFolder);
});

function printLatestRecord() {
  const printContents = document.getElementById("printSection").innerHTML;
  const original = document.body.innerHTML;
  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = original;
  window.location.reload();
}

async function openEditModal(folder) {
  editingFolderId = folder.folder_id;
  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  modal.classList.add("show");

  const folderNameInput = document.getElementById("editFolderName");
  const deptSelect = document.getElementById("editDepartmentSelect");
  const locSelect = document.getElementById("editLocationSelect");
  const fileSelect = document.getElementById("editFileSelect");
  const saveBtn = modal.querySelector("button.bg-blue-700"); // save changes button

  // Prefill
  folderNameInput.value = folder.folder_name || "";
  await loadDropdownsForEdit(folder);

  // ✅ Disable Save button initially
  saveBtn.disabled = true;
  saveBtn.classList.add("opacity-50", "cursor-not-allowed");

  // ✅ Store original values
  const original = {
    name: folder.folder_name || "",
    dept: folder.department_id || "",
    loc: folder.location_id || "",
    files: Array.from(folder.file_ids || []).map(String), // string IDs
  };

  // ✅ Function to check if changes occurred
  const checkChanges = () => {
    const currentFiles = Array.from(fileSelect.selectedOptions).map(opt => opt.value);
    const changed =
      folderNameInput.value !== original.name ||
      deptSelect.value !== original.dept ||
      locSelect.value !== original.loc ||
      currentFiles.sort().join(",") !== original.files.sort().join(",");

    saveBtn.disabled = !changed;
    saveBtn.classList.toggle("opacity-50", !changed);
    saveBtn.classList.toggle("cursor-not-allowed", !changed);
  };

  // ✅ Add listeners
  [folderNameInput, deptSelect, locSelect, fileSelect].forEach(el => {
    el.addEventListener("input", checkChanges);
    el.addEventListener("change", checkChanges);
  });
}



function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("show"); // ✅ fade out
  editingFolderId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("File Movement Approval Page Loaded");

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Logout?")) {
        fetch("/api/auth/logout").then(() => location.href = "/login.html");
      }
    });
  }
});

// ============================
// 🔹 Multi-Select File Enhancements
// ============================

document.addEventListener("DOMContentLoaded", () => {
  const fileSelect = document.getElementById("fileSelect");
  const fileCount = document.getElementById("fileCount");
  const fileSearch = document.getElementById("fileSearch");
  const selectAllBtn = document.getElementById("selectAllFiles");
  const clearBtn = document.getElementById("clearFiles");

  // ✅ Update selected count
  if (fileSelect && fileCount) {
    fileSelect.addEventListener("change", () => {
      const count = fileSelect.selectedOptions.length;
      fileCount.textContent = `(${count} selected)`;
    });
  }

  // ✅ Search filter for files
  if (fileSearch && fileSelect) {
    fileSearch.addEventListener("input", e => {
      const term = e.target.value.toLowerCase();
      [...fileSelect.options].forEach(opt => {
        opt.style.display = opt.textContent.toLowerCase().includes(term) ? "" : "none";
      });
    });
  }

  function filterTable() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#fileTable tbody tr");

  rows.forEach(row => {
    const rowText = row.textContent.toLowerCase();
    row.style.display = rowText.includes(input) ? "" : "none";
  });
}


  // ✅ Select all / Clear all buttons
  if (selectAllBtn && clearBtn && fileSelect) {
  selectAllBtn.addEventListener("click", () => {
    [...fileSelect.options].forEach(opt => {
      if (!opt.disabled) opt.selected = true; // ✅ skip disabled options
    });
    fileSelect.dispatchEvent(new Event("change")); // update count
  });

  clearBtn.addEventListener("click", () => {
    [...fileSelect.options].forEach(opt => opt.selected = false);
    fileSelect.dispatchEvent(new Event("change"));
  });
  }
});

window.filterTable = function () {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#fileTable tbody tr");

  rows.forEach(row => {
    const rowText = row.textContent.toLowerCase();
    row.style.display = rowText.includes(input) ? "" : "none";
  });
};

// Expose functions to global scope
window.openEditModal = openEditModal;
window.openViewModal = openViewModal;
window.deleteFolder = deleteFolder;
window.saveFolderChanges = saveFolderChanges;
window.closeEditModal = closeEditModal;
window.closeViewModal = closeViewModal;

console.log("✅ Adminpage.js functions registered globally");
