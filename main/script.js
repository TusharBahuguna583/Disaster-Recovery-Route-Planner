var map;
var startMarker = null;
var endMarker = null;
var userLocationMarker = null;
var routingControl = null;
var currentRouteLine = null;
var graph = {};
var reliefMarkers = [];
let lastRouteKey = null; // remembers "srcId→dstId" of current route
const findBtn = document.querySelector("button[onclick='findPath()']");

var disasterLocations = [
  // { name: "Delhi Flood", lat: 28.6139, lng: 77.209 },
  // { name: "Mumbai Cyclone", lat: 19.076, lng: 72.8777 },
  // { name: "Lucknow Earthquake", lat: 26.8467, lng: 80.9462 },
];

var reliefCenters = {
  // "Delhi Flood": [
  //   { name: "Relief Center A - Delhi", lat: 28.63, lng: 77.21 },
  //   { name: "Relief Center B - Delhi", lat: 28.64, lng: 77.23 },
  // ],
  // "Mumbai Cyclone": [
  //   { name: "Relief Center A - Mumbai", lat: 19.08, lng: 72.88 },
  //   { name: "Relief Center B - Mumbai", lat: 19.07, lng: 72.87 },
  // ],
  // "Lucknow Earthquake": [
  //   { name: "Relief Center A - Lucknow", lat: 26.85, lng: 80.95 },
  //   { name: "Relief Center B - Lucknow", lat: 26.86, lng: 80.94 },
  // ],
};

function populateStartLocationDropdown() {
  const dropdown = document.getElementById("start-location");
  dropdown.innerHTML = '<option value="">Select a start location</option>';
  disasterLocations.forEach((location, index) => {
    const option = document.createElement("option");
    option.value = location._id || index; // Prefer unique ID from database
    option.textContent = location.name;
    dropdown.appendChild(option);
  });
}

async function renderDisasterLocations() {
  try {
    // Replace with your actual backend API endpoint
    const response = await fetch(
      "https://disaster-recovery-route-planner-backend.onrender.com/api/v1/disaster/disaster-locations"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch disaster locations");
    }

    disasterLocations = await response.json();
    populateStartLocationDropdown();
    disasterLocations.forEach((location) => {
      L.circle([location.lat, location.lng], {
        color: "red",
        fillColor: "#f03",
        fillOpacity: 0.5,
        radius: 300,
      })
        .addTo(map)
        .bindPopup(`<b>Disaster:</b> ${location.name}`);
    });
  } catch (error) {
    console.error("Error loading disaster locations:", error);
  }
}

