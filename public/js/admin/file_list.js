let fileData = [];
let editId = null;

// ================================
// LOAD ALL FILES
// ================================
async function loadFiles() {
  try {
    const res = await fetch("/api/files", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load files");

    fileData = await res.json();
    renderTable(fileData);
  } catch (err) {
    console.error("❌ Error loading files:", err);
    document.getElementById("noFiles").classList.remove("hidden");
  }
}

// ================================
// ADD NEW FILE
// ================================
async function addFile() {
  const file_name = document.getElementById("file_name").value.trim();
  if (!file_name) return alert("⚠️ Please enter a file name");

  try {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name }),
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ File "${file_name}" created successfully`);
      document.getElementById("file_name").value = "";
      await loadFiles();
    } else {
      alert(data.error || "❌ Failed to add file");
    }
  } catch (err) {
    console.error("Error adding file:", err);
    alert("Server error while adding file");
  }
}

// ================================
// RENDER TABLE
// ================================
function renderTable(files) {
  const tbody = document.querySelector("#fileTable tbody");
  const noFiles = document.getElementById("noFiles");
  tbody.innerHTML = "";

  if (!files.length) {
    noFiles.classList.remove("hidden");
    return;
  }

  noFiles.classList.add("hidden");

  files.forEach((f) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      
      <td class="border px-4 py-2">${f.file_name}</td>
      <td class="border px-4 py-2">${f.folder_name || "-"}</td>
      <td class="border px-4 py-2 text-center">${new Date(f.uploaded_at).toLocaleString()}</td>
      <td class="border px-4 py-2 text-center">${f.created_by || "-"}</td>
      <td class="flex justify-center gap-2 py-2">
      <button 
          onclick='openEditModal(${f.file_id})' 
          class="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Edit
        </button>
        <button onclick='deleteFile(${f.file_id})' 
          class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ================================
// EDIT FILE
// ================================
let editingFileId = null;

// ✅ Open Edit Modal
function openEditModal(fileId) {
  const file = fileData.find(x => x.file_id === fileId);
  if (!file) return alert("File not found");

  editingFileId = file.file_id;
  document.getElementById("editFile").value = file.file_name || "";

  const modal = document.getElementById("editModal");
  modal.classList.add("show");   // ✅ Correct way to open modal
}

// ✅ Save Edited File
async function editFile() {
  const newName = document.getElementById("editFile").value.trim();
  if (!newName) return alert("Please enter a file name");

  try {
    const res = await fetch(`/api/files/${editingFileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: newName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);

    alert("✅ File updated successfully!");
    closeEditModal();
    loadFiles(); // Refresh table
  } catch (err) {
    console.error("Edit error:", err);
    alert("❌ Failed to update file");
  }
}

// ✅ Close Modal
function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("show");   // ❗ hide properly
  editingFileId = null;
}


// ================================
// DELETE FILE
// ================================
async function deleteFile(id) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  try {
    const res = await fetch(`/api/files/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      alert("🗑️ File deleted successfully");
      await loadFiles();
    } else {
      alert(data.error || "❌ Failed to delete file");
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    alert("Server error while deleting file");
  }
}

function filterTable() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#fileTable tbody tr");

  rows.forEach(row => {
    const rowText = row.textContent.toLowerCase();
    row.style.display = rowText.includes(input) ? "" : "none";
  });
}

// ================================
// LOGOUT
// ================================
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

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", loadFiles);