document.addEventListener("DOMContentLoaded", () => {
  loadFiles();
  loadFolders();
  loadRecent();

  document.getElementById("fileSelect").addEventListener("change", updateFileCount);
  document.getElementById("fileSearch").addEventListener("input", filterFiles);

  document.getElementById("selectAllBtn").addEventListener("click", selectAll);
  document.getElementById("clearBtn").addEventListener("click", clearSelection);

  document.getElementById("requestForm").addEventListener("submit", submitRequest);
});

// -----------------------------------
// LOAD FILES by Department
// -----------------------------------

async function loadFiles() {
  try {
    const res = await fetch("/api/file_movement/files/my-department", {
      credentials: "include"   // sends session cookie
    });

    // 1. If server returns 400 (or any non-200)
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message = errBody.error || errBody.message || `HTTP ${res.status}`;
      throw new Error(message);
    }

    // 2. Parse response (should be array)
    const data = await res.json();

    // 3. Safety check
    if (!Array.isArray(data)) {
      throw new Error("Invalid response from server");
    }

    // 4. Populate dropdown
    fileSelect.innerHTML = "<option value=''>-- Select File --</option>";
    data.forEach(f => {
      const opt = new Option(
        `${f.file_name} (Folder: ${f.folder_name})`,
        f.file_id
      );
      fileSelect.add(opt);
    });

  } catch (err) {
    // 5. Show user-friendly message in dropdown
    console.warn("loadFiles failed:", err.message);

    fileSelect.innerHTML = `
      <option style="color: red;" disabled>
        ${err.message}
      </option>
    `;
  }
}


// -----------------------------------
// LOAD FOLDERS
// -----------------------------------
async function loadFolders() {
  const folderSelect = document.getElementById("folderSelect");

  try {
    const res = await fetch("/api/folder");
    const data = await res.json();

    data.forEach(f => {
      const option = document.createElement("option");
      option.value = f.folder_id;
      option.textContent = f.folder_name;
      folderSelect.appendChild(option);
    });

  } catch (err) {
    console.error("Error loading folders:", err);
  }
}

// -----------------------------------
// SUBMIT REQUEST
// -----------------------------------
async function submitRequest(e) {
  e.preventDefault();

  const moveType = document.getElementById("moveType").value;
  const folderId = document.getElementById("folderSelect").value || null;
  const remark = document.getElementById("remark").value;

  const selectedFiles = Array.from(
    document.getElementById("fileSelect").selectedOptions
  ).map(opt => Number(opt.value));

  if (selectedFiles.length === 0) {
    return showToast("Please select at least one file.", "error");
  }

  const body = {
    move_type: moveType,
    remark: remark,
    folder_id: folderId,
    files: selectedFiles
  };

  try {
    const res = await fetch("/api/file_movement/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.success) {
      showToast("Request submitted successfully!", "success");
      document.getElementById("requestForm").reset();
      updateFileCount();
      loadRecent();
    } else {
      showToast(data.error || "Failed to submit request", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Server error", "error");
  }
}

// -----------------------------------
// FILE SEARCH
// -----------------------------------
function filterFiles() {
  const searchText = document.getElementById("fileSearch").value.toLowerCase();
  const options = document.querySelectorAll("#fileSelect option");

  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(searchText) ? "" : "none";
  });
}

// -----------------------------------
// SELECT ALL & CLEAR
// -----------------------------------
function selectAll() {
  const options = document.querySelectorAll("#fileSelect option");
  options.forEach(opt => (opt.selected = true));
  updateFileCount();
}

function clearSelection() {
  const options = document.querySelectorAll("#fileSelect option");
  options.forEach(opt => (opt.selected = false));
  updateFileCount();
}

// -----------------------------------
// UPDATE SELECTED FILE COUNT
// -----------------------------------
function updateFileCount() {
  const count = document.querySelectorAll("#fileSelect option:checked").length;
  document.getElementById("fileCount").textContent = `(${count} selected)`;
}

// -----------------------------------
// LOAD USER RECENT REQUESTS
// -----------------------------------
async function loadRecent() {
  const tableBody = document.querySelector("#recentTable tbody");

  try {
    const res = await fetch("/api/file_movement/");
    const data = await res.json();

    const userRequests = data.filter(r => r.status_id !== null);

    if (userRequests.length === 0) {
      tableBody.innerHTML = "";
      document.getElementById("noRecent").classList.remove("hidden");
      return;
    }

    document.getElementById("noRecent").classList.add("hidden");
    tableBody.innerHTML = "";

    userRequests.forEach(req => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td class="px-3 py-2">${req.move_id}</td>
        <td class="px-3 py-2">${req.move_type}</td>
        <td class="px-3 py-2">${req.move_date}</td>
        <td class="px-3 py-2">${req.files.length} file(s)</td>
        <td class="px-3 py-2">${
          req.status_name || "Pending"
        }</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

// -----------------------------------
// TOAST
// -----------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className =
    "px-4 py-2 rounded shadow text-white " +
    (type === "success" ? "bg-green-600" : "bg-red-600");

  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
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

