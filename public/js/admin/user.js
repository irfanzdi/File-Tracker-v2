async function loadUsers() {
  try {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to fetch users");

    const users = await res.json();
    console.log("✅ Users fetched:", users); // Debug check

    const tbody = document.querySelector("#usersTable tbody");
    const noUsers = document.querySelector("#noUsers");

    tbody.innerHTML = "";

    // If empty
    if (!users || users.length === 0) {
      noUsers.classList.remove("hidden");
      return;
    }
    noUsers.classList.add("hidden");

    // Render users
    users.forEach(u => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="border px-4 py-2 text-center">${u.user_id}</td>
        <td class="border px-4 py-2">${u.usr_name || "-"}</td>
        <td class="border px-4 py-2">${u.usr_email || "-"}</td>
        <td class="border px-4 py-2">${u.role || "-"}</td>
        <td class="border px-4 py-2">${u.department || "-"}</td>
        <td class="border px-4 py-2">${u.area_office || "-"}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error loading users:", err);
  }
}

function filterUsers() {
  const q = document.getElementById("usersSearch").value.trim().toLowerCase();
  const rows = document.querySelectorAll("#usersTable tbody tr");
  let anyVisible = false;

  rows.forEach(row => {
    // "Name" is 2nd column → index 1
    const nameCell = row.children[1];
    const nameText = (nameCell?.textContent || "").trim().toLowerCase();

    // Check full word or partial match
    const show = q === "" || nameText.includes(q);

    row.style.display = show ? "" : "none";
    if (show) anyVisible = true;
  });

  document.getElementById("noUsers").classList.toggle("hidden", anyVisible);
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

document.addEventListener("DOMContentLoaded", loadUsers);
