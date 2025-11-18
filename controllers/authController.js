const bcrypt = require("bcrypt");
const { db2 } = require("../db");
const crypto = require("crypto");

// ✅ LOGIN CONTROLLER
exports.login = async (req, res) => {
  const { usr_email, usr_pwd } = req.body;

  if (!usr_email || !usr_pwd)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    // 🔹 Fetch user and join with userlevels
    const [rows] = await db2.query(
      `
      SELECT 
        u.*, 
        l.userlevelname 
      FROM users u
      LEFT JOIN userlevels l ON u.userlevel = l.userlevelid
      WHERE u.usr_email = ?
      LIMIT 1
      `,
      [usr_email]
    );

    if (rows.length === 0) {
      console.log("❌ No user found for email:", usr_email);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];

    // 🔹 Compare MD5 hash
    const hashedInput = crypto.createHash("md5").update(usr_pwd).digest("hex");
    console.log("👉 Input password (plain):", usr_pwd);
    console.log("👉 Hashed input (MD5):", hashedInput);
    console.log("👉 DB password:", user.usr_pwd);

    if (hashedInput !== user.usr_pwd) {
      console.log("❌ Password mismatch!");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 🔹 Determine role based on userlevel
    let role = "user";
    if ([18, 37,-1].includes(user.userlevel)) role = "super_admin"; // -1 add back as super_admin
    else if ([13, 14, 17, 35].includes(user.userlevel)) role = "admin";

    // 🔹 Save session info
    req.session.user = {
      id: user.user_id,
      name: user.usr_name,
      email: user.usr_email,
      level: user.userlevel,
      levelname: user.userlevelname,
      dept: user.usr_dept,
      areaoffice: user.usr_areaoffice,
      role,
    };

    console.log("✅ Login successful:", req.session.user);

    return res.json({
      message: "✅ Login successful",
      user: req.session.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error." });
  }
};

// ✅ LOGOUT CONTROLLER
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Failed to logout" });
    res.clearCookie("connect.sid");
    res.json({ message: "✅ Logged out successfully" });
  });
};
