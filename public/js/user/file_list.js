let fileData = [];

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
      </td>
    `;
    tbody.appendChild(row);
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
document.getElementById("logoutBtn").addEventListener("click", logout);
