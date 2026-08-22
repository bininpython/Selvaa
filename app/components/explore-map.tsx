"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { LoaderCircle, LocateFixed, MapPin, Mountain } from "lucide-react";

export type RouteCoordinate = [longitude: number, latitude: number];

type ExploreMapProps = {
  compact?: boolean;
  tracking?: boolean;
  route?: RouteCoordinate[];
  markers?: { id: string; coordinate: RouteCoordinate; label: string }[];
  onLocated?: (coordinate: RouteCoordinate) => void;
};

const DEFAULT_CENTER: RouteCoordinate = [-51.93, -14.24];
const BASEMAP_SOURCE_ID = "carto-voyager";
const BASEMAP_STYLE = {
  version: 8,
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: "© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors · © <a href=\"https://carto.com/attributions\">CARTO</a>",
    },
  },
  layers: [{
    id: "carto-voyager-base",
    type: "raster",
    source: BASEMAP_SOURCE_ID,
    minzoom: 0,
    maxzoom: 22,
  }],
} satisfies StyleSpecification;

function routeData(route: RouteCoordinate[]) {
  if (route.length < 2) {
    return { type: "FeatureCollection" as const, features: [] };
  }
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
  const [userCoordinate, setUserCoordinate] = useState<RouteCoordinate | null>(null);
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
          style: BASEMAP_STYLE,
          center: initialCenter,
          zoom: initialRoute.length ? 15 : compact ? 4.2 : 4.4,
          attributionControl: false,
          cooperativeGestures: true,
        });

        map.addControl(new maplibre.NavigationControl({ showCompass: true }), "bottom-right");
        map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-left");
        let baseMapReady = false;
        let baseMapErrors = 0;
        const finishMapLoad = () => {
          if (cancelled || baseMapReady || !map.isSourceLoaded(BASEMAP_SOURCE_ID)) return;
          baseMapReady = true;
          window.clearTimeout(loadTimeout);
          map.resize();
          setLoading(false);
          setFailed(false);
          setReady(true);
        };
        const loadTimeout = window.setTimeout(() => {
          if (cancelled || baseMapReady) return;
          setMapMessage("A camada cartográfica não respondeu. Tente novamente; o GPS e a rota continuam protegidos.");
          setFailed(true);
          setLoading(false);
        }, 20_000);
        map.on("load", () => {
          if (cancelled) return;
          map.addSource("activity-route", {
            type: "geojson",
            data: routeData(initialRoute),
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
          finishMapLoad();
        });
        map.on("sourcedata", (event) => {
          if (event.sourceId === BASEMAP_SOURCE_ID) finishMapLoad();
        });
        map.on("idle", finishMapLoad);
        map.on("error", () => {
          if (cancelled || baseMapReady) return;
          baseMapErrors += 1;
          if (baseMapErrors < 2) return;
          window.clearTimeout(loadTimeout);
          setMapMessage("Não foi possível baixar os blocos do mapa. Verifique a conexão e tente novamente.");
          setFailed(true);
          setLoading(false);
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
    source?.setData(routeData(route));

    const current = route.at(-1);
    if (tracking && current) {
      mapRef.current.easeTo({ center: current, zoom: 16, duration: 450 });
    }
  }, [ready, route, tracking]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const current = tracking ? route.at(-1) : userCoordinate;
    if (!current) return;
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !mapRef.current) return;
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setLngLat(current);
      } else {
        const markerNode = document.createElement("span");
        markerNode.className = "user-location-marker";
        markerNode.setAttribute("aria-label", tracking ? "Posição GPS atual" : "Sua localização aproximada");
        locationMarkerRef.current = new maplibre.Marker({ element: markerNode })
          .setLngLat(current)
          .addTo(mapRef.current);
      }
      mapRef.current.easeTo({ center: current, zoom: tracking ? 16 : 14.5, duration: tracking ? 450 : 900 });
    });
    return () => { cancelled = true; };
  }, [ready, route, tracking, userCoordinate]);

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
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const current: RouteCoordinate = [coords.longitude, coords.latitude];
      setUserCoordinate(current);
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
      <div ref={mapNode} className="map-canvas" />
      {loading ? <div className="map-state"><LoaderCircle className="animate-spin" size={20} /> Preparando mapa…</div> : null}
      {failed ? <div className="map-fallback"><Mountain size={28} /><strong>Mapa temporariamente indisponível</strong><span>{mapMessage}</span><button type="button" onClick={() => { setFailed(false); setLoading(true); setReady(false); setMountAttempt((attempt) => attempt + 1); }}>Tentar novamente</button></div> : null}
      {!tracking ? (
        <button className="map-locate" onClick={locateUser} aria-label="Usar minha localização">
          {locationStatus === "locating" ? <LoaderCircle className="animate-spin" size={18} /> : <LocateFixed size={18} />}
          {locationStatus === "located" ? "Localizado" : locationStatus === "denied" ? "Autorizar GPS" : "Perto de mim"}
        </button>
      ) : null}
      {tracking ? <div className="live-pill"><span /> {route.length ? "GPS registrando" : "Aguardando GPS"}</div> : null}
      {!tracking && !compact ? <div className="map-hint"><MapPin size={15} /> CARTO + OpenStreetMap · trilhas reais</div> : null}
    </div>
  );
}
