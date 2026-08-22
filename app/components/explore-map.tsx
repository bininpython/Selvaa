"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { LoaderCircle, LocateFixed, MapPin, Mountain } from "lucide-react";

export type RouteCoordinate = [longitude: number, latitude: number];

type ExploreMapProps = {
  compact?: boolean;
  tracking?: boolean;
  route?: RouteCoordinate[];
  markers?: { id: string; coordinate: RouteCoordinate; label: string }[];
  onLocated?: (coordinate: RouteCoordinate) => void;
};

const DEFAULT_CENTER: RouteCoordinate = [-43.938, -19.919];

function routeFeature(route: RouteCoordinate[]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: route,
    },
  };
}

export function ExploreMap({ compact = false, tracking = false, route = [], markers = [], onLocated }: ExploreMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locationMarkerRef = useRef<Marker | null>(null);
  const discoveryMarkersRef = useRef<Marker[]>([]);
  const initialRouteRef = useRef(route);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mountAttempt, setMountAttempt] = useState(0);
  const [mapMessage, setMapMessage] = useState("O GPS e o registro offline continuam disponíveis.");
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "located" | "denied">("idle");

  useEffect(() => {
    let cancelled = false;
    if (!mapNode.current || mapRef.current) return;

    async function mountMap() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !mapNode.current) return;
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const supportCanvas = document.createElement("canvas");
        if (!supportCanvas.getContext("webgl2")) {
          setMapMessage("Este navegador bloqueou o recurso gráfico necessário. O GPS continua funcionando normalmente.");
          setFailed(true);
          setLoading(false);
          return;
        }

        const initialRoute = initialRouteRef.current;
        const initialCenter = initialRoute.at(-1) ?? DEFAULT_CENTER;
        const map = new maplibre.Map({
          container: mapNode.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: initialCenter,
          zoom: initialRoute.length ? 15 : compact ? 11 : 6.2,
          attributionControl: false,
          cooperativeGestures: true,
        });

        map.addControl(new maplibre.NavigationControl({ showCompass: true }), "bottom-right");
        map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-left");
        let mapLoaded = false;
        const loadTimeout = window.setTimeout(() => {
          if (cancelled || mapLoaded) return;
          setMapMessage("A conexão com o mapa demorou mais que o esperado. Você pode tentar novamente sem perder o GPS.");
          setFailed(true);
          setLoading(false);
        }, 15_000);
        map.on("load", () => {
          if (cancelled) return;
          mapLoaded = true;
          window.clearTimeout(loadTimeout);
          map.addSource("activity-route", {
            type: "geojson",
            data: routeFeature(initialRoute),
          });
          map.addLayer({
            id: "activity-route-line",
            type: "line",
            source: "activity-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#168A50",
              "line-width": 5,
              "line-opacity": 0.95,
            },
          });
          map.resize();
          setLoading(false);
          setFailed(false);
          setReady(true);
        });
        map.on("error", () => {
          if (cancelled || mapLoaded) return;
          setMapMessage("Não foi possível baixar os dados do mapa. Verifique a conexão e tente novamente.");
        });
        mapRef.current = map;
      } catch {
        setMapMessage("Não foi possível iniciar o mapa neste navegador. O GPS continua disponível.");
        setFailed(true);
        setLoading(false);
      }
    }

    mountMap();
    return () => {
      cancelled = true;
      locationMarkerRef.current?.remove();
      discoveryMarkersRef.current.forEach((marker) => marker.remove());
      discoveryMarkersRef.current = [];
      locationMarkerRef.current = null;
      try { mapRef.current?.remove(); } catch { /* A partially initialized WebGL map has no painter to destroy. */ }
      mapRef.current = null;
    };
  }, [compact, mountAttempt]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource("activity-route") as GeoJSONSource | undefined;
    source?.setData(routeFeature(route));

    const current = route.at(-1);
    if (tracking && current) {
      mapRef.current.easeTo({ center: current, zoom: 16, duration: 450 });
    }
  }, [ready, route, tracking]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    discoveryMarkersRef.current.forEach((marker) => marker.remove());
    discoveryMarkersRef.current = [];
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !mapRef.current) return;
      discoveryMarkersRef.current = markers.map((item) => {
        const node = document.createElement("button");
        node.className = "trail-map-marker";
        node.type = "button";
        node.setAttribute("aria-label", item.label);
        node.title = item.label;
        return new maplibre.Marker({ element: node }).setLngLat(item.coordinate).addTo(mapRef.current!);
      });
    });
    return () => { cancelled = true; };
  }, [markers, ready]);

  async function locateUser() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const current: RouteCoordinate = [coords.longitude, coords.latitude];
      if (mapRef.current && ready) {
        const maplibre = await import("maplibre-gl");
        const markerNode = document.createElement("span");
        markerNode.className = "user-location-marker";
        markerNode.setAttribute("aria-label", "Sua localização aproximada");

        locationMarkerRef.current?.remove();
        locationMarkerRef.current = new maplibre.Marker({ element: markerNode })
          .setLngLat(current)
          .addTo(mapRef.current);
        mapRef.current.flyTo({ center: current, zoom: 14.5, duration: 900 });
      }
      setLocationStatus("located");
      onLocated?.(current);
    }, () => setLocationStatus("denied"), {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 12_000,
    });
  }

  return (
    <div className={`map-shell ${compact ? "map-compact" : ""}`}>
      <div ref={mapNode} className="absolute inset-0" />
      {loading ? <div className="map-state"><LoaderCircle className="animate-spin" size={20} /> Preparando mapa…</div> : null}
      {failed ? <div className="map-fallback"><Mountain size={28} /><strong>Mapa temporariamente indisponível</strong><span>{mapMessage}</span><button type="button" onClick={() => { setFailed(false); setLoading(true); setReady(false); setMountAttempt((attempt) => attempt + 1); }}>Tentar novamente</button></div> : null}
      {!tracking ? (
        <button className="map-locate" onClick={locateUser} aria-label="Usar minha localização">
          {locationStatus === "locating" ? <LoaderCircle className="animate-spin" size={18} /> : <LocateFixed size={18} />}
          {locationStatus === "located" ? "Localizado" : locationStatus === "denied" ? "Autorizar GPS" : "Perto de mim"}
        </button>
      ) : null}
      {tracking ? <div className="live-pill"><span /> {route.length ? "GPS registrando" : "Aguardando GPS"}</div> : null}
      {!tracking && !compact ? <div className="map-hint"><MapPin size={15} /> Trilhas aparecerão com dados da comunidade</div> : null}
    </div>
  );
}
