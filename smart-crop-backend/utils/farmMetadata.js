function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePolygon(polygonCoordinates = []) {
  return polygonCoordinates
    .map((point) => {
      const lat = toFiniteNumber(point?.[0]);
      const lng = toFiniteNumber(point?.[1]);
      return lat == null || lng == null ? null : [lat, lng];
    })
    .filter(Boolean);
}

function buildBoundaryGeoJson(polygonCoordinates = []) {
  const coords = normalizePolygon(polygonCoordinates).map(([lat, lng]) => [lng, lat]);
  if (coords.length < 3) return null;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

function buildBoundingBox(polygonCoordinates = []) {
  const coords = normalizePolygon(polygonCoordinates);
  if (coords.length === 0) return null;

  const lats = coords.map(([lat]) => lat);
  const lngs = coords.map(([, lng]) => lng);

  return {
    minLat: Math.min(...lats),
    minLng: Math.min(...lngs),
    maxLat: Math.max(...lats),
    maxLng: Math.max(...lngs),
  };
}

function getPolygonCenter(polygonCoordinates = []) {
  const coords = normalizePolygon(polygonCoordinates);
  if (coords.length === 0) return { lat: null, lng: null };

  const total = coords.reduce(
    (sum, [lat, lng]) => ({ lat: sum.lat + lat, lng: sum.lng + lng }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / coords.length,
    lng: total.lng / coords.length,
  };
}

function getDaysSinceSowing(sowingDate) {
  const date = new Date(sowingDate);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function getCropStage(daysSinceSowing) {
  if (daysSinceSowing < 15) return 'Germination';
  if (daysSinceSowing < 45) return 'Vegetative';
  if (daysSinceSowing < 75) return 'Flowering';
  if (daysSinceSowing < 110) return 'Grain/Fruit Development';
  return 'Maturity';
}

function buildFarmMetadata({ payload, user, soilType }) {
  const polygonCoordinates = normalizePolygon(payload.polygonCoordinates);
  const polygonCenter = getPolygonCenter(polygonCoordinates);
  const centerLat = polygonCenter.lat ?? toFiniteNumber(payload.centerLat);
  const centerLng = polygonCenter.lng ?? toFiniteNumber(payload.centerLng);
  const areaHectares = toFiniteNumber(payload.areaHectares);
  const daysSinceSowingAtRegistration = getDaysSinceSowing(payload.sowingDate);
  const city = String(payload.city || user?.city || '').trim();
  const district = String(payload.district || user?.district || '').trim();
  const state = String(payload.state || user?.state || '').trim();
  const village = String(payload.village || user?.village || '').trim();

  return {
    farmerId: user?._id || user?.id,
    farmName: String(payload.farmName || '').trim(),
    polygonCoordinates,
    boundaryGeoJson: buildBoundaryGeoJson(polygonCoordinates),
    boundingBox: buildBoundingBox(polygonCoordinates),
    centerLat,
    centerLng,
    areaHectares,
    cropType: String(payload.cropType || '').trim(),
    season: String(payload.season || '').trim(),
    sowingDate: new Date(payload.sowingDate),
    cropStageAtRegistration: getCropStage(daysSinceSowingAtRegistration),
    daysSinceSowingAtRegistration,
    city,
    district,
    state,
    village,
    country: 'India',
    locationLabel: [village, city, district, state].filter(Boolean).join(', '),
    soilType,
    cityBoundaryVerified: Boolean(payload.cityBoundaryVerified),
    dataQuality: {
      boundaryPoints: polygonCoordinates.length,
      hasValidBoundary: polygonCoordinates.length >= 3,
      hasValidCenter: centerLat != null && centerLng != null,
      hasFarmerLocation: Boolean(city || district || state || village),
      source: 'farmer-boundary',
      lastMetadataRefresh: new Date(),
    },
    status: payload.status || 'active',
  };
}

module.exports = {
  buildFarmMetadata,
  getCropStage,
  getDaysSinceSowing,
};
