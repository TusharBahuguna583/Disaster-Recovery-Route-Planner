const DisasterLocation = require("../models/DisasterLocation");

exports.fetchDisasterEvents = async (req, res) => {
  try {
    const locations = await DisasterLocation.find({}, { _id: false });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: "Error fetching disaster locations" });
  }
};
