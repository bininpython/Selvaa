"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, LocateFixed, MapPin, Mountain } from "lucide-react";

type ExploreMapProps = { compact?: boolean; tracking?: boolean };
const points = [
  { lng: -42.536, lat: -19.477, label: "Serra dos Cocais", type: "Trilha" },
  { lng: -42.548, lat: -19.492, label: "Cachoeira do Escorrega", type: "Cachoeira" },
  { lng: -42.512, lat: -19.461, label: "Mirante do Vale", type: "Mirante" },
];

export function ExploreMap({ compact = false, tracking = false }: ExploreMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!mapNode.current || mapRef.current) return;
    async function mountMap() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !mapNode.current) return;
        const map = new maplibre.Map({ container: mapNode.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [-42.536, -19.477], zoom: compact ? 12.2 : 11.5, attributionControl: false });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-left");
        map.on("load", () => {
          if (cancelled) return;
          if (tracking) {
            map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [
              [-42.551, -19.489], [-42.547, -19.485], [-42.542, -19.481], [-42.538, -19.478], [-42.533, -19.474], [-42.527, -19.470],
            ] } } });
            map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#168A50", "line-width": 5, "line-opacity": 0.95 } });
          } else {
            points.forEach((point) => {
              const el = document.createElement("button");
              el.className = "map-marker";
              el.setAttribute("aria-label", `${point.type}: ${point.label}`);
              el.innerHTML = `<span>+</span>`;
              new maplibre.Marker({ element: el }).setLngLat([point.lng, point.lat])
                .setPopup(new maplibre.Popup({ offset: 24 }).setHTML(`<strong>${point.label}</strong><small>${point.type}</small>`)).addTo(map);
            });
          }
          setLoading(false);
        });
        mapRef.current = map;
      } catch {
        setFailed(true);
        setLoading(false);
      }
    }
    mountMap();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [compact, tracking]);

  return (
    <div className={`map-shell ${compact ? "map-compact" : ""}`}>
      <div ref={mapNode} className="absolute inset-0" />
      {loading && <div className="map-state"><LoaderCircle className="animate-spin" size={20} /> Preparando mapa…</div>}
      {failed && <div className="map-fallback"><Mountain size={28} /><strong>Mapa temporariamente indisponível</strong><span>Seu percurso continua protegido no dispositivo.</span></div>}
      {!compact && <button className="map-locate" aria-label="Explorar perto de mim"><LocateFixed size={18} /> Perto de mim</button>}
      {tracking && <div className="live-pill"><span /> GPS ativo</div>}
      {!tracking && !compact && <div className="map-hint"><MapPin size={15} /> 18 lugares próximos</div>}
    </div>
  );
}
