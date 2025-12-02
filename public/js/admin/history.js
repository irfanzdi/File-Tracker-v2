const el = id => document.getElementById(id);
let allHistoryData = [];        // all data from API
let filteredHistoryData = [];   // filtered data for table & CSV

document.addEventListener("DOMContentLoaded", () => {
    loadHistory();

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

    // CSV Export
    el("exportBtn")?.addEventListener("click", exportCSV);

    // Modal close
    el("closeModal")?.addEventListener("click", () => toggleModal("historyModal", false));
    el("closeModalBtn")?.addEventListener("click", () => toggleModal("historyModal", false));
});

function toggleModal(id, show = true) {
    const modal = el(id);
    if (!modal) return;
    modal.style.display = show ? "flex" : "none";
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
        updateDashboardStats(allHistoryData); // <-- update dashboard here
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Error loading history</td></tr>`;
        updateDashboardStats([]); // reset stats if error
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
            (item.user_name && item.user_name.toLowerCase().includes(search));

        return matchDate && matchSearch;
    });

    renderHistoryTable(filteredHistoryData);
    updateDashboardStats(filteredHistoryData); // <-- update dashboard for filtered data
}

// ==============================
// RENDER TABLE
// ==============================
function renderHistoryTable(data) {
    const tableBody = el("historyTableBody");
    tableBody.innerHTML = "";

    if (!data.length) {
        el("noHistory").classList.remove("hidden");
        return;
    } else {
        el("noHistory").classList.add("hidden");
    }

    data.forEach(item => {
        const row = document.createElement("tr");
        const fileName = item.files?.[0]?.file_name || item.file_name || "-";
        const statusBadge = `<div class="status-badges-container">${getStatusBadge(item.status_id, item.status_name)}</div>`;

        row.innerHTML = `
            <td class="px-4 py-2 text-center">${item.move_id}</td>
            <td class="px-4 py-2">${formatDate(item.move_date)}</td>
            <td class="px-4 py-2">${formatDateTime(item.taken_at)}</td>
            <td class="px-4 py-2">${formatDateTime(item.return_at)}</td>
            <td class="px-4 py-2">${fileName}</td>
            <td class="px-4 py-2">${item.user_name || "-"}</td>
            <td class="px-4 py-2">${item.approved_by_name || "-"}</td>
            <td class="px-4 py-2 text-center">${statusBadge}</td>
            <td class="px-4 py-2 text-center">
                <button class="px-3 py-1 bg-blue-100 text-blue-700 rounded" onclick="openHistoryModal(${item.move_id})">View</button>
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
            fileName.replace(/,/g, " "),
            (item.user_name || "-").replace(/,/g, " "),
            (item.approved_by_name || "-").replace(/,/g, " "),
            (item.status_name || "-").replace(/,/g, " ")
        ];
        csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_history.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ==============================
// MODAL & HELPER FUNCTIONS
// ==============================
function toggleModal(id, show = true) {
    const modal = el(id);
    if (!modal) return;
    modal.style.display = show ? "flex" : "none";
}

window.openHistoryModal = async function (moveId) {
    try {
        const res = await fetch(`/api/file-movements/${moveId}`);
        const data = await res.json();

        const modalBody = el("modalBody");
        modalBody.innerHTML = `
            <div class="p-3 bg-gray-50 rounded">
                <p><strong>Move ID:</strong> ${data.move_id}</p>
                <p><strong>Folder Name:</strong> ${data.files?.map(f => f.folder_name).join(", ")}</p>
                <p><strong>File:</strong> ${data.files?.map(f => f.file_name).join(", ")}</p>
                <p><strong>Requested:</strong> ${formatDateTime(data.move_date)}</p>
                <p><strong>Taken Out:</strong> ${formatDateTime(data.taken_at)}</p>
                <p><strong>Returned:</strong> ${formatDateTime(data.return_at)}</p>
                <p><strong>Requestor:</strong> ${data.moved_by_name}</p>
                <p><strong>Approved By:</strong> ${data.approved_by_name}</p>
                <p><strong>Status:</strong> ${data.status_name}</p>
            </div>
        `;

        toggleModal("historyModal", true);
    } catch (e) {
        console.error("Failed to load modal:", e);
    }
};

function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`;
}

function getStatusBadge(id, name) {
    let cls = "status-badge status-available"; // default
    switch(id){
        case 1: cls = "status-badge status-pending"; break;
        case 2: cls = "status-badge status-rejected"; break;
        case 3: cls = "status-badge status-approved"; break;
        case 4: cls = "status-badge status-taken-out"; break;
        case 5: cls = "status-badge status-returned"; break;
        // Add more cases if needed
    }
    return `<span class="${cls}">${name || "Unknown"}</span>`;
}
