const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

router.post("/", locationController.createLocation);
router.get("/locations-with-folders", locationController.getLocationsWithFolders); // move this up
router.get("/", locationController.getLocations);
router.get("/:location_id", locationController.getLocationById);
router.put("/:location_id", locationController.updateLocation);
router.delete("/:location_id", locationController.deleteLocation);

module.exports = router;
