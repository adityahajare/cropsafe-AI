import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";

type LocationType = {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  boundingbox: string[];
};

export default function FarmMap() {
  const mapRef = useRef<L.Map | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationType[]>([]);
  const [bounds, setBounds] = useState<any>(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [polygon, setPolygon] = useState<L.Polygon | null>(null);
  const [area, setArea] = useState(0);

  // refs to avoid stale state
  const drawingRef = useRef(false);
  const pointsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const toast = (msg: string) => alert(msg);

  // INIT MAP
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map").setView([20.5937, 78.9629], 5);
    mapRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current) return;

      const p: [number, number] = [e.latlng.lat, e.latlng.lng];

      // duplicate check
      for (let pt of pointsRef.current) {
        if (map.distance(pt, p) < 5) {
          toast("⚠️ Duplicate point!");
          return;
        }
      }

      // boundary check
      if (
        bounds &&
        !(p[0] >= bounds.minLat &&
          p[0] <= bounds.maxLat &&
          p[1] >= bounds.minLng &&
          p[1] <= bounds.maxLng)
      ) {
        toast("❌ Outside boundary!");
        return;
      }

      const newPoints = [...pointsRef.current, p];
      setPoints(newPoints);

      const marker = L.marker(p).addTo(map);
      setMarkers((prev) => [...prev, marker]);

      // auto close
      if (newPoints.length >= 3) {
        const first = newPoints[0];
        if (map.distance(first, p) < 20) {
          completePolygon(newPoints);
        }
      }
    });

  }, []);

  // SEARCH
  const search = async () => {
    if (!query) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query},India&format=json&limit=5`
    );
    const data = await res.json();
    setResults(data);
  };

  // SELECT LOCATION
  const selectLocation = async (loc: LocationType) => {
    setResults([]);

    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);

    let zoom = 14;
    if (loc.type === "village") zoom = 17;
    if (loc.type === "town") zoom = 15;

    mapRef.current?.flyTo([lat, lon], zoom);

    toast("📍 Moved to " + loc.display_name);

    // boundary
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${loc.display_name}&format=json&limit=1&polygon_geojson=1`
    );
    const data = await res.json();

    const b = data[0].boundingbox;

    setBounds({
      minLat: parseFloat(b[0]),
      maxLat: parseFloat(b[1]),
      minLng: parseFloat(b[2]),
      maxLng: parseFloat(b[3]),
    });

    const poly = [
      [b[0], b[2]],
      [b[0], b[3]],
      [b[1], b[3]],
      [b[1], b[2]],
    ];

    L.polygon(poly as any, { color: "orange", dashArray: "5" }).addTo(
      mapRef.current!
    );
  };

  // START DRAW
  const startDrawing = () => {
    if (!bounds) {
      toast("Select location first!");
      return;
    }
    setDrawing(true);
  };

  // CLEAR
  const clearAll = () => {
    markers.forEach((m) => m.remove());
    setMarkers([]);

    if (polygon) polygon.remove();
    setPolygon(null);

    setPoints([]);
    setArea(0);
  };

  // COMPLETE POLYGON
  const completePolygon = (pts = points) => {
    setDrawing(false);

    if (polygon) polygon.remove();

    const poly = L.polygon(pts as any, {
      color: "#2e7d32",
      fillOpacity: 0.3,
    }).addTo(mapRef.current!);

    setPolygon(poly);

    const turfPoly = turf.polygon([[...pts, pts[0]]]);
    const areaVal = turf.area(turfPoly) / 10000;

    setArea(areaVal);

    toast("✅ Area: " + areaVal.toFixed(2) + " ha");
  };

  return (
    <div>
      <div style={{ position: "absolute", zIndex: 1000, background: "#fff", padding: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search village/city"
        />
        <button onClick={search}>Search</button>

        {results.map((r, i) => (
          <div key={i} onClick={() => selectLocation(r)}>
            {r.display_name}
          </div>
        ))}

        <br />
        <button onClick={startDrawing}>Start Drawing</button>
        <button onClick={clearAll}>Clear</button>

        <div>Area: {area.toFixed(2)} ha</div>
      </div>

      <div id="map" style={{ height: "100vh" }} />
    </div>
  );
}