const mongoose = require("mongoose");

const ReliefCenterSchema = new mongoose.Schema({
  disasterEvent: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("ReliefCenter", ReliefCenterSchema);
