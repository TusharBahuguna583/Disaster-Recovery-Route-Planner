const express = require("express");
const router = express.Router();
const {fetchDisasterEvents} = require("../controllers/DisasterLocations");

router.get("/disaster-locations", fetchDisasterEvents);

module.exports = router;