import { createClient } from "../lib/supabase/client";
import type { Activity, ActivityPoint } from "../types/domain";

export async function createActivity(activity: Omit<Activity, "id">) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.from("activities").insert(activity).select().single();
  if (error) throw new Error(`Não foi possível criar a atividade: ${error.message}`);
  return data as Activity;
}

export async function syncActivityPoints(points: ActivityPoint[]) {
  if (!points.length) return;
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("activity_points").insert(points);
  if (error) throw new Error(`Falha ao sincronizar o percurso: ${error.message}`);
}
