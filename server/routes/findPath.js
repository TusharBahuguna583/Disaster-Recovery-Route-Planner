const express = require("express");
const router = express.Router();
const { findPath } = require("../controllers/Route");

router.post("/shortest-path", findPath);

module.exports = router;
