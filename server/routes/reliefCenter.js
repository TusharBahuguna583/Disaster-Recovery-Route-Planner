const express = require("express");
const router = express.Router();
const {fetchReliefCenters} = require("../controllers/ReliefCenters");

router.post("/relief-centers", fetchReliefCenters);

module.exports = router;