let locations = [];
let editId = null;

// ✅ Load all locations
async function loadLoct() {
  const res = await fetch("/api/locations");
  locations = await res.json();
  renderTable(locations);
}

// ✅ Add new location
async function addLoct() {
  const location_name = document.getElementById("loct_name").value.trim();
  if (!location_name) return alert("Please enter a location name");

  const res = await fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location_name })
  });

  if (res.ok) {
    alert("✅ Location added successfully");
    document.getElementById("loct_name").value = "";
    await loadLoct();
  } else {
    alert("❌ Failed to add location");
  }
}

// ✅ Render table
function renderTable(locations) {
  const tbody = document.querySelector("#fileTable tbody");
  const noFiles = document.querySelector("#noFiles");
  tbody.innerHTML = "";

  if (!locations.length) {
    noFiles.classList.remove("hidden");
    return;
  }

  noFiles.classList.add("hidden");

  locations.forEach((loc) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-4 py-2 text-center">${loc.location_id}</td>
      <td class="border px-4 py-2">${loc.location_name}</td>
      <td class="flex gap-2 justify-center py-2">
        <button 
          onclick='openEditModal(${JSON.stringify(loc)})' 
          class="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Edit
        </button>
        <button 
          onclick='deleteLoct(${loc.location_id})' 
          class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Delete
        </button>
      </td>`;
    tbody.appendChild(row);
  });
}

// ✅ Open Edit Modal
function openEditModal(location) {
  editId = location.location_id;
  document.getElementById("editLoct").value = location.location_name;
  document.getElementById("editModal").classList.remove("hidden");
}

// ✅ Close Edit Modal
function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

// ✅ Update location
async function editLoct() {
  const location_name = document.getElementById("editLoct").value.trim();
  if (!location_name) return alert("Please enter a location name");

  const res = await fetch(`/api/locations/${editId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location_name })
  });

  if (res.ok) {
    alert("✅ Location updated successfully");
    closeEditModal();
    await loadLoct();
  } else {
    alert("❌ Failed to update location");
  }
}

// ✅ Delete location
async function deleteLoct(id) {
  if (!confirm("Are you sure you want to delete this location?")) return;

  const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
  if (res.ok) {
    alert("🗑️ Location deleted");
    await loadLoct();
  } else {
    alert("❌ Failed to delete location");
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


// ✅ Logout
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

document.addEventListener("DOMContentLoaded", loadLoct);
