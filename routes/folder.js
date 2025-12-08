const express = require("express");
const router = express.Router();
const controller = require("../controllers/folderController");

router.get("/next-id", controller.getNextFolderId);
router.get("/latest", controller.getLatestFolder);
router.post("/", controller.createFolder);
router.get("/", controller.getFolder);
router.get("/:folder_id", controller.getFolderById);
router.put("/:folder_id", controller.updateFolder);
router.delete("/:folder_id", controller.deleteFolder);
router.get("/view/:folder_id", controller.viewFolderPage);



module.exports = router;
