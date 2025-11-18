// routes/fileMovement.js
const express = require("express");
const router = express.Router();
const fileMovementController = require("../controllers/fileMovementController");

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
router.get("/:move_id", fileMovementController.getFileMovementById);
router.put("/:move_id", fileMovementController.updateFileMovement);
router.delete("/:move_id", fileMovementController.deleteFileMovement);

module.exports = router;
