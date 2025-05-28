const {
  fetchStreetData,
  buildGraph,
  findClosestNode,
  dijkstra,
  haversineDistance,
} = require("../services/routing");

exports.findPath = async (req, res) => {
  const { srcLat, srcLng, dstLat, dstLng } = req.body;
  try {
    const centerLatitude = (srcLat + dstLat) / 2;
    const centerLongitude = (srcLng + dstLng) / 2;

    const streetData = await fetchStreetData(centerLatitude, centerLongitude);
    const { graph, nodeCoords } = buildGraph(streetData);
    const sourceNode = findClosestNode(srcLat, srcLng, streetData);
    const destinationNode = findClosestNode(dstLat, dstLng, streetData);
    console.log("Source Node:", sourceNode);
    console.log("Destination Node:", destinationNode);

    if (!sourceNode || !destinationNode) {
      alert("Could not find nearby nodes for source or destination.");
      return;
    }
    const shortestPath = dijkstra(graph, sourceNode, destinationNode);
    console.log(shortestPath);
    res.status(200).json({
      success: true,
      message: "Shortest Route founded",
      shortestPath,
      nodeCoords,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
