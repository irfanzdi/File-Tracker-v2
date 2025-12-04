
// =====================================
// CREATE FOLDER — REFACTORED
// =====================================
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { db1, db2 } = require("../db");

async function generateFolderQRUrl(folder_id) {
  // 1️⃣ Build URL
  const baseUrl = "http://localhost:5000/folder-view.html"; // replace 3000 with your actual port
  const folderUrl = `${baseUrl}?id=${folder_id}`;

  console.log("[QR CREATE] QR URL:", folderUrl);

  // 2️⃣ Ensure QR folder exists
  const qrDir = path.join(__dirname, "../public/qrcodes");
  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

  // 3️⃣ Generate unique filename
  const qrFilename = `folder_${folder_id}_${Date.now()}.png`;
  const qrPath = path.join(qrDir, qrFilename);

  // 4️⃣ Generate QR code
  await QRCode.toFile(qrPath, folderUrl, {
    type: "png",
    width: 400,
    margin: 4,
    errorCorrectionLevel: "H"
  });

  // 5️⃣ Return public URL
  return `/qrcodes/${qrFilename}`;
}




exports.createFolder = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });

    const { folder_name, department_id, location_id, file_ids = [] } = req.body;

    if (!folder_name) return res.status(400).json({ error: "Folder name is required" });
    if (!location_id) return res.status(400).json({ error: "Location ID is required" });

    // 🔹 Determine department
    let finalDepartmentId = department_id;
    if (sessionUser.userlevel === 3) { // staff
      finalDepartmentId = sessionUser.usr_dept;
    } else if (!department_id) {
      return res.status(400).json({ error: "Department ID is required for non-staff users" });
    }

    // 🔹 Get department and location names
    const [[dept]] = await db2.query(
      "SELECT department FROM tref_department WHERE department_id = ?",
      [finalDepartmentId]
    );
    const [[loc]] = await db1.query(
      "SELECT location_name FROM locations WHERE location_id = ?",
      [location_id]
    );

    const departmentName = dept ? dept.department : "N/A";
    const locationName = loc ? loc.location_name : "N/A";

    // 🔹 Generate serial number: SGV/2025/DEP/001
    const deptInitials = departmentName.substring(0, 3).toUpperCase();
    const [last] = await db1.query(
      "SELECT MAX(folder_id) AS max_id FROM folder WHERE department_id = ?",
      [finalDepartmentId]
    );
    const nextId = (last[0].max_id || 0) + 1;
    const year = new Date().getFullYear();
    const serial_num = `SGV/${year}/${deptInitials}/${String(nextId).padStart(3, "0")}`;

    // 🔹 Insert folder
    const [insertResult] = await db1.query(
      `INSERT INTO folder 
        (folder_name, serial_num, department_id, location_id, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [folder_name, serial_num, finalDepartmentId, location_id, sessionUser.id]
    );
    const folder_id = insertResult.insertId;

    // 🔹 Link files if any
    if (Array.isArray(file_ids) && file_ids.length > 0) {
      for (const fid of file_ids) {
        await db1.query(
          "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
          [folder_id, fid]
        );
      }
    }

    // 🔹 Get file names for QR
    let fileNames = "No files";
    if (file_ids.length > 0) {
      const [files] = await db1.query(
        "SELECT file_name FROM file WHERE file_id IN (?)",
        [file_ids]
      );
      if (files.length > 0) fileNames = files.map(f => f.file_name).join(", ");
    }

    // 🔹 Generate QR text (single-line)
    const qrText = [
        `Serial:${serial_num}`,
        `Folder:${folder_name}`,
        `Dept:${departmentName}`,
        `Location:${locationName}`,
        `Files:${fileNames}`
      ].join('|').trim();
    console.log("[QR CREATE] QR Text:", qrText);

    // 🔹 Generate QR file
    const qrDir = path.join(__dirname, "../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFilename = `folder_${Date.now()}.png`;
    const qrPath = path.join(qrDir, qrFilename);

    await QRCode.toFile(qrPath, qrText, {
      type: "png",
      width: 400,
      margin: 4,
      errorCorrectionLevel: "H"
    });

    const qr_code = await generateFolderQRUrl(folder_id);
    await db1.query("UPDATE folder SET qr_code = ? WHERE folder_id = ?", [qr_code, folder_id]);

    // 🔹 Return folder info
    res.status(201).json({
      folder_id,
      serial_num,
      folder_name,
      department: departmentName,
      location_name: locationName,
      created_at: new Date(),
      user_id: sessionUser.id,
      files_inside: file_ids.length ? file_ids.join(", ") : "No files",
      qr_code
    });

  } catch (err) {
    console.error("❌ Error creating folder:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// =====================================
// VIEW FOLDER PAGE (standalone)
// =====================================
exports.viewFolderPage = async (req, res) => {
  const { folder_id } = req.params;

  try {
    // Get folder info
    const [[folder]] = await db1.query(
      `SELECT f.folder_id, f.folder_name, f.serial_num, f.qr_code,
              f.created_at, f.department_id, f.location_id,
              d.department, l.location_name, u.usr_name AS created_by
       FROM folder f
       LEFT JOIN infracit_sharedb.tref_department d ON f.department_id = d.department_id
       LEFT JOIN locations l ON f.location_id = l.location_id
       LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
       WHERE f.folder_id = ?`,
      [folder_id]
    );

    if (!folder) return res.status(404).send("Folder not found");

    // Get files inside folder
const [files] = await db1.query(`
  SELECT f.file_id, f.file_name, fol.folder_name
  FROM file_movement_files m
  JOIN file f ON f.file_id = m.file_id
  LEFT JOIN folder_files ff ON ff.file_id = f.file_id
  LEFT JOIN folder fol ON fol.folder_id = ff.folder_id
  WHERE m.move_id = ?
`, [r.move_id]);


    folder.files_inside = files;

    // Render a static HTML page (or send JSON for frontend to render)
    res.sendFile(path.join(__dirname, "../public/folder-view.html"));
    
  } catch (err) {
    console.error("Error loading folder view page:", err);
    res.status(500).send("Server error");
  }
};



// =====================================
// GET ALL FOLDERS
// =====================================
exports.getFolder = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });

    let query = `
      SELECT 
        f.folder_id,
        f.folder_name,
        f.serial_num,
        f.created_at,
        f.department_id,
        f.location_id,
        d.department,
        l.location_name,
        u.usr_name AS created_by
      FROM folder f
      LEFT JOIN infracit_sharedb.tref_department d ON f.department_id = d.department_id
      LEFT JOIN locations l ON f.location_id = l.location_id
      LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
    `;

    const params = [];

    // Only restrict staff by department
    if (sessionUser.role === "staff") {
      query += " WHERE f.department_id = ?";
      params.push(sessionUser.dept); // assuming dept is department_id
    }

    query += " ORDER BY f.folder_id DESC";

    const [folders] = await db1.query(query, params);

    // Add files inside each folder
    for (const folder of folders) {
      const [files] = await db1.query(
        `SELECT fi.file_id, fi.file_name
         FROM folder_files ff
         JOIN file fi ON fi.file_id = ff.file_id
         WHERE ff.folder_id = ?`,
        [folder.folder_id]
      );
      folder.files_inside = files.map(f => f.file_name);
      folder.file_ids = files.map(f => f.file_id);
    }

    res.json(folders);

  } catch (err) {
    console.error("❌ Error fetching folders:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};




// =====================================
// ✅ SINGLE — GET FOLDER BY ID
// =====================================
exports.getFolderById = async (req, res) => {
  const { folder_id } = req.params;
  try {
    const [[folder]] = await db1.query(
      `SELECT f.folder_id, f.folder_name, f.serial_num, f.qr_code,
              f.created_at, f.department_id, f.location_id, 
              d.department, l.location_name, u.usr_name AS created_by
       FROM folder f
       LEFT JOIN infracit_sharedb.tref_department d ON f.department_id = d.department_id
       LEFT JOIN locations l ON f.location_id = l.location_id
       LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
       WHERE f.folder_id = ?`,
      [folder_id]
    );

    if (!folder) return res.status(404).json({ error: "Folder not found" });

    const [files] = await db1.query(
      `SELECT fi.file_id, fi.file_name 
         FROM folder_files ff
         JOIN file fi ON fi.file_id = ff.file_id
         WHERE ff.folder_id = ?`,
      [folder_id]
    );

    folder.files_inside = files.map(f => f.file_name);
    folder.file_ids = files.map(f => f.file_id);

    res.json(folder);
  } catch (err) {
    console.error("Error fetching folder details:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// =====================================
// UPDATE FOLDER
// =====================================
exports.updateFolder = async (req, res) => {
  try {
    const { folder_id } = req.params;
    const { folder_name, department_id, location_id } = req.body;

    // Load existing folder
    const [[existing]] = await db1.query("SELECT qr_code FROM folder WHERE folder_id=?", [folder_id]);
    if (!existing) return res.status(404).json({ error: "Folder not found" });

    // Update folder info
    await db1.query(
      "UPDATE folder SET folder_name=?, department_id=?, location_id=?, updated_at=NOW() WHERE folder_id=?",
      [folder_name, department_id, location_id, folder_id]
    );

    res.json({
      message: "Folder updated successfully",
      folder_id,
      folder_name,
      department_id,
      location_id,
      qr_code: existing.qr_code
    });

  } catch (err) {
    console.error("❌ Error updating folder:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// =====================================
// DELETE FOLDER
// =====================================
exports.deleteFolder = async (req, res) => {
  try {
    const { folder_id } = req.params;

    const [result] = await db1.query("DELETE FROM folder WHERE folder_id = ?", [folder_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.json({ message: "Folder deleted successfully" });
  } catch (err) {
    console.error("Error deleting folder:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// =====================================
// GET LATEST FOLDER (for Adminpage.js)
// =====================================
exports.getLatestFolder = async (req, res) => {
  try {
    const [rows] = await db1.query(`
      SELECT 
        f.folder_id,
        f.folder_name AS folder_title,
        f.serial_num AS serial_number,
        f.qr_code,
        f.created_at,
        u.usr_name AS created_by,
        d.department AS department,
        l.location_name AS location
      FROM folder f
      LEFT JOIN infracit_sharedb.tref_department d ON f.department_id = d.department_id
      LEFT JOIN locations l ON f.location_id = l.location_id
      LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
      ORDER BY f.folder_id DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No folder found" });
    }

    const folder = rows[0];

    // 🔹 Get files inside this folder
    const [files] = await db1.query(
      `SELECT fi.file_name 
       FROM folder_files ff
       JOIN file fi ON fi.file_id = ff.file_id
       WHERE ff.folder_id = ?`,
      [folder.folder_id]
    );

    folder.files_inside = files.map(f => f.file_name);

    res.json(folder);
  } catch (err) {
    console.error("❌ Error fetching latest folder:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