async function populateReliefCenters(disasterEvent) {
  const reliefDropdown = document.getElementById("end-location");
  reliefDropdown.innerHTML = '<option value="">Select Relief Center</option>';
  try {
    // Replace with your actual backend API endpoint
    const response = await fetch(
      "https://disaster-recovery-route-planner-backend.onrender.com/api/v1/rescue/relief-centers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disasterEvent }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch Relief Center");
    }

    reliefCenters = await response.json();

    if (!reliefCenters) return;

    reliefCenters.forEach((center, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = center.name;
      reliefDropdown.appendChild(option);

      // Add blue circle on map
      const marker = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "custom-relief-icon",
          html: "<b>+</b>",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>Relief Center:</b> ${center.name}`);

      reliefMarkers.push(marker);
    });
  } catch (error) {}
}

async function initMap() {
  map = L.map("map");

  // Add tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // Use browser's geolocation for exact coordinates
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const userLatLng = L.latLng(lat, lng);
        map.setView(userLatLng, 18); // Zoom level 18 for close view

        // Only show a marker, no circle
        L.marker(userLatLng).addTo(map).bindPopup("You are here").openPopup();

        await renderDisasterLocations();
      },
      async function (error) {
        alert("Location access failed: " + error.message);
        map.setView([20.5937, 78.9629], 5); // fallback to India

        await renderDisasterLocations();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
    map.setView([20.5937, 78.9629], 5);

    await renderDisasterLocations();
  }

  // Allow adding start/end markers manually
  // map.on("click", function (event) {
  //   handleMapClick(event.latlng);
  // });
}

function setStartPoint() {
  const dropdown = document.getElementById("start-location");
  const index = dropdown.value;
  if (index === "") return;

  // Remove old start marker if exists
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }

  // Remove old end marker
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Remove routing control if it exists
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  // Remove route lines
  map.eachLayer((layer) => {
    if (layer instanceof L.Polyline && !(layer instanceof L.Marker)) {
      map.removeLayer(layer);
    }
  });

  // Remove routing panel
  const routingContainers = document.querySelectorAll(
    ".leaflet-routing-container"
  );
  routingContainers.forEach((el) => el.remove());

  // Remove relief center markers
  reliefMarkers.forEach((marker) => map.removeLayer(marker));
  reliefMarkers = [];

  // Reset end-location dropdown
  const reliefDropdown = document.getElementById("end-location");
  reliefDropdown.innerHTML = '<option value="">Select Relief Center</option>';
  reliefDropdown.disabled = false;

  // Reset distance and time fields
  document.getElementById("distance").value = "";
  document.getElementById("time").value = "";

  // Place new start marker
  const location = disasterLocations[index];
  const latlng = L.latLng(location.lat, location.lng);
  startMarker = L.marker(latlng)
    .addTo(map)
    .bindPopup("Disaster Area : " + location.name)
    .openPopup();
  map.flyTo(latlng, 16);

  // Populate relief centers based on selected disaster
  populateReliefCenters(location.name);
}

function setEndPoint() {
  const disasterDropdown = document.getElementById("start-location");
  const disasterIndex = disasterDropdown.value;
  const reliefDropdown = document.getElementById("end-location");
  const reliefIndex = reliefDropdown.value;
  if (disasterIndex === "" || reliefIndex === "") return;

  const selectedCenter = reliefCenters[reliefIndex];

  // Remove old end marker if exists
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Remove old route if exists
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  if (currentRouteLine) {
    map.removeLayer(currentRouteLine);
    currentRouteLine = null;
  }

  // Add new end marker
  const latlng = L.latLng(selectedCenter.lat, selectedCenter.lng);
  endMarker = L.marker(latlng).addTo(map).bindPopup("End Location").openPopup();

  map.flyTo(latlng, 16);
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(coord1, coord2) {
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
}

function visualizeRoute(path, nodeCoords) {
  const routeCoordinates = path
    .map((nodeId) => nodeCoords[nodeId])
    .filter((coord) => coord); // remove undefined entries

  if (routeCoordinates.length < 2) {
    alert("Insufficient route coordinates to draw path.");
    return;
  }

  if (currentRouteLine) {
    map.removeLayer(currentRouteLine);
    currentRouteLine = null;
  }

  currentRouteLine = L.polyline(routeCoordinates, { color: "blue" }).addTo(map);
  map.fitBounds(currentRouteLine.getBounds());

  // Total Distance
  const totalDistance = path.reduce((sum, nodeId, index) => {
    if (index === 0) return 0;
    const [lat1, lon1] = nodeCoords[path[index - 1]];
    const [lat2, lon2] = nodeCoords[nodeId];
    return (
      sum +
      haversineDistance({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 })
    );
  }, 0);
  document.getElementById("distance").value =
    (totalDistance / 1000).toFixed(2) + " km";

  // Total Time
  const avgSpeedKmph = 30;
  const estimatedTime = totalDistance / 1000 / avgSpeedKmph; // in hours
  const minutes = Math.round(estimatedTime * 60);
  document.getElementById("time").value = minutes + " mins";
}

async function findPath() {
  const disasterDropdown = document.getElementById("start-location");
  const disasterIndex = disasterDropdown.value;
  const sourceInput = disasterLocations[disasterIndex];

  const reliefDropdown = document.getElementById("end-location");
  const reliefIndex = reliefDropdown.value;
  const destinationInput = reliefCenters[reliefIndex];
  showLoading();
  try {
    const sourceCoords = {
      lat: parseFloat(sourceInput.lat),
      lon: parseFloat(sourceInput.lng),
    };
    const destinationCoords = {
      lat: parseFloat(destinationInput.lat),
      lon: parseFloat(destinationInput.lng),
    };

    const response = await fetch("https://disaster-recovery-route-planner-backend.onrender.com/api/v1/shortest-path", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        srcLat: sourceCoords.lat,
        srcLng: sourceCoords.lon,
        dstLat: destinationCoords.lat,
        dstLng: destinationCoords.lon,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Shortest Route");
    }

    const data = await response.json();
    if (data.shortestPath) {
      visualizeRoute(data.shortestPath, data.nodeCoords);
    } else {
      alert("No path found.");
    }
  } catch (error) {
    console.error(error);
    alert("Error computing path.");
  } finally {
    hideLoading();
  }
}

initMap();

// MAP CONTROLS
function recenterMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const userLatLng = L.latLng(lat, lng);
        map.setView(userLatLng, 16); // Zoom in

        // Remove previous user marker if exists
        if (userLocationMarker) {
          map.removeLayer(userLocationMarker);
        }

        // Add new marker for user's current location
        userLocationMarker = L.marker(userLatLng)
          .addTo(map)
          .bindPopup("You are here")
          .openPopup();
      },
      function (error) {
        alert("Could not determine location: " + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function recenterToRoute() {
  if (currentRouteLine) {
    map.fitBounds(currentRouteLine.getBounds());
  } else {
    alert("No route is currently displayed.");
  }
}

function resetMap() {
  // Reset map view to default (India center)
  map.setView([20.5937, 78.9629], 5);

  // Remove start and end markers
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }
  if (currentRouteLine) {
    map.removeLayer(currentRouteLine);
    currentRouteLine = null;
  }

  // Remove routing control (and instructions)
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  // Remove route polylines (if any)
  map.eachLayer((layer) => {
    if (layer instanceof L.Polyline && !(layer instanceof L.Marker)) {
      map.removeLayer(layer);
    }
  });

  // Remove Leaflet Routing instruction panel
  const routingContainers = document.querySelectorAll(
    ".leaflet-routing-container"
  );
  routingContainers.forEach((el) => el.remove());

  // Reset dropdowns
  document.getElementById("start-location").selectedIndex = 0;
  document.getElementById("end-location").innerHTML =
    '<option value="">Select Relief Center</option>';

  document.getElementById("distance").value = "";
  document.getElementById("time").value = "";
  // Clear internal data
  graph = {};

  reliefMarkers.forEach((marker) => map.removeLayer(marker));
  reliefMarkers = [];
}

// handle map click
// function handleMapClick(latlng) {
//   if (!startMarker) {
//     startMarker = L.marker(latlng)
//       .addTo(map)
//       .bindPopup("Start Location")
//       .openPopup();
//     console.log("Start Location:", latlng.lat, latlng.lng);
//     map.flyTo(latlng, 18);
//   } else if (!endMarker) {
//     endMarker = L.marker(latlng)
//       .addTo(map)
//       .bindPopup("End Location")
//       .openPopup();
//     console.log("End Location:", latlng.lat, latlng.lng);

//     findPath();
//   }
// }

function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
  document.querySelector("button[onclick='findPath()']").disabled = true;
}
function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
  document.querySelector("button[onclick='findPath()']").disabled = false;
}
