const el = id => document.getElementById(id);
let allHistoryData = [];        // all data from API
let filteredHistoryData = [];   // filtered data for table & CSV



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

// Test immediately
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM Content Loaded - Testing user info...");
    loadUserInfo();
});


document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    initMobileMenu();

    el("logoutBtn")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to logout?")) return;
        try { await fetch("/api/auth/logout", { method: "POST" }); } catch(e){ }
        localStorage.clear();
        window.location.href = "/login.html";
    });

    // Filters
    el("filterBtn")?.addEventListener("click", applyFilters);
    el("resetBtn")?.addEventListener("click", () => {
        el("filterDateFrom").value = "";
        el("filterDateTo").value = "";
        el("searchHistory").value = "";
        applyFilters();
    });

    // CSV Export - Fixed ID
    el("exportCSV")?.addEventListener("click", exportCSV);

    // Modal close
    el("closeModal")?.addEventListener("click", () => toggleModal("historyModal", false));
    el("closeModalBtn")?.addEventListener("click", () => toggleModal("historyModal", false));

    // Close modal on overlay click
    el("historyModal")?.addEventListener("click", (e) => {
        if (e.target.id === "historyModal") {
            toggleModal("historyModal", false);
        }
    });
});

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

function toggleModal(id, show = true) {
    const modal = el(id);
    if (!modal) return;
    modal.classList.toggle("active", show);
}

function updateDashboardStats(data) {
    const total = data.length;
    const returned = data.filter(item => item.status_name?.toLowerCase() === "returned").length;

    const now = new Date();
    const thisMonth = data.filter(item => {
        if (!item.move_date) return false;
        const moveDate = new Date(item.move_date);
        return moveDate.getMonth() === now.getMonth() && moveDate.getFullYear() === now.getFullYear();
    }).length;

    el("statTotal").textContent = total;
    el("statReturned").textContent = returned;
    el("statThisMonth").textContent = thisMonth;
    
    // Update counts
    el("showingCount").textContent = data.length;
    el("totalCount").textContent = allHistoryData.length;
}

// ==============================
// LOAD HISTORY
// ==============================
async function loadHistory() {
    const tableBody = el("historyTableBody");
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Loading...</td></tr>`;

    try {
        const res = await fetch("/api/file-movements");
        if (!res.ok) throw new Error("Failed to fetch history");

        allHistoryData = await res.json();
        filteredHistoryData = [...allHistoryData]; // initially all

        renderHistoryTable(filteredHistoryData);
        updateDashboardStats(filteredHistoryData);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-red-600">Error loading history</td></tr>`;
        updateDashboardStats([]);
    }
}

// ==============================
// APPLY FILTERS
// ==============================
function applyFilters() {
    const fromDate = el("filterDateFrom").value ? new Date(el("filterDateFrom").value) : null;
    const toDate = el("filterDateTo").value ? new Date(el("filterDateTo").value) : null;
    const search = el("searchHistory").value.trim().toLowerCase();

    filteredHistoryData = allHistoryData.filter(item => {
        const moveDate = item.move_date ? new Date(item.move_date) : null;

        const matchDate =
            (!fromDate || (moveDate && moveDate >= fromDate)) &&
            (!toDate || (moveDate && moveDate <= toDate));

        const matchSearch =
            !search ||
            (item.file_name && item.file_name.toLowerCase().includes(search)) ||
            (item.user_name && item.user_name.toLowerCase().includes(search)) ||
            (item.approved_by_name && item.approved_by_name.toLowerCase().includes(search));

        return matchDate && matchSearch;
    });

    renderHistoryTable(filteredHistoryData);
    updateDashboardStats(filteredHistoryData);
}

