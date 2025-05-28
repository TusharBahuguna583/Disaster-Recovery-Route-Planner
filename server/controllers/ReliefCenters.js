const ReliefCenter = require("../models/ReliefCenter");

exports.fetchReliefCenters = async (req, res) => {
  try {
    const { disasterEvent } = req.body;
    const reliefCenters = await ReliefCenter.find(
      { disasterEvent: disasterEvent },
      { _id: false }
    ); // MongoDB collection
    res.json(reliefCenters);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch relief centers" });
  }
};
