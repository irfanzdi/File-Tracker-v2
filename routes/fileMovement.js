// routes/fileMovement.js
const express = require("express");
const router = express.Router();
const fileMovementController = require("../controllers/fileMovementController");

<<<<<<< HEAD
router.put("/:move_id/Approved", fileMovementController.approveMovement);


// ====================================
// 📌 GET ROUTES (specific first, general last)
// ====================================

// Get folders by department
router.get("/folders-by-department", fileMovementController.getFoldersByDepartment);

// Get pending movements
router.get("/pending", fileMovementController.getPendingMovements);

// Get specific movement by ID
=======
// -------------------------------
// Department-related routes
// -------------------------------
router.get("/files/my-department", fileMovementController.getFilesByDepartment);
router.get("/folders-by-department", fileMovementController.getFoldersByDepartment);

// -------------------------------
// Movement-specific routes
// -------------------------------
// Pending movements
router.get("/pending", fileMovementController.getPendingMovements);

// Create new movement
router.post("/", fileMovementController.createFileMovement);

// Special actions (approve, reject, take, return) MUST come BEFORE generic :move_id
router.put("/approve/:move_id", fileMovementController.approveMovement);
router.put("/reject/:move_id", fileMovementController.rejectMovement);
router.put("/take/:move_id", fileMovementController.takeOutFile);
router.put("/return/:move_id", fileMovementController.returnFile);

// -------------------------------
// Generic CRUD routes for a specific movement
// -------------------------------
router.get("/", fileMovementController.getFileMovements);
>>>>>>> 3d84e66d12b04fb5b2397d84ff2ae64029dc490f
router.get("/:move_id", fileMovementController.getFileMovementById);

// Get ALL movements (THIS is what your frontend needs)
router.get("/", fileMovementController.getFileMovements);

// ====================================
// 📌 POST/PUT/DELETE ROUTES
// ====================================

// Create new movement
router.post("/", fileMovementController.createFileMovement);

// Update movement
router.put("/:move_id", fileMovementController.updateFileMovement);

// Delete movement
router.delete("/:move_id", fileMovementController.deleteFileMovement);

// Approve movement
router.put("/:move_id/Approved", fileMovementController.approveMovement);



// Reject movement
router.put("/:move_id/reject", fileMovementController.rejectMovement);

// Take out file
router.put("/:move_id/take-out", fileMovementController.takeOutFile);

// Return file
router.put("/:move_id/return", fileMovementController.returnFile);

module.exports = router;