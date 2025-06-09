const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const database = require("./config/database");
const disasterLocationRoute = require("./routes/disasterLocation");
const reliefCenterRoute = require("./routes/reliefCenter");
const findPathRoute = require("./routes/findPath");

const app = express();
require("dotenv").config();

app.use(cors()); // Enable CORS
app.use(express.json()); // For parsing JSON

// Connect to MongoDB
database.connect();

app.use("/api/v1/disaster", disasterLocationRoute);
app.use("/api/v1/rescue", reliefCenterRoute);
app.use("/api/v1", findPathRoute);
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
