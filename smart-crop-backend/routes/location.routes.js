const express = require("express");
const axios = require("axios");

const router = express.Router();

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const cityCache = new Map();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasCoordinates(item) {
  return Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
}

function rankLocation(item, q) {
  const query = normalizeText(q);
  const name = normalizeText(item.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

function resultTypeRank(item) {
  const type = normalizeText(item.resultType);
  if (["city", "town", "village", "locality", "municipality"].includes(type)) return 0;
  if (["postcode"].includes(type)) return 1;
  if (["suburb", "neighbourhood", "neighborhood"].includes(type)) return 2;
  if (["county", "district", "state"].includes(type)) return 3;
  if (["amenity", "building", "street"].includes(type)) return 4;
  return 5;
}

function compareLocations(a, b, q) {
  const rankDiff = rankLocation(a, q) - rankLocation(b, q);
  if (rankDiff !== 0) return rankDiff;
  return resultTypeRank(a) - resultTypeRank(b);
}

function isUsefulLocationResult(item, { state, q }) {
  const expectedState = normalizeText(state);
  const resultState = normalizeText(item.state);
  if (expectedState && resultState && resultState !== expectedState) return false;

  const query = normalizeText(q);
  const name = normalizeText(item.name);
  if (!query || !name) return false;
  const type = normalizeText(item.resultType);
  const displayPrimary = normalizeText(String(item.displayName || "").split(",")[0]);
  if (
    ["amenity", "building", "street", "suburb"].includes(type) &&
    displayPrimary &&
    !displayPrimary.startsWith(name)
  ) {
    return false;
  }

  return name.includes(query) || query.includes(name);
}

async function searchGeoapifyCities({ state, q }) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return [];

  const baseParams = {
    text: `${q}, ${state}, India`,
    filter: "countrycode:in",
    format: "json",
    limit: 12,
    apiKey,
  };

  const requests = [
    axios.get("https://api.geoapify.com/v1/geocode/autocomplete", {
      params: baseParams,
      timeout: 2500,
    }),
    axios.get("https://api.geoapify.com/v1/geocode/search", {
      params: baseParams,
      timeout: 2500,
    }),
  ];

  const settled = await Promise.allSettled(requests);
  const results = settled.flatMap((result) =>
    result.status === "fulfilled" && Array.isArray(result.value.data?.results)
      ? result.value.data.results
      : []
  );

  return results
    .map(mapGeoapifyResult(state))
    .filter(hasCoordinates)
    .filter((item) => isUsefulLocationResult(item, { state, q }))
    .filter(uniqueLocation)
    .sort((a, b) => compareLocations(a, b, q))
    .slice(0, 12);
}

function mapGeoapifyResult(state) {
  return (item) => {
    const name =
      item.city ||
      item.town ||
      item.village ||
      item.municipality ||
      item.suburb ||
      item.name ||
      item.county;

    return {
      name,
      district: item.county || item.district || item.state_district || "",
      state: item.state || state,
      lat: Number(item.lat),
      lon: Number(item.lon),
      displayName: item.formatted,
      provider: "geoapify",
      resultType: item.result_type || "",
      placeId: item.place_id || "",
    };
  };
}

function uniqueLocation(item, index, items) {
  if (!item.name) return false;
  const key = `${item.name}-${item.district}-${item.state}`.toLowerCase();
  return items.findIndex((other) => `${other.name}-${other.district}-${other.state}`.toLowerCase() === key) === index;
}

function mapReverseLocation(address = {}) {
  return {
    village: address.village || address.hamlet || address.locality || address.suburb || "",
    city:
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      "",
    district: address.state_district || address.county || address.district || "",
    state: address.state || "",
    country: address.country || "India",
  };
}

async function reverseGeoapifyLocation({ lat, lon }) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return null;

  const { data } = await axios.get("https://api.geoapify.com/v1/geocode/reverse", {
    params: {
      lat,
      lon,
      format: "json",
      apiKey,
    },
    timeout: 5000,
  });

  const first = Array.isArray(data?.results) ? data.results[0] : null;
  if (!first) return null;

  return {
    ...mapReverseLocation(first),
    displayName: first.formatted || "",
    lat: Number(first.lat),
    lon: Number(first.lon),
    source: "geoapify",
  };
}

async function reverseNominatimLocation({ lat, lon }) {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
    params: {
      lat,
      lon,
      format: "jsonv2",
      addressdetails: 1,
      zoom: 14,
    },
    headers: {
      "User-Agent": "CropSafe/1.0 (reverse-location)",
    },
    timeout: 8000,
  });

  if (!data?.address) return null;

  return {
    ...mapReverseLocation(data.address),
    displayName: data.display_name || "",
    lat: Number(lat),
    lon: Number(lon),
    source: "nominatim",
  };
}

async function searchNominatimCities({ state, q }) {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: `${q}, ${state}, India`,
      format: "jsonv2",
      addressdetails: 1,
      countrycodes: "in",
      limit: 12,
    },
    headers: {
      "User-Agent": "CropSafe/1.0 (city-search)",
    },
    timeout: 3500,
  });

  const allowedTypes = new Set([
    "city",
    "town",
    "village",
    "municipality",
    "administrative",
    "suburb",
  ]);

  const seen = new Set();
  return (Array.isArray(data) ? data : [])
    .filter((item) => !item.type || allowedTypes.has(item.type))
    .map((item) => {
      const address = item.address || {};
      const name =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.suburb ||
        item.name ||
        String(item.display_name || "").split(",")[0];

      return {
        name,
        district: address.state_district || address.county || "",
        state: address.state || state,
        lat: Number(item.lat),
        lon: Number(item.lon),
        displayName: item.display_name,
        provider: "nominatim",
        resultType: item.type || "",
      };
    })
    .filter(hasCoordinates)
    .filter((item) => isUsefulLocationResult(item, { state, q }))
    .sort((a, b) => compareLocations(a, b, q))
    .filter((item) => {
      const key = `${item.name}-${item.district}-${item.state}`.toLowerCase();
      if (!item.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

router.get("/states", (req, res) => {
  res.json({ success: true, states: INDIAN_STATES });
});

router.get("/cities", async (req, res) => {
  try {
    const state = String(req.query.state || "").trim();
    const q = String(req.query.q || "").trim();

    if (!state || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "state and at least 2 search characters are required",
      });
    }

    const cacheKey = `${state.toLowerCase()}::${q.toLowerCase()}`;
    if (cityCache.has(cacheKey)) {
      return res.json({ success: true, cities: cityCache.get(cacheKey), source: "cache" });
    }

    let source = "geoapify";
    let cities = await searchGeoapifyCities({ state, q });
    if (cities.length === 0) {
      source = "nominatim";
      cities = await searchNominatimCities({ state, q });
    }
    cityCache.set(cacheKey, cities);
    res.json({ success: true, cities, source: cities.length > 0 ? source : "none" });
  } catch (error) {
    console.error("City search error:", error.message);
    res.json({ success: true, cities: [], source: "unavailable" });
  }
});

router.get("/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lon are required",
      });
    }

    let location = await reverseGeoapifyLocation({ lat, lon });
    if (!location) {
      location = await reverseNominatimLocation({ lat, lon });
    }

    if (!location) {
      return res.json({ success: true, location: null, source: "none" });
    }

    res.json({ success: true, location, source: location.source });
  } catch (error) {
    console.error("Reverse location error:", error.message);
    res.json({ success: true, location: null, source: "unavailable" });
  }
});

module.exports = router;
