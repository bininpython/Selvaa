import { createClient } from "../lib/supabase/client";
import type { Trail } from "../types/domain";

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
