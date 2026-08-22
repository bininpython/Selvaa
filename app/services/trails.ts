import { createClient } from "../lib/supabase/client";
import type { Trail } from "../types/domain";

const TRAIL_FIELDS = "id,created_by,name,slug,description,location,distance_m,elevation_gain,difficulty,estimated_duration,route_geojson,latitude,longitude,region,city,state,terrain_type,max_altitude_m,best_season,water_source,cell_signal,camping_area,entrance_fee,parking,pets_allowed,guide_required,verified,created_at";

export async function listTrails(query = "", difficulty = "all", limit = 50): Promise<Trail[]> {
  const supabase = createClient();
  if (!supabase) return [];
  let request = supabase.from("trails").select(TRAIL_FIELDS).order("verified", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  const safeQuery = query.trim().replace(/[,%_().]/g, " ").replace(/\s+/g, " ").slice(0, 80);
  if (safeQuery.length >= 2) request = request.or(`name.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,state.ilike.%${safeQuery}%`);
  if (difficulty !== "all") request = request.eq("difficulty", difficulty);
  const { data, error } = await request;
  if (error) throw new Error(`Não foi possível carregar as trilhas: ${error.message}`);
  return (data ?? []) as unknown as Trail[];
}

export async function getNearbyTrails(latitude: number, longitude: number, radiusM = 50_000): Promise<Trail[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("nearby_trails", { lat: latitude, lng: longitude, radius_m: radiusM });
  if (error) throw new Error(`Não foi possível buscar trilhas próximas: ${error.message}`);
  return (data ?? []) as Trail[];
}

export async function saveTrail(userId: string, trailId: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("saved_items").upsert({ user_id: userId, item_type: "trail", item_id: trailId });
  if (error) throw new Error(`Não foi possível salvar a trilha: ${error.message}`);
}

export async function unsaveTrail(userId: string, trailId: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("saved_items").delete().eq("user_id", userId).eq("item_type", "trail").eq("item_id", trailId);
  if (error) throw new Error(`Não foi possível remover a trilha: ${error.message}`);
}

export async function createTrail(userId: string, input: {
  name: string; description: string; location: string; city: string; state: string;
  distanceKm: number; elevationGainM: number; difficulty: string; durationMinutes: number;
  latitude: number; longitude: number; terrainType: string; bestSeason: string;
  waterSource: boolean; cellSignal: string; campingArea: boolean; parking: boolean;
  petsAllowed: boolean; guideRequired: boolean;
}): Promise<Trail> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const slugBase = input.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "trilha";
  const { data, error } = await supabase.from("trails").insert({
    created_by: userId, name: input.name.trim(), slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
    description: input.description.trim() || null, location: input.location.trim() || null,
    city: input.city.trim() || null, state: input.state.trim().toUpperCase() || null,
    distance_m: Math.max(0, Math.round(input.distanceKm * 1000)), elevation_gain: Math.max(0, Math.round(input.elevationGainM)),
    difficulty: input.difficulty, estimated_duration: Math.max(0, Math.round(input.durationMinutes * 60)),
    latitude: input.latitude, longitude: input.longitude, terrain_type: input.terrainType.trim() || null,
    best_season: input.bestSeason.trim() || null, water_source: input.waterSource, cell_signal: input.cellSignal.trim() || null,
    camping_area: input.campingArea, parking: input.parking, pets_allowed: input.petsAllowed, guide_required: input.guideRequired,
  }).select(TRAIL_FIELDS).single();
  if (error) throw new Error(`Não foi possível cadastrar a trilha: ${error.message}`);
  return data as unknown as Trail;
}

export async function addTrailReview(userId: string, trailId: string, rating: number, review: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("trail_reviews").upsert({ user_id: userId, trail_id: trailId, rating, review: review.trim() || null }, { onConflict: "trail_id,user_id" });
  if (error) throw new Error(`Não foi possível avaliar a trilha: ${error.message}`);
}
