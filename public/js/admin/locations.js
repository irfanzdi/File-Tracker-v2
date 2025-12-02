const el = id => document.getElementById(id);

let locationData = [];
let editId = null;
let locationToDelete = null;

// Toast
function showToast(message, type="success") {
  const container = el("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast flex items-center gap-2 bg-white border rounded-lg shadow px-4 py-3 ${type==="success"?"border-green-500":"border-red-500"}`;
  toast.innerHTML = `<span>${type==="success"?"✅":"❌"}</span><p>${message}</p>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Logout
el("logoutBtn")?.addEventListener("click", async () => {
  if(!confirm("Are you sure you want to logout?")) return;
  try { await fetch("/api/auth/logout",{method:"POST"}); } catch(e){}
  localStorage.clear();
  window.location.href="/login.html";
});

// ------------------ Load Locations ------------------
async function loadLocations() {
  try {
    const res = await fetch("/api/locations/locations-with-folders");
    locationData = res.ok ? await res.json() : [];
  } catch(e) {
    locationData = [];
  }
  renderLocationsTable();
}

// ------------------ Render Table ------------------
function renderLocationsTable() {
  const tbody = el("locationsTable").querySelector("tbody");
  tbody.innerHTML = "";
  if(locationData.length === 0) {
    el("noLocations").classList.remove("hidden");
    return;
  }
  el("noLocations").classList.add("hidden");

  // Inside renderLocationsTable()
      locationData.forEach((loc, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-3 py-2">${i + 1}</td>
          <td class="px-3 py-2">${loc.location_name}</td>
          <td class="px-3 py-2"></td>
        `;

        const tdActions = tr.querySelector("td:last-child");

        // View button
        const viewBtn = document.createElement("button");
        viewBtn.textContent = "View";
        viewBtn.className = "action-btn action-btn-view mr-2";
        viewBtn.addEventListener("click", () => openDetailsModal(loc));

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "action-btn action-btn-edit mr-2";
        editBtn.addEventListener("click", () => openEditModal(loc));

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "action-btn action-btn-delete";
        delBtn.addEventListener("click", () => openDeleteModal(loc));

        tdActions.appendChild(viewBtn);
        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);

        tbody.appendChild(tr);
      });

}

// ------------------ Add Location ------------------
el("addLocationForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = el("loct_name").value.trim();
  if(!name) return showToast("Location name required","error");

  try {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_name: name })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Failed to add location");

    locationData.push({...data, folders: []});
    renderLocationsTable();
    el("loct_name").value = "";
    showToast("Location added successfully");
  } catch(err) {
    showToast(err.message,"error");
  }
});

// ------------------ Edit Location ------------------
function openEditModal(loc) {
  editId = loc.location_id;
  el("editLoct").value = loc.location_name;
  el("editModal").classList.add("active");
}
function closeEditModal() {
  el("editModal").classList.remove("active");
  editId = null;
}
el("editLocationForm").addEventListener("submit", async e => {
  e.preventDefault();
  const newName = el("editLoct").value.trim();
  if(!newName) return showToast("Location name required","error");

  try {
    const res = await fetch(`/api/locations/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_name: newName })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Failed to update location");

    const loc = locationData.find(l => l.location_id === editId);
    if(loc) loc.location_name = newName;
    renderLocationsTable();
    showToast("Location updated");
    closeEditModal();
  } catch(err) {
    showToast(err.message,"error");
  }
});

// ------------------ Delete Location ------------------
function openDeleteModal(loc) {
  locationToDelete = loc;
  el("deleteFolderName").textContent = loc.location_name;
  el("deleteModal").classList.add("active");
}
function closeDeleteModal() {
  el("deleteModal").classList.remove("active");
  locationToDelete = null;
}
el("confirmDeleteBtn").addEventListener("click", async () => {
  if(!locationToDelete) return;

  try {
    const res = await fetch(`/api/locations/${locationToDelete.location_id}`, { method: "DELETE" });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Failed to delete location");

    locationData = locationData.filter(l => l.location_id !== locationToDelete.location_id);
    renderLocationsTable();
    showToast("Location deleted","success");
    closeDeleteModal();
  } catch(err) {
    showToast(err.message,"error");
  }
});

// ------------------ View Details ------------------
function openDetailsModal(location) {
  const modal = el("detailsModal");
  const container = el("detailsContainer");
  container.innerHTML = "";

  if (!location.folders.length) {
    container.innerHTML = "<p>No folders in this location.</p>";
  } else {
    location.folders.forEach(f => {
      const div = document.createElement("div");
      div.className = "folder-card";
      div.innerHTML = `
        <h3>${f.folder_name} (<strong>${f.serial_num}</strong>)</h3>
        <p>Department: ${f.department}</p>
        <p>Created by: ${f.created_by}</p>
        <p>Created at: ${new Date(f.created_at).toLocaleString()}</p>
        <p>Files: ${f.files_inside.length ? f.files_inside.join(", ") : "No files"}</p>
      `;
      container.appendChild(div);
    });
  }
  modal.classList.add("active");
}
function closeDetailsModal() {
  el("detailsModal").classList.remove("active");
}

// ------------------ Initialize ------------------
document.addEventListener("DOMContentLoaded", () => {
  loadLocations();

  // Close modal on background click
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
      if(e.target === modal) modal.classList.remove("active");
    });
  });

  // Make modal functions global if using inline HTML
  window.closeEditModal = closeEditModal;
  window.closeDeleteModal = closeDeleteModal;
  window.closeDetailsModal = closeDetailsModal;
});
