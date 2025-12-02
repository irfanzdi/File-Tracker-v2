const { db1 } = require("../db");

// ✅ CREATE LOCATION
exports.createLocation = async (req, res) => {
  console.log("📍 Incoming body:", req.body);
  console.log("👤 Session user:", req.session.user);

  const { location_name } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  if (!location_name) return res.status(400).json({ error: "Location name is required" });

  try {
    const [result] = await db1.query(
      `INSERT INTO locations (location_name) VALUES (?)`,
      [location_name]
    );

    console.log("✅ Inserted location:", result);

    res.json({
      success: true,
      location_id: result.insertId,
      location_name,
    });
  } catch (err) {
    console.error("❌ POST /api/locations error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ✅ GET ALL LOCATIONS
exports.getLocations = async (req, res) => {
  try {
    const [rows] = await db1.query(`
      SELECT location_id, location_name
      FROM locations
      ORDER BY location_id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /api/locations error:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

// ✅ GET LOCATION BY ID
exports.getLocationById = async (req, res) => {
  const { location_id } = req.params;
  try {
    const [rows] = await db1.query(
      `SELECT location_id, location_name FROM locations WHERE location_id = ?`,
      [location_id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Location not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ GET /api/locations/:id error:", err);
    res.status(500).json({ error: "Failed to fetch location" });
  }
};

// ✅ UPDATE LOCATION
exports.updateLocation = async (req, res) => {
  const { location_id } = req.params;
  const { location_name } = req.body;

  try {
    const [result] = await db1.query(
      `UPDATE locations SET location_name = ? WHERE location_id = ?`,
      [location_name, location_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Location not found" });

    res.json({ success: true, message: "Location updated successfully" });
  } catch (err) {
    console.error("❌ PUT /api/locations/:id error:", err);
    res.status(500).json({ error: "Failed to update location" });
  }
};

// ✅ DELETE LOCATION
exports.deleteLocation = async (req, res) => {
  const { location_id } = req.params;
  try {
    const [result] = await db1.query("DELETE FROM locations WHERE location_id = ?", [location_id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Location not found" });

    res.json({ success: true, message: "Location deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE /api/locations/:id error:", err);
    res.status(500).json({ error: "Failed to delete location" });
  }
};

// GET LOCATIONS WITH NESTED FOLDERS AND FILES
exports.getLocationsWithFolders = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });

    // 1️⃣ Get all locations
    const [locations] = await db1.query(
      "SELECT location_id, location_name FROM locations ORDER BY location_name ASC"
    );

    // 2️⃣ For each location, get folders
    for (const loc of locations) {
      let query = `
        SELECT 
          f.folder_id,
          f.folder_name,
          f.serial_num,
          d.department,
          u.usr_name AS created_by,
          f.created_at
        FROM folder f
        LEFT JOIN infracit_sharedb.tref_department d ON f.department_id = d.department_id
        LEFT JOIN infracit_sharedb.users u ON f.user_id = u.user_id
        WHERE f.location_id = ?
      `;
      const params = [loc.location_id];

      // Restrict staff to their department
      if (sessionUser.role === "staff") {
        query += " AND f.department_id = ?";
        params.push(sessionUser.dept || sessionUser.usr_dept);
      }

      query += " ORDER BY f.folder_id DESC";

      const [folders] = await db1.query(query, params);

      // Add files to each folder
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

      loc.folders = folders; // attach folders to location
    }

    res.json(locations);

  } catch (err) {
    console.error("Error fetching locations with folders:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};