// ==============================
// RENDER TABLE
// ==============================
function renderHistoryTable(data) {
    const tableBody = el("historyTableBody");
    tableBody.innerHTML = "";

    if (!data.length) {
        el("noHistory").classList.remove("hidden");
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-500">No records found</td></tr>`;
        return;
    } else {
        el("noHistory").classList.add("hidden");
    }

    data.forEach(item => {
        const row = document.createElement("tr");
        row.className = "hover:bg-gray-50 transition-colors";
        
        const fileName = item.files?.[0]?.file_name || item.file_name || "-";
        const statusBadge = getStatusBadge(item.status_id, item.status_name);

        row.innerHTML = `
            <td class="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">${item.move_id}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-left text-gray-700 hidden lg:table-cell">${formatDate(item.move_date)}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-left text-gray-700 hidden xl:table-cell">${formatDateTime(item.taken_at)}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-left text-gray-700 hidden xl:table-cell">${formatDateTime(item.return_at)}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-center font-medium text-gray-900">${fileName}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-center text-gray-700 hidden md:table-cell">${item.user_name || "-"}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-center text-gray-700 hidden lg:table-cell">${item.approved_by_name || "-"}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-center">${statusBadge}</td>
            <td class="px-2 md:px-4 py-2 md:py-3 text-center">
                <button 
                    class="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs md:text-sm font-medium" 
                    onclick="openHistoryModal(${item.move_id})"
                >
                    View
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// ==============================
// CSV EXPORT (filtered only)
// ==============================
function exportCSV() {
    if (!filteredHistoryData.length) {
        alert("No data to export!");
        return;
    }

    let csv = "Move ID,Request Date,Taken Out Date,Returned Date,File Name,Requestor,Approved By,Status\n";

    filteredHistoryData.forEach(item => {
        const fileName = item.files?.[0]?.file_name || item.file_name || "-";
        const row = [
            item.move_id,
            formatDate(item.move_date),
            formatDateTime(item.taken_at),
            formatDateTime(item.return_at),
            `"${fileName.replace(/"/g, '""')}"`,
            `"${(item.user_name || "-").replace(/"/g, '""')}"`,
            `"${(item.approved_by_name || "-").replace(/"/g, '""')}"`,
            `"${(item.status_name || "-").replace(/"/g, '""')}"`
        ];
        csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `file_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast("CSV exported successfully!", "success");
}

// ==============================
// MODAL
// ==============================
window.openHistoryModal = async function (moveId) {
    try {
        const res = await fetch(`/api/file-movements/${moveId}`);
        if (!res.ok) throw new Error("Failed to fetch details");
        
        const data = await res.json();
        const modalBody = el("modalBody");
        
        const fileNames = data.files?.map(f => f.file_name).join(", ") || data.file_name || "-";
        const folderNames = data.files?.map(f => f.folder_name).join(", ") || "-";

        modalBody.innerHTML = `
            <div class="space-y-3">
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Move ID</p>
                            <p class="font-semibold text-gray-900">${data.move_id}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Status</p>
                            <div>${getStatusBadge(data.status_id, data.status_name)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border border-gray-200 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">File Information</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex flex-col md:flex-row">
                            <span class="text-gray-500 w-32">Folder:</span>
                            <span class="font-medium text-gray-900">${folderNames}</span>
                        </div>
                        <div class="flex flex-col md:flex-row">
                            <span class="text-gray-500 w-32">File:</span>
                            <span class="font-medium text-gray-900">${fileNames}</span>
                        </div>
                    </div>
                </div>

                <div class="p-4 border border-gray-200 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">Timeline</h4>
                    <div class="space-y-3">
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div>
                                <p class="text-xs text-gray-500">Requested</p>
                                <p class="font-medium text-sm">${formatDateTime(data.move_date)}</p>
                                <p class="text-xs text-gray-600 mt-1">By: ${data.moved_by_name || data.user_name || "-"}</p>
                            </div>
                        </div>
                        
                        ${data.taken_at ? `
                        <div class="timeline-item">
                            <div class="timeline-dot bg-green-600"></div>
                            <div>
                                <p class="text-xs text-gray-500">Taken Out</p>
                                <p class="font-medium text-sm">${formatDateTime(data.taken_at)}</p>
                                <p class="text-xs text-gray-600 mt-1">Approved by: ${data.approved_by_name || "-"}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${data.return_at ? `
                        <div class="timeline-item">
                            <div class="timeline-dot bg-purple-600"></div>
                            <div>
                                <p class="text-xs text-gray-500">Returned</p>
                                <p class="font-medium text-sm">${formatDateTime(data.return_at)}</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        toggleModal("historyModal", true);
    } catch (e) {
        console.error("Failed to load modal:", e);
        showToast("Failed to load details", "error");
    }
};

// ==============================
// HELPER FUNCTIONS
// ==============================
function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function getStatusBadge(id, name) {
    const statusMap = {
        1: { class: "status-pending", label: name || "Pending" },
        2: { class: "bg-red-100 text-red-800", label: name || "Rejected" },
        3: { class: "status-approved", label: name || "Approved" },
        4: { class: "bg-orange-100 text-orange-800", label: name || "Taken Out" },
        5: { class: "status-returned", label: name || "Returned" }
    };
    
    const status = statusMap[id] || { class: "status-available", label: name || "Unknown" };
    return `<span class="status-badge ${status.class}">${status.label}</span>`;
}

function showToast(message, type = "info") {
    const container = el("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg mb-2 transition-opacity duration-300`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}