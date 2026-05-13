import api from "@/lib/api";

export interface LocationCity {
  name: string;
  district?: string;
  state: string;
  lat?: number;
  lon?: number;
  displayName?: string;
}

function normalizePlace(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSearchQueries(q: string) {
  const raw = q.trim();
  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  const candidates = [
    raw,
    parts[0],
    parts.length > 1 ? parts.slice(0, 2).join(", ") : "",
    parts.length > 1 ? parts[parts.length - 1] : "",
    parts.length > 2 ? parts.slice(-2).join(", ") : "",
  ]
    .map((item) => String(item || "").trim())
    .filter((item) => item.length >= 2);

  return [...new Set(candidates)];
}

function rankCity(city: LocationCity, query: string) {
  const name = normalizePlace(city.name);
  const district = normalizePlace(city.district || "");
  const displayName = normalizePlace(city.displayName || "");
  const normalizedQuery = normalizePlace(query);

  if (name === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (normalizedQuery.includes(name) || displayName.includes(normalizedQuery)) return 2;
  if (district && normalizedQuery.includes(district)) return 3;
  return 4;
}

export async function getIndianStates(): Promise<string[]> {
  try {
    const { data } = await api.get("/locations/states", { timeout: 2500 });
    return data?.states ?? [];
  } catch {
    return [
      "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
      "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
      "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh",
      "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
      "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
      "Uttarakhand", "West Bengal",
    ];
  }
}

export async function searchIndianCities(state: string, q: string): Promise<LocationCity[]> {
  if (!state || q.trim().length < 2) return [];

  const queries = buildSearchQueries(q);
  const seen = new Set<string>();
  const collected: LocationCity[] = [];

  for (const candidate of queries) {
    try {
      const { data } = await api.get("/locations/cities", {
        params: { state, q: candidate },
        timeout: 6500,
      });
      const cities = (data?.cities ?? []).filter((city: LocationCity) =>
        Number.isFinite(Number(city.lat)) && Number.isFinite(Number(city.lon))
      );

      for (const city of cities) {
        const key = `${normalizePlace(city.name)}|${normalizePlace(city.district || "")}|${normalizePlace(city.state || "")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(city);
      }
    } catch {
      // Keep searching with alternate place combinations.
    }
  }

  return collected.sort((a, b) => rankCity(a, q) - rankCity(b, q)).slice(0, 8);
}
