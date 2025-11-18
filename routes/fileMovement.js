const express = require("express");
const router = express.Router();
const fileMovementController = require("../controllers/fileMovementController");

// Add this BEFORE routes with :move_id
router.get("/files/my-department", fileMovementController.getFilesByDepartment);
router.get("/folders-by-department", fileMovementController.getFoldersByDepartment);
// movement CRUD
router.get("/pending", fileMovementController.getPendingMovements); 
router.post("/", fileMovementController.createFileMovement);
router.get("/", fileMovementController.getFileMovements);
router.get("/:move_id", fileMovementController.getFileMovementById);
router.put("/:move_id", fileMovementController.updateFileMovement);
router.delete("/:move_id", fileMovementController.deleteFileMovement);

module.exports = router;
