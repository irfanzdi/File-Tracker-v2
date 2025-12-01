const el = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    loadHistory();

    el("logoutBtn")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to logout?")) return;
        try { await fetch("/api/auth/logout", { method: "POST" }); } catch(e){ /* ignore */ }
        localStorage.clear();
        window.location.href = "/login.html";
    });
});


async function loadHistory() {
    const tableBody = document.querySelector("#historyTable tbody");
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>`;

    try {
        const res = await fetch("/api/file-movements");
        if (!res.ok) throw new Error("Failed to fetch history");

        let data = await res.json();

        // Filter only status_id 4 (Return) and 5 (Take Out)
        data = data.filter(item => item.status_id === 4 || item.status_id === 5);

        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No history found.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement("tr");

            // List of files
            const fileList = item.files?.map(f => f.file_name).join(", ") || "-";

            // Status badge
            const statusBadge = getStatusBadge(item.status_id, item.status_name);

            row.innerHTML = `
                <td>${item.move_id}</td>
                <td>${formatDate(item.move_date)}</td>
                <td>${formatDateTime(item.taken_at)}</td>
                <td>${formatDateTime(item.return_at)}</td>
                <td>${fileList}</td>
                <td>${item.user_name || "-"}</td>
                <td>${item.approved_by_name || "-"}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="view-btn" onclick="viewMovement(${item.move_id})">
                        View
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Error loading history</td></tr>`;
    }
}

function viewMovement(moveId) {
    window.location.href = `/movement_view.html?move_id=${moveId}`;
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function getStatusBadge(id, name) {
    let cls = "status-default";
    switch (id) {
        case 4: cls = "status-return"; break;
        case 5: cls = "status-takeout"; break;
        case 1: cls = "status-pending"; break;
        case 2: cls = "status-approved"; break;
        case 3: cls = "status-rejected"; break;
    }
    return `<span class="badge ${cls}">${name || "Unknown"}</span>`;
}

