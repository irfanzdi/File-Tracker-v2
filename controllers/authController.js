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
    const [rows] = await db2.query(`
      SELECT 
        u.*, 
        l.userlevelname,
        d.department AS department_name
      FROM users u
      LEFT JOIN userlevels l ON u.userlevel = l.userlevelid
      LEFT JOIN tref_department d ON u.usr_dept = d.department_id
      WHERE u.usr_email = ?
      LIMIT 1
    `, [usr_email]);

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
<<<<<<< Updated upstream
    let role = "staff";
    if ([].includes(user.userlevel)) role = "super_admin";
    else if ([-1,2,11,12,28,36].includes(user.userlevel)) role = "admin";
    else if ([13,14,25,35].includes(user.userlevel)) role = "HR";
    
=======
    let role = "user";
    if ([18].includes(user.userlevel)) role = "super_admin";
    else if ([2].includes(user.userlevel)) role = "admin";
    else if ([-1,1].includes(user.userlevel)) role = "staff";
    else if ([13].includes(user.userlevel)) role = "HR";
>>>>>>> Stashed changes

    // 🔹 Save session info
    req.session.user = {
      id: user.user_id,
      name: user.usr_name,
      email: user.usr_email,
      level: user.userlevel,
      levelname: user.userlevelname,
      dept: user.usr_dept,
      department: user.department_name,
      areaoffice: user.usr_areaoffice,
      department_id: user.usr_dept,    
      department_name: user.department_name,
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

// ✅ GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  if (req.session && req.session.user) {
    // 🔥 Fetch department name
    let departmentName = null;
    if (req.session.user.dept) {
      try {
        const { db2 } = require("../db");
        const [[dept]] = await db2.query(
          "SELECT department FROM tref_department WHERE department_id = ?",
          [req.session.user.dept]
        );
        departmentName = dept ? dept.department : null;
      } catch (e) {
        console.error("Error fetching department name:", e);
      }
    }

    return res.json({
      user_id: req.session.user.id,
      name: req.session.user.name,
      email: req.session.user.email,
      role: req.session.user.role,
      level: req.session.user.level,
      levelname: req.session.user.levelname,
      dept: req.session.user.dept,
      department_name: departmentName,  // 🔥 Add this
      areaoffice: req.session.user.areaoffice
    });
  }
  
  return res.status(401).json({ error: 'Not authenticated' });
};