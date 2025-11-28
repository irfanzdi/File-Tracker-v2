let currentMoveId = null;

// -------------------------------
// LOAD PAGE
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadRequests();
  loadFileMovements();
  document.getElementById("searchInput")?.addEventListener("keyup", filterTable);
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    if (confirm("Logout?")) fetch("/api/auth/logout").then(() => location.href = "/login.html");
  });
});

// -------------------------------
// LOAD PENDING REQUESTS
// -------------------------------
async function loadRequests() {
  const tbody = document.querySelector("#movementTable tbody");
  const noRequests = document.getElementById("noRequests");
  try {
    const res = await fetch("/api/file_movement/pending", { credentials: "include" });
    const data = await res.json();

    tbody.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      noRequests.classList.remove("hidden");
      return;
    }

    noRequests.classList.add("hidden");

    data.forEach(r => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 cursor-pointer";
      tr.innerHTML = `
        <td class="px-3 py-2">${r.move_id}</td>
        <td class="px-3 py-2">${r.moved_by_name || "-"}</td>
        <td class="px-3 py-2">${r.move_type || "-"}</td>
        <td class="px-3 py-2">${r.move_date ? new Date(r.move_date).toLocaleString() : "-"}</td>
        <td class="px-3 py-2 text-xs">${Array.isArray(r.files) ? r.files.map(f => f.file_name).join(", ") : "-"}</td>
        <td class="px-3 py-2 text-center">
          <button onclick="event.stopPropagation(); openDetails(${r.move_id})" class="text-blue-600 hover:underline text-xs">View</button>
        </td>`;
      tbody.appendChild(tr);
    });

  } catch (err) { console.error(err); showToast("Failed to load requests", "error"); }
}

// -------------------------------
// OPEN MODAL
// -------------------------------
// OPEN MODAL
function openDetails(move_id) {
  currentMoveId = move_id;

  const modal = document.getElementById("viewModal");
  modal.classList.add("show");      // ✅ needed for CSS animation
  modal.classList.remove("hidden");

  // fetch data and populate modal
  fetch(`/api/file_movement/${move_id}`, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      document.getElementById("d_user").textContent = data.moved_by_name ?? "-";
      document.getElementById("d_type").textContent = data.move_type ?? "-";
      document.getElementById("d_date").textContent = data.move_date ? new Date(data.move_date).toLocaleString() : "-";
      document.getElementById("d_remark").textContent = data.remark ?? "-";

      const listEl = document.getElementById("d_files");
      listEl.innerHTML = "";
      if (Array.isArray(data.files) && data.files.length) {
        data.files.forEach(f => {
          const li = document.createElement("li");
          li.textContent = f.file_name ?? f.file_id ?? "-";
          listEl.appendChild(li);
        });
      } else listEl.innerHTML = "<li>No files</li>";
    })
    .catch(err => console.error(err));
}

// CLOSE MODAL
function closeModal() {
  const modal = document.getElementById("viewModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 300); // wait for animation
}


// -------------------------------
// APPROVE / REJECT
// -------------------------------
async function approveRequest() {
  if (!currentMoveId || !confirm("Approve this request?")) return;
  const res = await fetch(`/api/file_movement/approve/${currentMoveId}`, { method: "PUT" });
  const data = await res.json();
  if (data.success) { showToast("Approved!", "success"); closeModal(); loadRequests(); }
  else showToast(data.error || "Failed", "error");
}

async function rejectRequest() {
  if (!currentMoveId || !confirm("Reject this request?")) return;
  const res = await fetch(`/api/file_movement/reject/${currentMoveId}`, { method: "PUT" });
  const data = await res.json();
  if (data.success) { showToast("Rejected!", "success"); closeModal(); loadRequests(); }
  else showToast(data.error || "Failed", "error");
}

// -------------------------------
// FILTER TABLE
// -------------------------------
function filterTable() {
  const value = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll("#movementTable tbody tr").forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(value) ? "" : "none";
  });
}

// -------------------------------
// TOAST
// -------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `px-4 py-2 rounded shadow text-white mb-2 ${type === "success" ? "bg-green-600" : "bg-red-600"}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadFileMovements() {
  try {
    const res = await fetch("/api/file_movement", { credentials: "include" });
    const movements = await res.json();

    renderTable(movements);
  } catch (err) {
    console.error("Error loading movements:", err);
  }
}


function renderTable(movements) {
  const tbody = document.querySelector("#fileTable tbody");
  const noFiles = document.querySelector("#noFiles");

  tbody.innerHTML = "";

  if (!movements.length) {
    noFiles.classList.remove("hidden");
    return;
  }

  noFiles.classList.add("hidden");

  movements.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="border px-4 py-2 text-center">${r.move_id}</td>
      <td class="border px-4 py-2">${r.move_type || "-"}</td>
      <td class="border px-4 py-2">${r.move_date ? new Date(r.move_date).toLocaleString() : "-"}</td>
      <td class="border px-4 py-2">${r.user_name || "-"}</td>
      <td class="border px-4 py-2">${r.approved_by_name|| "-"}</td>
      <td class="border px-4 py-2">${r.approved_at ? new Date(r.move_date).toLocaleString() : "-"}</td>
      <td class="border px-4 py-2">${r.taken_at || "-"}</td>
      <td class="border px-4 py-2">${r.return_at || "-"}</td>
      <td class="border px-4 py-2">${r.remark || "-"}</td>
      <td class="border px-4 py-2">${r.status_name || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}