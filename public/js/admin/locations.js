// ============================
// 🔹 Helper Shortcut
// ============================
const el = id => document.getElementById(id);

// ============================
// 🔹 Global Variables
// ============================
let locationData = [];
let folderData = [];
let currentRack = null;
let currentLocationId = null;
let editId = null;

// ============================
// 🔹 Toast Notifications
// ============================
function showToast(message, type = "success") {
  const container = el("toastContainer");
  if (!container) {
    const toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "fixed top-4 right-4 z-50 space-y-2";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast flex items-center gap-2 bg-white border rounded-lg shadow-lg px-4 py-3 transition-all ${
    type === "success" ? "border-green-500" : "border-red-500"
  }`;
  toast.innerHTML = `
    <span class="text-lg">${type === "success" ? "✅" : "❌"}</span>
    <p class="text-gray-700 font-medium">${message}</p>
  `;
  
  const finalContainer = el("toastContainer");
  finalContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================
// 🔹 Initialize on Page Load
// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadLocations();
  loadFolders();
  setupEventListeners();
});

// ============================
// 🔹 Setup Event Listeners
// ============================
function setupEventListeners() {
  // Add location form
  el("addLocationForm")?.addEventListener("submit", addLocation);
  
  // Edit location form
  el("editLocationForm")?.addEventListener("submit", saveLocationChanges);
  
  // Search functionality
  el("searchBtn")?.addEventListener("click", searchFolders);
  el("searchInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchFolders();
  });
  
  // Clear search
  el("clearSearchBtn")?.addEventListener("click", clearSearch);
  
  // Logout
  el("logoutBtn")?.addEventListener("click", handleLogout);
  
  // Close modals on outside click
  el("editModal")?.addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEditModal();
  });
  
  el("viewModal")?.addEventListener("click", (e) => {
    if (e.target.id === "viewModal") closeViewModal();
  });
}

// ============================
// 🔹 Load All Locations
// ============================
async function loadLocations() {
  try {
    const res = await fetch("/api/locations");
    if (!res.ok) throw new Error("Failed to load locations");
    
    locationData = await res.json();
    renderLocationsTable(locationData);
    populateLocationSelect();
  } catch (err) {
    console.error("Error loading locations:", err);
    
    // Fallback to localStorage
    const stored = localStorage.getItem("locations");
    if (stored) {
      locationData = JSON.parse(stored);
      renderLocationsTable(locationData);
      populateLocationSelect();
    } else {
      showToast("Failed to load locations", "error");
    }
  }
}

// ============================
// 🔹 Load All Folders
// ============================
async function loadFolders() {
  try {
    const res = await fetch("/api/folder");
    if (!res.ok) throw new Error("Failed to load folders");
    
    folderData = await res.json();
  } catch (err) {
    console.error("Error loading folders:", err);
    
    // Fallback to localStorage
    const stored = localStorage.getItem("folders");
    if (stored) {
      folderData = JSON.parse(stored);
    }
  }
}

// ============================
// 🔹 Populate Location Select
// ============================
function populateLocationSelect() {
  const select = el("selectLocation");
  if (!select) return;
  
  select.innerHTML = '<option value="">Choose a location...</option>';
  
  locationData.forEach(loc => {
    const option = document.createElement("option");
    option.value = loc.location_id;
    option.textContent = loc.location_name;
    select.appendChild(option);
  });
}

// ============================
// 🔹 Location Changed - Load Racks
// ============================
function onLocationChange() {
  const locationId = el("selectLocation")?.value;
  
  if (!locationId) {
    el("rackSection").classList.add("hidden");
    return;
  }
  
  currentLocationId = locationId;
  loadRacksForLocation(locationId);
}

function loadRacksForLocation(locationId) {
  // Get unique racks from folders in this location
  const foldersInLocation = folderData.filter(f => f.location_id == locationId && f.rack_name);
  
  const uniqueRacks = [...new Set(foldersInLocation.map(f => f.rack_name))].filter(Boolean);
  
  const select = el("selectRack");
  select.innerHTML = '<option value="">Choose a rack...</option>';
  
  if (uniqueRacks.length === 0) {
    select.innerHTML = '<option value="">No racks found in this location</option>';
    el("rackSection").classList.remove("hidden");
    el("rackView").classList.add("hidden");
    return;
  }
  
  uniqueRacks.forEach(rack => {
    const option = document.createElement("option");
    option.value = rack;
    option.textContent = rack;
    select.appendChild(option);
  });
  
  el("rackSection").classList.remove("hidden");
  el("rackView").classList.add("hidden");
}

// ============================
// 🔹 Load Rack Visualization
// ============================
function loadRackView() {
  const rackName = el("selectRack")?.value;
  
  if (!rackName) {
    el("rackView").classList.add("hidden");
    return;
  }
  
  currentRack = rackName;
  
  // Get folders in this rack
  const foldersInRack = folderData.filter(f => 
    f.location_id == currentLocationId && 
    f.rack_name === rackName &&
    f.rack_column && 
    f.rack_row
  );
  
  if (foldersInRack.length === 0) {
    el("rackView").classList.add("hidden");
    showToast("No folders assigned to cells in this rack", "error");
    return;
  }
  
  // Find max columns and rows
  const maxCol = Math.max(...foldersInRack.map(f => f.rack_column));
  const maxRow = Math.max(...foldersInRack.map(f => f.rack_row));
  
  el("currentRackName").textContent = rackName;
  el("rackView").classList.remove("hidden");
  
  renderRackGrid(maxCol, maxRow, foldersInRack);
}

function renderRackGrid(columns, rows, folders) {
  const grid = el("rackGrid");
  grid.innerHTML = "";
  
  const table = document.createElement("table");
  table.className = "border-collapse";
  
  // Header row (columns)
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = '<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold"></th>';
  for (let c = 1; c <= columns; c++) {
    headerRow.innerHTML += `<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold">C${c}</th>`;
  }
  table.appendChild(headerRow);
  
  // Data rows
  for (let r = 1; r <= rows; r++) {
    const row = document.createElement("tr");
    row.innerHTML = `<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold">R${r}</th>`;
    
    for (let c = 1; c <= columns; c++) {
      const folder = folders.find(f => f.rack_column == c && f.rack_row == r);
      
      let cellClass = "border border-gray-400 w-24 h-24 cursor-pointer hover:bg-gray-100 transition p-2";
      let cellContent = '<div class="text-xs text-gray-400 text-center">Empty</div>';
      
      if (folder) {
        cellClass = "border-2 border-yellow-400 bg-yellow-100 w-24 h-24 cursor-pointer hover:bg-yellow-200 transition p-2";
        cellContent = `
          <div class="text-xs font-semibold text-yellow-900 overflow-hidden">
            <div class="text-center mb-1">📁</div>
            <div class="truncate" title="${escapeHtml(folder.folder_name)}">${escapeHtml(folder.folder_name)}</div>
          </div>
        `;
      }
      
      const cellId = folder ? folder.folder_id : null;
      row.innerHTML += `<td class="${cellClass}" onclick="openCellDetails(${c}, ${r}, ${cellId})">${cellContent}</td>`;
    }
    
    table.appendChild(row);
  }
  
  grid.appendChild(table);
}

