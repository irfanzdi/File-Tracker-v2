// controllers/fileMovementController.js
const { db1, db2 } = require("../db");


/* -----------------------------------------------------------
   Helper: Check Session
----------------------------------------------------------- */
function requireSession(req, res) {
  const user = req.session?.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

/* -----------------------------------------------------------
   Helper: Validate Files Based On User Department
----------------------------------------------------------- */
async function validateFilesInUserDepartment(files, userDept) {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, message: "At least one file must be selected." };
  }

  try {
    const placeholders = files.map(() => "?").join(",");
    const [rows] = await db1.query(
      `
      SELECT ff.file_id, ff.folder_id, f.department_id
      FROM folder_files ff
      JOIN folder f ON ff.folder_id = f.folder_id
      WHERE ff.file_id IN (${placeholders})
      `,
      files
    );

    const found = new Set(rows.map(r => Number(r.file_id)));
    const missing = files.filter(f => !found.has(Number(f)));
    if (missing.length > 0) {
      return { ok: false, message: `Invalid file(s): ${missing.join(", ")}` };
    }

    const wrong = rows.filter(r => Number(r.department_id) !== Number(userDept));
    if (wrong.length > 0) {
      const bad = [...new Set(wrong.map(r => r.file_id))];
      return { ok: false, message: `You are not allowed to request: ${bad.join(", ")}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/* -----------------------------------------------------------
   CREATE FILE MOVEMENT
----------------------------------------------------------- */
exports.createFileMovement = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  const { move_type, remark, folder_id, files } = req.body;
  const userDept = user.dept;                     // ← matches authController

  if (!userDept) {
    return res.status(400).json({ error: "User has no department assigned." });
  }

  const validation = await validateFilesInUserDepartment(files, userDept);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  let conn;
  try {
    conn = await db1.getConnection();
    await conn.beginTransaction();

    const [movement] = await conn.query(
      `INSERT INTO file_movement
       (move_type, move_date, move_time, taken_at, return_at, approved_at,
        status_id, remark, approve_by, user_id, folder_id)
       VALUES (?, CURDATE(), NULL, NULL, NULL, NULL, 1, ?, NULL, ?, ?)`,
      [move_type || "Take Out", remark || null, user.id, folder_id || null]
    );

    const moveId = movement.insertId;
    const fileSQL = `INSERT INTO file_movement_files (move_id, file_id) VALUES (?, ?)`;
    for (const fileId of files) {
      await conn.query(fileSQL, [moveId, fileId]);
    }

    await conn.commit();
    conn.release();

    res.json({ success: true, message: "Movement request submitted", move_id: moveId });
  } catch (err) {
    if (conn) { await conn.rollback(); conn.release(); }
    console.error("createFileMovement error:", err);
    res.status(500).json({ error: "Failed to create movement" });
  }
};

/* -----------------------------------------------------------
   GET FILES BY USER DEPARTMENT 
----------------------------------------------------------- */
exports.getFilesByDepartment = async (req, res) => {
  try {
    const user = requireSession(req, res);
    if (!user) return;

    const userDept = user.dept;                     // ← now matches session

    if (!userDept) {
      return res.status(400).json({ 
        error: "No department assigned",
        hint: "Please ask admin to assign a department."
      });
    }

    const [files] = await db1.query(
      `
      SELECT f.file_id, f.file_name, fol.folder_id, fol.folder_name
      FROM file f
      JOIN folder_files ff ON ff.file_id = f.file_id
      JOIN folder fol ON fol.folder_id = ff.folder_id
      WHERE fol.department_id = ?
      ORDER BY fol.folder_name, f.file_name
      `,
      [userDept]
    );

    res.json(files);
  } catch (err) {
    console.error("getFilesByDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------
   GET FOLDERS BY DEPARTMENT
----------------------------------------------------------- */
exports.getFoldersByDepartment = async (req, res) => {
  try {
    const user = requireSession(req, res);
    if (!user) return;

    const userDept = user.dept;

    if (!userDept) {
      return res.status(400).json({ error: "No department assigned" });
    }

    const [folders] = await db2.query(
      "SELECT folder_id, folder_name FROM folder WHERE department_id = ?",
      [userDept]
    );

    res.json(folders);
  } catch (err) {
    console.error("getFoldersByDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPendingMovements = async (req, res) => {
  const [rows] = await db1.query(`
    SELECT fm.move_id, fm.move_type, fm.move_date,
           u.usr_name AS moved_by_name
    FROM file_movement fm
    JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
    WHERE fm.status_id = 1
    ORDER BY fm.move_date DESC
  `);

  // Load files for each movement
  for (const r of rows) {
    const [files] = await db1.query(`
      SELECT f.file_name
      FROM file_movement_files mm
      JOIN file f ON f.file_id = mm.file_id
      WHERE mm.move_id = ?
    `, [r.move_id]);

    r.files = files;
  }

  res.json(rows);
};


// ====================================
// 📌 Get All File Movements (with user filter for non-admins)
// ====================================
exports.getFileMovements = async (req, res) => {
  try {
    console.log("🔍 getFileMovements called");

    // Get user from session (assumes you use requireSession elsewhere)
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let rows;
    // Only admin/super_admin can view ALL movements
    if (user.role === "admin" || user.role === "super_admin") {
      // Admin: show everything
      [rows] = await db1.query(`
        SELECT 
          fm.*,
          u.usr_name AS user_name,          -- requested by
          a.usr_name AS approved_by_name,   -- approver
          s.status_name
        FROM file_movement fm
        LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id 
        LEFT JOIN infracit_sharedb.users a ON a.user_id = fm.approve_by
        LEFT JOIN status s ON s.status_id = fm.status_id
        ORDER BY fm.move_id DESC
      `);
    } else {
      // Regular user: only show their own file movements
      [rows] = await db1.query(`
        SELECT 
          fm.*,
          u.usr_name AS user_name,
          a.usr_name AS approved_by_name,
          s.status_name
        FROM file_movement fm
        LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
        LEFT JOIN infracit_sharedb.users a ON a.user_id = fm.approve_by
        LEFT JOIN status s ON s.status_id = fm.status_id
        WHERE fm.user_id = ?
        ORDER BY fm.move_id DESC
      `, [user.id]);
    }

    console.log("📊 Query returned rows:", rows.length);

    // Fetch files with folder info for each movement
    for (const r of rows) {
      const [files] = await db1.query(`
        SELECT f.file_id, f.file_name, fol.folder_id, fol.folder_name
        FROM file_movement_files m
        JOIN file f ON f.file_id = m.file_id
        JOIN folder_files ff ON ff.file_id = f.file_id
        JOIN folder fol ON fol.folder_id = ff.folder_id
        WHERE m.move_id = ?
        ORDER BY fol.folder_name, f.file_name
      `, [r.move_id]);

      r.files = files; // attach files with folder info
    }

    console.log("✅ Sending response with", rows.length, "movements");
    res.json(rows);

  } catch (error) {
    console.error("💥 Error in getFileMovements:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};



// ====================================
// 📌 Get File Movement by ID
// ====================================
exports.getFileMovementById = async (req, res) => {
  try {
    const { move_id } = req.params;

    // Join both user (moved_by) and approver (approved_by), plus status
    const [rows] = await db1.query(`
      SELECT fm.*, 
             u.usr_name AS moved_by_name,
             a.usr_name AS approved_by_name,
             s.status_name
      FROM file_movement fm
      LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
      LEFT JOIN infracit_sharedb.users a ON a.user_id = fm.approve_by
      LEFT JOIN status s ON s.status_id = fm.status_id
      WHERE fm.move_id = ?
    `, [move_id]);

    if (rows.length === 0) 
      return res.status(404).json({ error: "File movement not found" });

    const movement = rows[0];

    // Fetch files with folder info
    const [files] = await db1.query(`
      SELECT f.file_id, f.file_name, fol.folder_id, fol.folder_name
      FROM file_movement_files mm
      JOIN file f ON f.file_id = mm.file_id
      JOIN folder_files ff ON ff.file_id = f.file_id
      JOIN folder fol ON fol.folder_id = ff.folder_id
      WHERE mm.move_id = ?
      ORDER BY fol.folder_name, f.file_name
    `, [move_id]);

    movement.files = files;

    res.json(movement);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};



// ====================================
// 📌 Update File Movement
// ====================================
exports.updateFileMovement = async (req, res) => {
  try {
    const { move_id } = req.params;
    const { file_id, from_department, to_department, moved_by } = req.body;

    const [result] = await db1.query(
      `UPDATE file_movements 
       SET file_id = ?, from_department = ?, to_department = ?, moved_by = ?
       WHERE move_id = ?`,
      [file_id, from_department, to_department, moved_by, move_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "File movement not found" });
    }

    res.json({ message: "File movement updated successfully" });
  } catch (error) {
    console.error("❌ Error updating file movement:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ====================================
// 📌 Delete File Movement
// ====================================
exports.deleteFileMovement = async (req, res) => {
  try {
    const { move_id } = req.params;

    const [result] = await db1.query(
      "DELETE FROM file_movements WHERE move_id = ?",
      [move_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "File movement not found" });
    }

    res.json({ message: "File movement deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting file movement:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.approveMovement = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  if (!["super_admin", "admin"].includes(user.role)) {
    return res.status(403).json({ error: "Only admin can approve" });
  }

  const { move_id } = req.params;

  const [result] = await db1.query(
    `UPDATE file_movement 
     SET status_id = 3, approve_by = ?, approved_at = NOW() 
     WHERE move_id = ?`,
    [user.id, move_id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: "Approved" });
};


// REJECT MOVEMENT
exports.rejectMovement = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  if (!["super_admin", "admin"].includes(user.role)) {
    return res.status(403).json({ error: "Only admin can reject" });
  }

  const { move_id } = req.params;

  const [result] = await db1.query(
    `UPDATE file_movement 
     SET status_id = 2, approve_by = ?, approved_at = NOW() 
     WHERE move_id = ?`,
    [user.id, move_id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: "Rejected" });
};


exports.takeOutFile = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  const { move_id } = req.params;

  const [check] = await db1.query(
    "SELECT status_id FROM file_movement WHERE move_id = ?",
    [move_id]
  );

  if (check.length === 0) return res.status(404).json({ error: "Movement not found" });
  if (check[0].status_id !== 3) return res.status(400).json({ error: "Only approved requests can be taken out" });

  const [result] = await db1.query(
    "UPDATE file_movement SET status_id = 5, taken_at = NOW() WHERE move_id = ?",
    [move_id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: "File taken out" });
};

exports.returnFile = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  const { move_id } = req.params;

  const [check] = await db1.query(
    "SELECT status_id FROM file_movement WHERE move_id = ?",
    [move_id]
  );

  if (check.length === 0) return res.status(404).json({ error: "Movement not found" });
  if (check[0].status_id !== 5) return res.status(400).json({ error: "Only taken out files can be returned" });

  const [result] = await db1.query(
    "UPDATE file_movement SET status_id = 4, return_at = NOW() WHERE move_id = ?",
    [move_id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: "File returned" });
};

exports.returnFile = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  if (user.role === "user") {
    return res.status(403).json({ error: "Not allowed to return file" });
  }

  const { move_id } = req.params;
  const [result] = await db1.query(
    `UPDATE file_movement SET status_id=5, return_at=NOW() WHERE move_id=?`,
    [move_id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: "File returned" });
};



// ====================================
// 📌 My Request
// ====================================
exports.getMyRequests = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  try {
    const [rows] = await db1.query(`
      SELECT 
        fm.*,
        u.usr_name AS user_name,
        a.usr_name AS approved_by_name,
        s.status_name
      FROM file_movement fm
      LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
      LEFT JOIN infracit_sharedb.users a ON a.user_id = fm.approve_by
      LEFT JOIN status s ON s.status_id = fm.status_id
      WHERE fm.user_id = ?  -- Only the logged-in user's requests
      ORDER BY fm.move_id DESC
    `, [user.id]);

    for (const r of rows) {
      const [files] = await db1.query(`
        SELECT f.file_id, f.file_name, fol.folder_id, fol.folder_name
        FROM file_movement_files m
        JOIN file f ON f.file_id = m.file_id
        JOIN folder_files ff ON ff.file_id = f.file_id
        JOIN folder fol ON fol.folder_id = ff.folder_id
        WHERE m.move_id = ?
        ORDER BY fol.folder_name, f.file_name
      `, [r.move_id]);

      r.files = files;
    }

    res.json(rows);

  } catch (err) {
    console.error("💥 Error fetching my requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



// ====================================
// 📌Notifications
// ====================================
exports.getMyNotifications = async (req, res) => {
  const user = requireSession(req, res);
  if (!user) return;

  try {
    const [rows] = await db1.query(`
      SELECT 
        fm.*,
        u.usr_name AS user_name
      FROM file_movement fm
      LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
      WHERE fm.user_id = ? AND fm.status_id IN (2, 3)  -- Only approved/rejected for this user
      ORDER BY fm.move_date DESC
    `, [user.id]);

    for (const r of rows) {
      const [files] = await db1.query(`
        SELECT f.file_id, f.file_name, fol.folder_id, fol.folder_name
        FROM file_movement_files m
        JOIN file f ON f.file_id = m.file_id
        JOIN folder_files ff ON ff.file_id = f.file_id
        JOIN folder fol ON fol.folder_id = ff.folder_id
        WHERE m.move_id = ?
        ORDER BY fol.folder_name, f.file_name
      `, [r.move_id]);

      r.files = files;
    }

    res.json(rows);

  } catch (err) {
    console.error("💥 Error fetching notifications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
