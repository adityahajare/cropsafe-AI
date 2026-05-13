// ================================
// GEOMETRY CONVERSION UTILITIES
// ================================

/**
 * Convert Leaflet format [lat, lon] → GeoJSON [lon, lat]
 * @param boundary - Array of [latitude, longitude] pairs (Leaflet format)
 * @returns Array of [longitude, latitude] pairs (GeoJSON format)
 */
export const toGeoJSON = (boundary: [number, number][]): [number, number][] => {
  if (!boundary || !Array.isArray(boundary)) return [];
  return boundary.map(([lat, lon]) => [lon, lat]);
};

/**
 * Convert GeoJSON [lon, lat] → Leaflet [lat, lon]
 * @param coords - Array of [longitude, latitude] pairs (GeoJSON format)
 * @returns Array of [latitude, longitude] pairs (Leaflet format)
 */
export const fromGeoJSON = (coords: [number, number][]): [number, number][] => {
  if (!coords || !Array.isArray(coords)) return [];
  return coords.map(([lon, lat]) => [lat, lon]);
};

/**
 * Calculate polygon area in hectares (using Haversine formula)
 * @param boundary - Array of [latitude, longitude] pairs
 * @returns Area in hectares
 */
export const calculateAreaHectares = (boundary: [number, number][]): number => {
  if (!boundary || boundary.length < 3) return 0;
  
  // Convert to GeoJSON for area calculation
  const geoJsonCoords = toGeoJSON(boundary);
  
  // Use the shoelace formula for planar area
  let area = 0;
  const n = geoJsonCoords.length;
  
  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = geoJsonCoords[i];
    const [lon2, lat2] = geoJsonCoords[(i + 1) % n];
    area += (lon2 - lon1) * (lat1 + lat2);
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to hectares (approximate)
  // 1 degree ≈ 111,000 meters, so 1 degree² ≈ 12,321,000,000 m²
  // 1 hectare = 10,000 m²
  const hectares = area * 111000 * 111000 / 10000;
  
  return Math.min(hectares, 1000); // Cap at 1000 hectares
};

/**
 * Calculate polygon perimeter in meters
 * @param boundary - Array of [latitude, longitude] pairs
 * @returns Perimeter in meters
 */
export const calculatePerimeter = (boundary: [number, number][]): number => {
  if (!boundary || boundary.length < 2) return 0;
  
  let perimeter = 0;
  const n = boundary.length;
  
  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = boundary[i];
    const [lat2, lon2] = boundary[(i + 1) % n];
    
    // Haversine distance between two points
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    perimeter += d;
  }
  
  return perimeter;
};

/**
 * Check if a point is inside a polygon
 * @param point - [latitude, longitude] point
 * @param polygon - Array of [latitude, longitude] pairs
 * @returns Boolean indicating if point is inside polygon
 */
export const isPointInPolygon = (
  point: [number, number],
  polygon: [number, number][]
): boolean => {
  const [lat, lon] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lat1, lon1] = polygon[i];
    const [lat2, lon2] = polygon[j];
    
    const intersect = ((lon1 > lon) !== (lon2 > lon)) &&
      (lat < (lat2 - lat1) * (lon - lon1) / (lon2 - lon1) + lat1);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Get center point (centroid) of polygon
 * @param boundary - Array of [latitude, longitude] pairs
 * @returns Center point [latitude, longitude]
 */
export const getPolygonCenter = (boundary: [number, number][]): [number, number] => {
  if (!boundary || boundary.length === 0) return [0, 0];
  
  let lat = 0, lon = 0;
  for (const [lati, loni] of boundary) {
    lat += lati;
    lon += loni;
  }
  
  return [lat / boundary.length, lon / boundary.length];
};

export default {
  toGeoJSON,
  fromGeoJSON,
  calculateAreaHectares,
  calculatePerimeter,
  isPointInPolygon,
  getPolygonCenter,
};