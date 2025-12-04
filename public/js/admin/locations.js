const el = id => document.getElementById(id);

let locationData = [];
let editId = null;
let locationToDelete = null;

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

// ==============================
// TOAST NOTIFICATION
// ==============================
function showToast(message, type = "success") {
    const container = el("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColors = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
        warning: "bg-yellow-500"
    };
    
    const bgColor = bgColors[type] || bgColors.info;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg mb-2 transition-all duration-300 text-sm md:text-base flex items-center gap-2`;
    toast.innerHTML = `<span>${icon}</span><p>${message}</p>`;
    
    container.appendChild(toast);
    
    // Slide in animation
    setTimeout(() => toast.style.transform = "translateX(0)", 10);
    
    // Auto dismiss
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==============================
// MOBILE MENU
// ==============================
function initMobileMenu() {
    const menuBtn = el("mobileMenuBtn");
    const sidebar = el("sidebar");
    const overlay = el("sidebarOverlay");

    if (!menuBtn || !sidebar || !overlay) return;

    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    });

    // Close sidebar when clicking nav links on mobile
    const navLinks = sidebar.querySelectorAll("a");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("active");
                overlay.classList.remove("active");
            }
        });
    });
}

// ==============================
// LOGOUT
// ==============================
el("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try { 
        await fetch("/api/auth/logout", { method: "POST" }); 
    } catch(e) {}
    localStorage.clear();
    window.location.href = "/login.html";
});

// ==============================
// LOAD LOCATIONS
// ==============================
async function loadLocations() {
    try {
        const res = await fetch("/api/locations/locations-with-folders");
        if (!res.ok) throw new Error("Failed to fetch locations");
        
        locationData = await res.json();
        renderLocationsTable();
    } catch(e) {
        console.error("Error loading locations:", e);
        locationData = [];
        renderLocationsTable();
        showToast("Failed to load locations", "error");
    }
}

// ==============================
// RENDER TABLE
// ==============================
function renderLocationsTable() {
    const tbody = el("locationsTable")?.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    
    // Update total count
    const totalEl = el("totalLocations");
    if (totalEl) totalEl.textContent = locationData.length;

    if (locationData.length === 0) {
        el("noLocations")?.classList.remove("hidden");
        return;
    }
    
    el("noLocations")?.classList.add("hidden");

    locationData.forEach((loc, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors";
        
        tr.innerHTML = `
            <td class="px-3 md:px-4 py-2 md:py-3 font-medium text-gray-900">${loc.location_id || (index + 1)}</td>
            <td class="px-3 md:px-4 py-2 md:py-3 text-gray-900 font-medium">${loc.location_name}</td>
            <td class="px-3 md:px-4 py-2 md:py-3"></td>
        `;

        const tdActions = tr.querySelector("td:last-child");

        // View button
        const viewBtn = document.createElement("button");
        viewBtn.textContent = " View";
        viewBtn.className = "px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs md:text-sm font-medium mr-2 mb-1";
        viewBtn.addEventListener("click", () => openDetailsModal(loc));

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.textContent = " Edit";
        editBtn.className = "px-2 md:px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs md:text-sm font-medium mr-2 mb-1";
        editBtn.addEventListener("click", () => openEditModal(loc));

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.textContent = " Delete";
        delBtn.className = "px-2 md:px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs md:text-sm font-medium mb-1";
        delBtn.addEventListener("click", () => openDeleteModal(loc));

        tdActions.appendChild(viewBtn);
        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);

        tbody.appendChild(tr);
    });
}

// ==============================
// ADD LOCATION
// ==============================
el("addLocationForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const name = el("loct_name")?.value?.trim();
    
    if (!name) {
        showToast("Location name required", "error");
        return;
    }

    try {
        const res = await fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: name })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || "Failed to add location");
        }

        // Add to local data
        locationData.push({ 
            location_id: data.location_id || data.loct_id,
            location_name: name, 
            folders: [] 
        });
        
        renderLocationsTable();
        el("loct_name").value = "";
        showToast("✅ Location added successfully", "success");
    } catch(err) {
        console.error("Error adding location:", err);
        showToast(err.message, "error");
    }
});

// ==============================
// EDIT LOCATION
// ==============================
function openEditModal(loc) {
    editId = loc.location_id;
    el("editLoct").value = loc.location_name;
    el("editModal")?.classList.add("active");
}

function closeEditModal() {
    el("editModal")?.classList.remove("active");
    editId = null;
}

el("editLocationForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const newName = el("editLoct")?.value?.trim();
    
    if (!newName) {
        showToast("Location name required", "error");
        return;
    }

    try {
        const res = await fetch(`/api/locations/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: newName })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || "Failed to update location");
        }

        // Update local data
        const loc = locationData.find(l => l.location_id === editId);
        if (loc) loc.location_name = newName;
        
        renderLocationsTable();
        showToast("✅ Location updated successfully", "success");
        closeEditModal();
    } catch(err) {
        console.error("Error updating location:", err);
        showToast(err.message, "error");
    }
});

