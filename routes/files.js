const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// =========================
// File CRUD
// =========================
router.get("/", fileController.getAllFiles);
router.get("/list", fileController.getFileList);
router.get("/files-for-existing", fileController.getFilesForExisting);
router.post("/existing", fileController.createExisting);
router.post("/", fileController.createFile);
router.post("/:id/assign-folder", fileController.assignFileToFolder);
router.get("/:id", fileController.getFileById);
router.patch("/:fileId/unlink", fileController.unlinkFileFromFolder);
router.put("/:id", fileController.updateFile);

router.put("/:id", fileController.updateFile);
router.get("/:id", fileController.getFileById);

router.patch("/:fileId/unlink", fileController.unlinkFileFromFolder);
module.exports = router;
