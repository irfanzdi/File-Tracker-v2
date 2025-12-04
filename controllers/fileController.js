const { db1 } = require("../db");
const QRCode = require("qrcode");

// =========================
// GET all files (or by folder_id)
// =========================
exports.getAllFiles = async (req, res) => {
  try {
    const query = `
        SELECT 
          fm.move_id,
          fm.user_id,
          u.usr_name AS user_name,
          fm.move_date,
          fm.status_id,
          fm.approved_at,
          a.usr_name AS approved_by_name,

          JSON_ARRAYAGG(
            JSON_OBJECT(
              'file_name', fl.file_name
            )
          ) AS files
          
        FROM file_movement fm
        LEFT JOIN infracit_sharedb.users u ON u.user_id = fm.user_id
        LEFT JOIN infracit_sharedb.users a ON a.user_id = fm.approve_by
        LEFT JOIN file_movement_files f ON f.move_id = fm.move_id
        LEFT JOIN file fl ON fl.file_id = f.file_id   

        GROUP BY fm.move_id
        ORDER BY fm.move_id DESC;
      `;


    const [rows] = await db1.query(query);
    res.json(rows);

  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ message: "Failed to load file movements" });
  }
};

// =========================
// GET file list with folder details
// =========================
exports.getFileList = async (req, res) => {
  try {
    // First, let's see what we get WITHOUT filtering
    const debugQuery = `
      SELECT DISTINCT
        f.file_id,
        f.file_name,
        ff.folder_id,
        fo.folder_name,
        fo.department_id,
        fo.serial_num,
        fo.location_id
      FROM file f
      INNER JOIN folder_files ff ON f.file_id = ff.file_id
      INNER JOIN folder fo ON ff.folder_id = fo.folder_id
      LIMIT 5
    `;
    
    const [debugRows] = await db1.execute(debugQuery);
    console.log("🔍 DEBUG - Sample files WITH folders:", JSON.stringify(debugRows, null, 2));

    // Now the full query with status
    const query = `
      SELECT DISTINCT
        f.file_id,
        f.file_name,
        ff.folder_id,
        fo.folder_name,
        fo.department_id,
        fo.serial_num,
        fo.location_id,
        
        -- Get the latest file movement status
        (
          SELECT fm.status_id 
          FROM file_movement_files fmf
          JOIN file_movement fm ON fmf.move_id = fm.move_id
          WHERE fmf.file_id = f.file_id
          ORDER BY fm.move_date DESC, fm.move_id DESC
          LIMIT 1
        ) AS current_status_id

      FROM file f
      INNER JOIN folder_files ff ON f.file_id = ff.file_id
      INNER JOIN folder fo ON ff.folder_id = fo.folder_id
      ORDER BY f.file_id DESC
    `;
    
    const [rows] = await db1.execute(query);
    
    console.log("📁 Total files returned:", rows.length);
    if (rows.length > 0) {
      console.log("📁 First file:", JSON.stringify(rows[0], null, 2));
    }
    
    res.json(rows);
  } catch (err) {
    console.error("❌ Error in getFileList:", err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.getFilesForExisting = async (req, res) => {
  try {
    // Example: get only files that are not yet assigned to a folder
    const [files] = await db1.query(
      "SELECT * FROM file WHERE folder_id IS NULL"
    );
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};



// =========================
// GET file by ID
// =========================
exports.getFileById = async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db1.query(`
      SELECT 
        f.file_id,
        f.file_name,
        f.uploaded_at,
        u.usr_name AS created_by,
        fo.folder_name
      FROM file f
      LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
      LEFT JOIN folder_files ff ON f.file_id = ff.file_id
      LEFT JOIN folder fo ON ff.folder_id = fo.folder_id
      WHERE f.file_id = ?
    `, [id]);

    if (!results.length) return res.status(404).json({ message: "File not found" });
    res.json(results[0]);
  } catch (err) {
    console.error("❌ Error fetching file by ID:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// CREATE file (folder required)
// =========================
exports.createFile = async (req, res) => {
  const { file_name, folder_id } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  if (!file_name) return res.status(400).json({ error: "file_name is required" });
  if (!folder_id) return res.status(400).json({ error: "folder_id is required" });

  const connection = await db1.getConnection();
  try {
    await connection.beginTransaction();

    // Insert into file table
const [result] = await connection.query(
  "INSERT INTO file (file_name, uploaded_at, user_id) VALUES (?, NOW(), ?)",
  [file_name, sessionUser.id]  
);
const fileId = result.insertId;

    // Insert into folder_files table
    await connection.query(
      "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
      [folder_id, fileId]
    );

    await connection.commit();

    res.status(201).json({
      message: "✅ File created and assigned to folder successfully",
      file_id: fileId,
      created_by: sessionUser.name,
      folder_id,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error creating file:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// =========================
// UPDATE file (name + folder)
// =========================
exports.updateFile = async (req, res) => {
  const { id } = req.params;
  const { file_name, folder_id } = req.body;

  if (!file_name) return res.status(400).json({ error: "file_name is required" });

  const connection = await db1.getConnection();
  try {
    await connection.beginTransaction();

    // Update file name
    await connection.query("UPDATE file SET file_name = ? WHERE file_id = ?", [file_name, id]);

    // Update folder assignment if provided
    if (folder_id !== undefined) {
      // Remove old mapping
      await connection.query("DELETE FROM folder_files WHERE file_id = ?", [id]);
      if (folder_id) {
        await connection.query(
          "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
          [folder_id, id]
        );
      }
    }

    await connection.commit();
    res.json({ message: "✅ File updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error updating file:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// =========================
// TOGGLE file active status
// =========================
exports.toggleFileStatus = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // expected: 1 (activate) or 0 (deactivate)

  if (active !== 0 && active !== 1) 
    return res.status(400).json({ error: "active must be 0 or 1" });

  try {
    const [result] = await db1.query(
      "UPDATE file SET active = ? WHERE file_id = ?",
      [active, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "File not found" });

    res.json({ message: `File ${active ? "activated" : "deactivated"} successfully` });
  } catch (err) {
    console.error("❌ Error updating file status:", err);
    res.status(500).json({ error: err.message });
  }
};


// =========================
// GET file QR code
// =========================
exports.getFileQRCode = async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db1.query("SELECT * FROM file WHERE file_id = ?", [id]);
    if (!results.length) return res.status(404).json({ message: "File not found" });

    const file = results[0];
    const qrData = `File ID: ${file.file_id}\nName: ${file.file_name}`;
    const qrCodeImage = await QRCode.toDataURL(qrData);

    res.json({ file_id: file.file_id, qrCode: qrCodeImage });
  } catch (err) {
    console.error("❌ Error generating QR code:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// ASSIGN file to folder (existing file)
// =========================
exports.assignFileToFolder = async (req, res) => {
  const { file_id, folder_id } = req.body;
  if (!file_id || !folder_id) return res.status(400).json({ error: "file_id and folder_id are required" });

  try {
    // Prevent duplicate assignment
    const [exists] = await db1.query(
      "SELECT * FROM folder_files WHERE file_id = ? AND folder_id = ?",
      [file_id, folder_id]
    );
    if (exists.length) return res.status(400).json({ message: "File already assigned to this folder" });

    await db1.query("INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)", [folder_id, file_id]);
    res.json({ message: "✅ File assigned to folder successfully" });
  } catch (err) {
    console.error("❌ Error assigning file:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// SEARCH files (by name, include folder & creator)
// =========================
exports.searchFiles = async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: "keyword query parameter is required" });

  try {
    const [results] = await db1.query(`
      SELECT f.file_id, f.file_name, f.uploaded_at, u.usr_name AS created_by, fo.folder_name
      FROM file f
      LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
      LEFT JOIN folder_files ff ON f.file_id = ff.file_id
      LEFT JOIN folder fo ON ff.folder_id = fo.folder_id
      WHERE f.file_name LIKE ?
      ORDER BY f.file_id DESC
    `, [`%${keyword}%`]);

    res.json(results);
  } catch (err) {
    console.error("❌ Error searching files:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.createExisting = async (req, res) => {
  const { file_id, folder_id } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  if (!file_id) return res.status(400).json({ error: "file_id is required" });
  if (!folder_id) return res.status(400).json({ error: "folder_id is required" });

  const connection = await db1.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Update folder_id in file table
    await connection.query(
      "UPDATE file SET folder_id = ? WHERE file_id = ?",
      [folder_id, file_id]
    );

    // 2️⃣ Insert into folder_files table
    await connection.query(
      "INSERT INTO folder_files (folder_id, file_id) VALUES (?, ?)",
      [folder_id, file_id]
    );

    await connection.commit();

    res.status(200).json({
      message: "✅ Existing file assigned to folder successfully",
      file_id,
      folder_id,
      updated_by: sessionUser.name,
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error assigning existing file:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

exports.unlinkFileFromFolder = async (req, res) => {
  const { fileId } = req.params;
  try {
    // 1️⃣ Update file table
    await db1.query("UPDATE file SET folder_id = NULL WHERE file_id = ?", [fileId]);

    // 2️⃣ Remove from folder_files mapping table
    await db1.query("DELETE FROM folder_files WHERE file_id = ?", [fileId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unlink file from folder" });
  }
};

// =========================
// SEARCH folders (by name)
// =========================
exports.searchFolders = async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: "keyword query parameter is required" });

  try {
    const [results] = await db1.query(`
      SELECT folder_id, folder_name
      FROM folder
      WHERE folder_name LIKE ?
      ORDER BY folder_id DESC
    `, [`%${keyword}%`]);

    res.json(results);
  } catch (err) {
    console.error("❌ Error searching folders:", err);
    res.status(500).json({ error: err.message });
  }
};