// ============================
// 🔹 Open Cell Details Modal
// ============================
function openCellDetails(col, row, folderId) {
  el("cellLocation").textContent = `${currentRack} - Column ${col}, Row ${row}`;
  
  const detailsDiv = el("assignmentDetails");
  
  if (folderId) {
    const folder = folderData.find(f => f.folder_id === folderId);
    
    if (folder) {
      const locationName = locationData.find(l => l.location_id == folder.location_id)?.location_name || 'Unknown';
      const filesCount = folder.files_inside?.length || 0;
      
      detailsDiv.innerHTML = `
        <div class="space-y-3">
          <div>
            <p class="text-xs text-gray-500 mb-1 font-semibold">Type</p>
            <p class="text-sm font-semibold text-gray-800">📁 Folder</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1 font-semibold">Folder Name</p>
            <p class="text-base font-bold text-gray-900">${escapeHtml(folder.folder_name)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1 font-semibold">Serial Number</p>
            <p class="text-sm font-mono text-blue-600">${escapeHtml(folder.serial_num || '-')}</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-gray-500 mb-1 font-semibold">Department</p>
              <p class="text-sm text-gray-800">${escapeHtml(folder.department || '-')}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1 font-semibold">Files Inside</p>
              <p class="text-sm text-gray-800">${filesCount} files</p>
            </div>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1 font-semibold">Location</p>
            <p class="text-sm text-gray-800">${escapeHtml(locationName)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1 font-semibold">Position</p>
            <p class="text-sm font-semibold text-gray-800">Rack: ${escapeHtml(folder.rack_name || '-')} | Column ${col}, Row ${row}</p>
          </div>
        </div>
      `;
    }
  } else {
    detailsDiv.innerHTML = `
      <div class="text-center py-4">
        <p class="text-gray-500 text-sm">This cell is empty</p>
        <p class="text-gray-400 text-xs mt-2">No folder assigned to this position</p>
      </div>
    `;
  }
  
  el("viewModal").classList.remove("hidden");
}

