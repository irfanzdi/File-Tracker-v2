let departments = [];
let editId = null;

async function loadDept() {
  const res = await fetch("/api/departments");
  departments = await res.json();
  renderTable(departments);
}

async function addDept() {
  const name = document.getElementById("department").value.trim();
  if (!name) return alert("Please enter a department name");

  const res = await fetch("/api/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  if (res.ok) {
    alert("✅ Department added successfully");
    document.getElementById("department").value = "";
    await loadDept();
  } else {
    alert("❌ Failed to add department");
  }
}

function renderTable(departments) {
  const tbody = document.querySelector("#fileTable tbody");
  const noFiles = document.querySelector("#noFiles");
  tbody.innerHTML = "";

  if (!departments.length) {
    noFiles.classList.remove("hidden");
    return;
  }
  noFiles.classList.add("hidden");

  departments.forEach(d => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-4 py-2 text-center">${d.department_id}</td>
      <td class="border px-4 py-2">${d.department}</td>
      <td class="flex gap-2 justify-center py-2">
        <button 
          onclick='openEditModal(${JSON.stringify(d)})' 
          class="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Edit
        </button>
        <button onclick='deleteDept(${d.department_id})' 
          class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Delete
        </button>
      </td>`;
    tbody.appendChild(row);
  });
}

function openEditModal(department) {
  editId = department.department_id;
  document.getElementById("editDept").value = department.department;
  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function editDept() {
  const name = document.getElementById("editDept").value.trim();
  if (!name) return alert("Please enter a department name");

  const res = await fetch(`/api/departments/${editId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  if (res.ok) {
    alert("✅ Department updated successfully");
    closeEditModal();
    await loadDept();
  } else {
    alert("❌ Failed to update department");
  }
}

async function deleteDept(id) {
  if (!confirm("Are you sure you want to delete this department?")) return;

  const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });

  if (res.ok) {
    alert("🗑️ Department deleted");
    await loadDept();
  } else {
    alert("❌ Failed to delete department");
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

document.addEventListener("DOMContentLoaded", loadDept);
document.getElementById("logoutBtn").addEventListener("click", logout);
