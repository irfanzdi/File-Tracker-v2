const express = require("express");
const router = express.Router();
const fileMovementController = require("../controllers/fileMovementController");

// -------------------------------------
// APPROVE (two versions kept exactly as you had)
// -------------------------------------
router.put("/:move_id/Approved", fileMovementController.approveMovement);


// ====================================
// 📌 GET ROUTES (specific first, general last)
// ====================================

// Check for duplicate requests (MUST be before /:move_id)
router.get("/check-duplicate", fileMovementController.checkDuplicateRequest);

// Get folders by department
router.get("/folders-by-department", fileMovementController.getFoldersByDepartment);

// Get pending movements
router.get("/pending", fileMovementController.getPendingMovements);

// Get my requests (logged-in user's requests)
router.get("/my-requests", fileMovementController.getMyRequests);

// Get my notifications
router.get("/my-notifications", fileMovementController.getMyNotifications);


// Get specific movement by ID
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

// -------------------------------------
// GET ROUTES
// -------------------------------------
router.get("/folders-by-department", fileMovementController.getFoldersByDepartment);
router.get("/files/my-department", fileMovementController.getFilesByDepartment);
router.get("/pending", fileMovementController.getPendingMovements);

// Get all movements
router.get("/", fileMovementController.getFileMovements);

// Get movement by ID
router.get("/:move_id", fileMovementController.getFileMovementById);

// -------------------------------------
// ACTION ROUTES
// -------------------------------------
router.put("/reject/:move_id", fileMovementController.rejectMovement);

// Two versions kept (same as you had)
router.put("/take/:move_id", fileMovementController.takeOutFile);
router.put("/:move_id/take-out", fileMovementController.takeOutFile);

// Two versions kept (same as you had)
router.put("/:move_id/return", fileMovementController.returnFile);


module.exports = router;