function closeViewModal() {
  el("viewModal").classList.add("hidden");
}

// ============================
// 🔹 Search Folders by Location/Rack
// ============================
function searchFolders() {
  const searchTerm = el("searchInput")?.value.toLowerCase().trim();
  
  if (!searchTerm) {
    showToast("Please enter a search term", "error");
    return;
  }
  
  const results = folderData.filter(f => 
    f.folder_name?.toLowerCase().includes(searchTerm) ||
    f.serial_num?.toLowerCase().includes(searchTerm) ||
    f.rack_name?.toLowerCase().includes(searchTerm) ||
    f.department?.toLowerCase().includes(searchTerm)
  );
  
  displaySearchResults(results);
}

function clearSearch() {
  el("searchInput").value = "";
  el("searchResults").classList.add("hidden");
}

function displaySearchResults(results) {
  const resultsDiv = el("searchResultsBody");
  const resultsSection = el("searchResults");
  
  resultsDiv.innerHTML = "";
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="text-center py-8 text-gray-500">No folders found</div>';
    resultsSection.classList.remove("hidden");
    return;
  }
  
  results.forEach(folder => {
    const locationName = locationData.find(l => l.location_id == folder.location_id)?.location_name || 'Unknown';
    
    const card = document.createElement("div");
    card.className = "bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition";
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-900 mb-2">${escapeHtml(folder.folder_name)}</h4>
          <div class="space-y-1 text-sm text-gray-600">
            <p><span class="font-medium">Serial:</span> ${escapeHtml(folder.serial_num || '-')}</p>
            <p><span class="font-medium">Department:</span> ${escapeHtml(folder.department || '-')}</p>
            <p><span class="font-medium">Location:</span> ${escapeHtml(locationName)}</p>
            ${folder.rack_name ? `
              <p class="text-blue-600 font-medium">
                📍 ${escapeHtml(folder.rack_name)} - Column ${folder.rack_column}, Row ${folder.rack_row}
              </p>
            ` : '<p class="text-orange-600">⚠️ No rack position assigned</p>'}
          </div>
        </div>
        <span class="text-3xl">📁</span>
      </div>
    `;
    resultsDiv.appendChild(card);
  });
  
  resultsSection.classList.remove("hidden");
}

// ============================
// 🔹 Add New Location
// ============================
async function addLocation(e) {
  e.preventDefault();
  
  const location_name = el("loct_name").value.trim();
  
  if (!location_name) {
    return showToast("Please enter a location name", "error");
  }

  try {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_name })
    });

    if (res.ok) {
      showToast("Location added successfully!");
      el("loct_name").value = "";
      await loadLocations();
    } else {
      const error = await res.json();
      showToast(error.message || "Failed to add location", "error");
    }
  } catch (err) {
    console.error("Error adding location:", err);
    
    // Fallback to localStorage
    const newLocation = {
      location_id: Date.now(),
      location_name: location_name,
      created_at: new Date().toISOString()
    };
    
    locationData.push(newLocation);
    localStorage.setItem("locations", JSON.stringify(locationData));
    
    showToast("Location added locally!");
    el("loct_name").value = "";
    await loadLocations();
  }
}

// ============================
// 🔹 Render Locations Table
// ============================
function renderLocationsTable(locations) {
  const tbody = el("locationsTable")?.querySelector("tbody");
  const noLocations = el("noLocations");
  
  if (!tbody) return;
  
  tbody.innerHTML = "";

  if (!locations.length) {
    if (noLocations) noLocations.classList.remove("hidden");
    return;
  }
  
  if (noLocations) noLocations.classList.add("hidden");

  locations.forEach(loc => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 transition";
    
    row.innerHTML = `
<<<<<<< HEAD
      <td class="px-4 py-3 text-center font-semibold text-blue-600">#${loc.location_id}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${escapeHtml(loc.location_name)}</td>
      <td class="px-4 py-3 text-center">
        <div class="flex gap-2 justify-center">
          <button onclick="openEditModal(${loc.location_id})" 
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition">
            Edit
          </button>
          <button onclick="deleteLocation(${loc.location_id})" 
            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition">
            Delete
          </button>
        </div>
      </td>
    `;
    
=======
      <td class="border px-4 py-2 text-center">${loc.location_id}</td>
      <td class="border px-4 py-2">${loc.location_name}</td>
      <td class="flex gap-2 justify-center py-2">
        <button 
          onclick='openEditModal(${loc.location_id})' 
          class="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Edit
        </button>
        <button 
          onclick='deleteLoct(${loc.location_id})' 
          class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition">
          Delete
        </button>
      </td>`;
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
    tbody.appendChild(row);
  });
}

