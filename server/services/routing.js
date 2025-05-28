function toRad(deg) {
  return (deg * Math.PI) / 180;
}

const haversineDistance = (coord1, coord2) => {
  const R = 6371e3; // meters
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lon - coord1.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

exports.findClosestNode = (lat, lon, data) => {
  let closestNode = null;
  let minDist = Infinity;

  data.elements.forEach((element) => {
    if (element.type === "node") {
      const dist = haversineDistance(
        { lat, lon },
        { lat: element.lat, lon: element.lon }
      );
      if (dist < minDist) {
        minDist = dist;
        closestNode = element.id;
      }
    }
  });

  return closestNode;
};

exports.fetchStreetData = async (lat, lng) => {
  const query = `
  [out:json][timeout:25];
  (
    way
      ["highway"]
      ["highway"!~"footway|cycleway|path|pedestrian|steps|track|service"]
      (around:3000, ${lat}, ${lng});
  );
  out body;
  >;
  out skel qt;
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        query
      )}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Failed to fetch street data:", error);
    throw error;
  }
};

exports.buildGraph = (data) => {
  const graph = {};
  const nodeCoords = {};

  data.elements.forEach((el) => {
    if (el.type === "node") {
      nodeCoords[el.id] = [el.lat, el.lon];
    }
  });

  data.elements.forEach((el) => {
    if (el.type === "way") {
      const nodes = el.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        const from = nodes[i];
        const to = nodes[i + 1];
        if (!graph[from]) graph[from] = {};
        if (!graph[to]) graph[to] = {};
        graph[from][to] = 1;
        graph[to][from] = 1;
      }
    }
  });

  return { graph, nodeCoords };
};

const PriorityQueue = require("js-priority-queue");

exports.dijkstra = (graph, start, end) => {
  const distances = {};
  const previous = {};
  const visited = new Set();

  const pq = new PriorityQueue({
    comparator: (a, b) => a.priority - b.priority,
  });

  for (const vertex in graph) {
    distances[vertex] = Infinity;
    previous[vertex] = null;
  }

  distances[start] = 0;
  pq.queue({ node: start, priority: 0 });

  while (pq.length) {
    const { node: currentVertex } = pq.dequeue();

    if (visited.has(currentVertex)) continue;
    visited.add(currentVertex);

    for (const neighbor in graph[currentVertex]) {
      const alt = distances[currentVertex] + graph[currentVertex][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = currentVertex;
        pq.queue({ node: neighbor, priority: alt });
      }
    }
  }

  const path = [];
  for (let at = end; at !== null; at = previous[at]) {
    path.push(at);
  }
  path.reverse();

  return path.length ? path : null;
};
