document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usr_email = document.getElementById("usr_email").value.trim();
    const usr_pwd = document.getElementById("usr_pwd").value.trim();

    if (!usr_email || !usr_pwd) {
      errorMessage.textContent = "Email and password are required.";
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr_email, usr_pwd }),
        credentials: "include", // keeps session cookies
      });

      const data = await res.json();

      if (!res.ok) {
        errorMessage.textContent = data.error || "Invalid email or password.";
        return;
      }

      // ✅ Redirect based on user role
      const role = data.user?.role;
      if (role === "super_admin" || role === "admin") {
        window.location.href = "/html/admin/Adminpage.html";
      } else {
        window.location.href = "/html/user/homepage.html";
      }

    } catch (err) {
      console.error("Login error:", err);
      errorMessage.textContent = "Server error. Please try again later.";
    }
  });
});
