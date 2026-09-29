/**
 * GPX Utilities — parse GPX files and compute rider route progress
 */

/**
 * Parse GPX XML text → array of [lat, lng] coordinate pairs
 * @param {string} gpxText
 * @returns {Array<[number, number]>}
 */
function parseGpxToCoords(gpxText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(gpxText, 'application/xml');

  // Support both <trkpt> (track points) and <rtept> (route points)
  let points = Array.from(doc.querySelectorAll('trkpt'));
  if (!points.length) points = Array.from(doc.querySelectorAll('rtept'));

  return points.map(pt => [
    parseFloat(pt.getAttribute('lat')),
    parseFloat(pt.getAttribute('lon'))
  ]).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
}

/**
 * Haversine distance between two lat/lng points (returns km)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute total route distance (km) from coordinate array
 * @param {Array<[number, number]>} coords
 * @returns {number}
 */
function totalRouteKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Nearest-point algorithm: find which point in routeCoords the rider is closest to
 * @param {number} lat - rider latitude
 * @param {number} lng - rider longitude
 * @param {Array<[number, number]>} routeCoords
 * @param {number} routeTotalKm - pre-computed total distance
 * @returns {{ index: number, progressPct: number, distanceKm: number }}
 */
function findNearestRoutePoint(lat, lng, routeCoords, routeTotalKm) {
  if (!routeCoords.length) return { index: 0, progressPct: 0, distanceKm: 0 };

  let nearestIndex = 0;
  let minDist      = Infinity;

  for (let i = 0; i < routeCoords.length; i++) {
    const d = haversineKm(lat, lng, routeCoords[i][0], routeCoords[i][1]);
    if (d < minDist) { minDist = d; nearestIndex = i; }
  }

  // Compute distance covered up to nearestIndex
  let coveredKm = 0;
  for (let i = 1; i <= nearestIndex; i++) {
    coveredKm += haversineKm(routeCoords[i-1][0], routeCoords[i-1][1], routeCoords[i][0], routeCoords[i][1]);
  }

  const progressPct = routeTotalKm > 0
    ? Math.min(100, Math.round((coveredKm / routeTotalKm) * 100))
    : 0;

  return {
    index:       nearestIndex,
    progressPct,
    distanceKm:  Math.round(coveredKm * 10) / 10
  };
}
