// file_Movement.js – CORRECT VERSION FOR APPROVAL PAGE ONLY
let currentMoveId = null;

// -------------------------------
// DOM Loaded
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("File Movement Approval Page Loaded");

  // Only load pending requests — NO file/folder dropdowns here!
  loadRequests();

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keyup", filterTable);
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Logout?")) {
        fetch("/api/auth/logout").then(() => location.href = "/login.html");
      }
    });
  }
});

// -------------------------------
// LOAD PENDING REQUESTS
// -------------------------------
async function loadRequests() {
  const tbody = document.querySelector("#movementTable tbody");
  const noRequests = document.getElementById("noRequests");

  try {
    const res = await fetch("/api/file_movement/pending", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Failed to load requests");

    const requests = await res.json();

    if (!Array.isArray(requests) || requests.length === 0) {
      tbody.innerHTML = "";
      noRequests.classList.remove("hidden");
      return;
    }

    noRequests.classList.add("hidden");
    tbody.innerHTML = "";

    requests.forEach(r => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 cursor-pointer";
      tr.onclick = () => openDetails(r.move_id);

      let filesList = "-";

          if (Array.isArray(r.files)) {
            filesList = r.files.map(f => f.file_name).join(", ");
          } else if (typeof r.files === "string") {
            filesList = r.files; // backend sent a string
          } else {
            filesList = "-";
          }

      tr.innerHTML = `
        <td class="px-3 py-2">${r.move_id}</td>
        <td class="px-3 py-2">${r.moved_by_name || "Unknown"}</td>
        <td class="px-3 py-2">${r.move_type || "-"}</td>
        <td class="px-3 py-2">${r.move_date || "-"}</td>
        <td class="px-3 py-2 text-xs">${filesList}</td>
        <td class="px-3 py-2 text-center">
          <button onclick="event.stopPropagation(); openDetails(${r.move_id})"
                  class="text-blue-600 hover:underline text-xs">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("loadRequests error:", err);
    showToast("Failed to load requests", "error");
  }
}

// -------------------------------
// OPEN MODAL - SHOW DETAILS
// -------------------------------
async function openDetails(move_id) {
  currentMoveId = move_id;

  const modal = document.getElementById("viewModal");
  modal.classList.remove("hidden");

  try {
    const res = await fetch(`/api/file_movement/${move_id}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    document.getElementById("d_user").textContent = data.moved_by_name || "-";
    document.getElementById("d_type").textContent = data.move_type || "-";
    document.getElementById("d_date").textContent = data.move_date || "-";
    document.getElementById("d_remark").textContent = data.remark || "-";

    const list = document.getElementById("d_files");
    list.innerHTML = "";
    (data.files || []).forEach(f => {
      const li = document.createElement("li");
      li.textContent = f.file_name;
      list.appendChild(li);
    });
  } catch (err) {
    showToast("Failed to load details", "error");
  }
}

function closeModal() {
  document.getElementById("viewModal").classList.add("hidden");
}

function openDetails(move_id) {
  currentMoveId = move_id;

  const modal = document.getElementById("viewModal");
  modal.classList.add("show");      // ✅ add show
  modal.classList.remove("hidden"); // optional
}
function closeModal() {
  const modal = document.getElementById("viewModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");    // optional
}

// -------------------------------
// APPROVE / REJECT
// -------------------------------
async function approveRequest() {
  if (!currentMoveId || !confirm("Approve this request?")) return;

  try {
    const res = await fetch(`/api/file_movement/approve/${currentMoveId}`, { method: "PUT" });
    const data = await res.json();

    if (data.success) {
      showToast("Approved!", "success");
      closeModal();
      loadRequests();
    } else {
      showToast(data.error || "Failed", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

async function rejectRequest() {
  if (!currentMoveId || !confirm("Reject this request?")) return;

  try {
    const res = await fetch(`/api/file_movement/reject/${currentMoveId}`, { method: "PUT" });
    const data = await res.json();

    if (data.success) {
      showToast("Rejected!", "success");
      closeModal();
      loadRequests();
    } else {
      showToast(data.error || "Failed", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

// -------------------------------
// FILTER TABLE
// -------------------------------
function filterTable() {
  const value = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#movementTable tbody tr");

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(value) ? "" : "none";
  });
}

// -------------------------------
// TOAST
// -------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `px-4 py-2 rounded shadow text-white mb-2 ${
    type === "success" ? "bg-green-600" : "bg-red-600"
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}