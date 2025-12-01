const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// =========================
// File CRUD
// =========================
router.get("/", fileController.getAllFiles);
router.get("/list", fileController.getFileList);
// Commented out because not implemented yet
// router.get("/available-for-folder", fileController.getAvailableFilesForFolder);

router.post("/", fileController.createFile);

// Additional File Operations (implemented functions only)
router.post("/:id/assign-folder", fileController.assignFileToFolder);
// router.post("/:id/remove-folder", fileController.removeFileFromFolder);
// router.get("/download/:id", fileController.downloadFile);
// router.get("/preview/:id", fileController.previewFile);
// router.get("/search/query", fileController.searchFiles);
// router.post("/:id/archive", fileController.archiveFile);
// router.post("/:id/restore", fileController.restoreFile);

// Dynamic route for GET by ID (keep at the end)
router.get("/:id", fileController.getFileById);

// router.put("/:id", fileController.updateFile); // uncomment if updateFile exists
// router.delete("/:id", fileController.deleteFile); // uncomment if deleteFile exists

module.exports = router;
