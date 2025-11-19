const { db1, db2 } = require("../db");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

// =====================================
// CREATE FOLDER
// =====================================
exports.createFolder = async (req, res) => {
  console.log("📦 Incoming body:", req.body);
  const { folder_name, department_id, location_id, file_ids = [] } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  if (!folder_name) return res.status(400).json({ error: "Folder name is required" });

  try {
    // 🔹 Department from db2 (shared)
    const [[dept]] = await db2.query(
      "SELECT department FROM tref_department WHERE department_id = ?",
      [department_id]
    );
    const departmentName = dept ? dept.department : "N/A";

    // 🔹 Location from db1 (local)
    const [[loc]] = await db1.query(
      "SELECT location_name FROM locations WHERE location_id = ?",
      [location_id]
    );
    const locationName = loc ? loc.location_name : "N/A";

    // 🔹 Department initials for serial
    const deptInitials = departmentName
      ? departmentName.substring(0, 3).toUpperCase()
      : "DEP";

    // 🔹 Serial number format: SGV/2025/DEP/001
    const [last] = await db1.query("SELECT MAX(folder_id) AS max_id FROM folder");
    const nextId = (last[0].max_id || 0) + 1;
    const year = new Date().getFullYear();
    const serial_num = `SGV/${year}/${deptInitials}/${nextId}`;

    // 🔹 Insert folder
    const [insertResult] = await db1.query(
      `INSERT INTO folder (folder_name, serial_num, department_id, location_id, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [folder_name, serial_num, department_id, location_id, sessionUser.id]
    );
    const folder_id = insertResult.insertId;

    // 🔹 Insert linked files
    if (Array.isArray(file_ids) && file_ids.length > 0) {
      for (const fid of file_ids) {
        await db1.query(
          "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
          [folder_id, fid]
        );
      }
    }

    // 🔹 File names for QR
    let fileNames = "No files";
    if (file_ids.length > 0) {
      const [files] = await db1.query(
        `SELECT file_name FROM file WHERE file_id IN (?)`,
        [file_ids]
      );
      fileNames = files.map(f => f.file_name).join(", ");
    }

    // 🔹 Generate QR content
    const qrText = `
Serial Number: ${serial_num}
Folder Title: ${folder_name}
Department: ${departmentName}
Location: ${locationName}
Files: ${fileNames}
`;

    const qrDir = path.join(__dirname, "../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFilename = `folder_${Date.now()}.png`;
    const qrPath = path.join(qrDir, qrFilename);
    await QRCode.toFile(qrPath, qrText);
    const qr_code = `/qrcodes/${qrFilename}`;

    // 🔹 Save QR path
    await db1.query("UPDATE folder SET qr_code = ? WHERE folder_id = ?", [qr_code, folder_id]);

    res.json({
      folder_id,
      serial_num,
      folder_name,
      department: departmentName,
      location_name: locationName,
      created_at: new Date(),
      user_id: sessionUser.id,
      files_inside: fileNames,
      qr_code,
    });
  } catch (err) {
    console.error("❌ Error creating folder:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// =====================================
// GET ALL FOLDERS
// =====================================
exports.getFolder = async (req, res) => {
  try {
    const [folders] = await db1.query(`
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
      ORDER BY f.folder_id DESC
    `);

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
    const { folder_name, department_id, location_id, file_ids = [] } = req.body;

    // 1️⃣ Load existing folder to get serial & old QR
    const [[existing]] = await db1.query(
      "SELECT serial_num, qr_code FROM folder WHERE folder_id=?",
      [folder_id]
    );

    if (!existing) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const oldQr = existing.qr_code;

    // 2️⃣ Get updated department name
    const [[dept]] = await db2.query(
      "SELECT department FROM tref_department WHERE department_id=?",
      [department_id]
    );
    const departmentName = dept ? dept.department : "N/A";

    // 3️⃣ Get updated location name
    const [[loc]] = await db1.query(
      "SELECT location_name FROM locations WHERE location_id=?",
      [location_id]
    );
    const locationName = loc ? loc.location_name : "N/A";

    // 4️⃣ Update main folder table
    await db1.query(
      "UPDATE folder SET folder_name=?, department_id=?, location_id=?, updated_at=NOW() WHERE folder_id=?",
      [folder_name, department_id, location_id, folder_id]
    );

    // 5️⃣ Refresh folder files
    await db1.query("DELETE FROM folder_files WHERE folder_id=?", [folder_id]);
    for (const fid of file_ids) {
      await db1.query(
        "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
        [folder_id, fid]
      );
    }

    // 6️⃣ Load updated file names for QR
    let fileNames = "No files";
    if (file_ids.length > 0) {
      const [files] = await db1.query(
        `SELECT file_name FROM file WHERE file_id IN (?)`,
        [file_ids]
      );
      fileNames = files.map(f => f.file_name).join(", ");
    }

    // 7️⃣ Delete old QR file
    if (oldQr) {
      const oldQrPath = path.join(__dirname, "../public", oldQr);
      if (fs.existsSync(oldQrPath)) {
        fs.unlinkSync(oldQrPath);
      }
    }

    // 8️⃣ Build new QR content
    const qrText = `
Serial Number: ${existing.serial_num}
Folder Title: ${folder_name}
Department: ${departmentName}
Location: ${locationName}
Files: ${fileNames}
`;

    // 9️⃣ Generate new QR file
    const qrDir = path.join(__dirname, "../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFilename = `folder_${folder_id}_${Date.now()}.png`;
    const qrPath = path.join(qrDir, qrFilename);

    await QRCode.toFile(qrPath, qrText);

    const newQr = `/qrcodes/${qrFilename}`;

    // 🔟 Save new QR path
    await db1.query(
      "UPDATE folder SET qr_code=? WHERE folder_id=?",
      [newQr, folder_id]
    );

    res.json({
      message: "Folder updated successfully",
      qr_code: newQr,
    });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server error" });
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