// ==============================
// DELETE LOCATION
// ==============================
function openDeleteModal(loc) {
    locationToDelete = loc;
    el("deleteLocationName").textContent = loc.location_name;
    el("deleteModal")?.classList.add("active");
}

function closeDeleteModal() {
    el("deleteModal")?.classList.remove("active");
    locationToDelete = null;
}

el("confirmDeleteBtn")?.addEventListener("click", async () => {
    if (!locationToDelete) return;

    try {
        const res = await fetch(`/api/locations/${locationToDelete.location_id}`, { 
            method: "DELETE" 
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || "Failed to delete location");
        }

        // Remove from local data
        locationData = locationData.filter(l => l.location_id !== locationToDelete.location_id);
        
        renderLocationsTable();
        showToast("✅ Location deleted successfully", "success");
        closeDeleteModal();
    } catch(err) {
        console.error("Error deleting location:", err);
        showToast(err.message, "error");
    }
});

// ==============================
// VIEW DETAILS
// ==============================
function openDetailsModal(location) {
    const modal = el("detailsModal");
    const container = el("detailsContainer");
    
    if (!modal || !container) return;

    container.innerHTML = "";

    // Location info header
    const headerDiv = document.createElement("div");
    headerDiv.className = "p-4 bg-gray-50 rounded-lg space-y-3 mb-4";
    headerDiv.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <p class="text-xs text-gray-500 mb-1">Location ID</p>
                <p class="font-semibold text-gray-900">${location.location_id}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500 mb-1">Location Name</p>
                <p class="font-semibold text-gray-900">${location.location_name}</p>
            </div>
        </div>
    `;
    container.appendChild(headerDiv);

    // Folders section
    const foldersDiv = document.createElement("div");
    foldersDiv.className = "p-4 border border-gray-200 rounded-lg";
    
    if (!location.folders || location.folders.length === 0) {
        foldersDiv.innerHTML = `
            <h4 class="font-semibold text-gray-900 mb-3 text-sm md:text-base">📁 Folders at this Location</h4>
            <p class="text-sm text-gray-500">No folders in this location yet.</p>
        `;
    } else {
        foldersDiv.innerHTML = `
            <h4 class="font-semibold text-gray-900 mb-3 text-sm md:text-base">📁 Folders at this Location</h4>
            <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                ${location.folders.map(f => `
                    <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                            <h3 class="font-semibold text-blue-900 text-sm md:text-base">
                                ${f.folder_name} 
                                <span class="text-xs font-normal text-blue-700">(${f.serial_num || 'N/A'})</span>
                            </h3>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-gray-700">
                            <p><span class="font-medium">Department:</span> ${f.department || 'N/A'}</p>
                            <p><span class="font-medium">Created by:</span> ${f.created_by || 'N/A'}</p>
                            <p class="col-span-1 md:col-span-2">
                                <span class="font-medium">Created:</span> 
                                ${f.created_at ? new Date(f.created_at).toLocaleString() : 'N/A'}
                            </p>
                            <p class="col-span-1 md:col-span-2">
                                <span class="font-medium">Files:</span> 
                                ${f.files_inside && f.files_inside.length ? 
                                    `<span class="text-green-700">${f.files_inside.join(", ")}</span>` : 
                                    '<span class="text-gray-500">No files</span>'}
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-600">
                    Total Folders: <span class="font-semibold">${location.folders.length}</span>
                </p>
            </div>
        `;
    }
    
    container.appendChild(foldersDiv);
    modal.classList.add("active");
}

function closeDetailsModal() {
    el("detailsModal")?.classList.remove("active");
}

// ==============================
// INITIALIZE
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    loadUserInfo(); // ⭐ ADD THIS LINE - Load user info first!
    loadLocations();
    initMobileMenu();

    // Close modal on background click
    ["editModal", "deleteModal", "detailsModal"].forEach(modalId => {
        el(modalId)?.addEventListener("click", e => {
            if (e.target.id === modalId) {
                e.target.classList.remove("active");
            }
        });
    });

    // Make modal functions global for inline HTML usage
    window.closeEditModal = closeEditModal;
    window.closeDeleteModal = closeDeleteModal;
    window.closeDetailsModal = closeDetailsModal;
});