<<<<<<< HEAD
// ============================
// 🔹 Open Edit Modal
// ============================
function openEditModal(locationId) {
  const location = locationData.find(l => l.location_id === locationId);
  
  if (!location) {
    return showToast("Location not found", "error");
  }
  
  editId = locationId;
  el("editLoct").value = location.location_name;
  
  const modal = el("editModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("modal-show"), 10);
=======
// ✅ Open Edit Modal
function openEditModal(locationId) {
  const location = locations.find(x => x.location_id === locationId);
  if (!location) return alert("Location not found");

  editId = location.location_id;
  document.getElementById("editLoct").value = location.location_name;

  document.getElementById("editModal").classList.add("show");  
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
}

function closeEditModal() {
<<<<<<< HEAD
  const modal = el("editModal");
  modal.classList.remove("modal-show");
  setTimeout(() => modal.classList.add("hidden"), 200);
  editId = null;
=======
  document.getElementById("editModal").classList.remove("show"); // ❗ remove show
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
}

// ============================
// 🔹 Save Location Changes
// ============================
async function saveLocationChanges(e) {
  e.preventDefault();
  
  if (!editId) return;
  
  const location_name = el("editLoct").value.trim();
  
  if (!location_name) {
    return showToast("Please enter a location name", "error");
  }

  try {
    const res = await fetch(`/api/locations/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_name })
    });

<<<<<<< HEAD
    if (res.ok) {
      showToast("Location updated successfully!");
      closeEditModal();
      await loadLocations();
    } else {
      const error = await res.json();
      showToast(error.message || "Failed to update location", "error");
    }
  } catch (err) {
    console.error("Error updating location:", err);
    
    // Fallback to localStorage
    const index = locationData.findIndex(l => l.location_id === editId);
    if (index !== -1) {
      locationData[index].location_name = location_name;
      localStorage.setItem("locations", JSON.stringify(locationData));
      showToast("Location updated locally!");
      closeEditModal();
      await loadLocations();
    } else {
      showToast("Failed to update location", "error");
    }
  }
}

// ============================
// 🔹 Delete Location
// ============================
async function deleteLocation(locationId) {
  const location = locationData.find(l => l.location_id === locationId);
  
  if (!location) {
    return showToast("Location not found", "error");
  }

  const confirmed = confirm(
    `Delete this location?\n\n` +
    `Location: ${location.location_name}\n\n` +
    `⚠️ Warning: This may affect folders assigned to this location!`
  );

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/locations/${locationId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      showToast("Location deleted successfully!");
      await loadLocations();
    } else {
      const error = await res.json();
      showToast(error.message || "Failed to delete location", "error");
    }
  } catch (err) {
    console.error("Error deleting location:", err);
    
    // Fallback to localStorage
    locationData = locationData.filter(l => l.location_id !== locationId);
    localStorage.setItem("locations", JSON.stringify(locationData));
    showToast("Location deleted locally!");
    await loadLocations();
  }
}

// ============================
// 🔹 Logout Handler
// ============================
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    })
      .then(() => {
        window.location.href = '/login.html';
      })
      .catch(() => {
        window.location.href = '/login.html';
      });
  }
}

// ============================
// 🔹 Helper Functions
// ============================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================
// 🔹 Expose Functions Globally
// ============================
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteLocation = deleteLocation;
window.onLocationChange = onLocationChange;
window.loadRackView = loadRackView;
window.openCellDetails = openCellDetails;
window.closeViewModal = closeViewModal;
=======
document.addEventListener("DOMContentLoaded", loadLoct);
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
