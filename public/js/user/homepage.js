// ============================
// 🔹 Helper Shortcut
// ============================
const el = id => document.getElementById(id);
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

  }, 100); // ensure DOM fully rendered before attaching
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
window.openViewModal = openViewModal;
window.closeViewModal = closeViewModal;

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