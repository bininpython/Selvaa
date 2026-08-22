import { createClient } from "../lib/supabase/client";
import type { Achievement, AdventureGroup, AppNotification, EnvironmentReport, OutdoorEvent, Profile } from "../types/domain";

export async function createGroup(userId: string, input: { name: string; description: string; city: string; state: string; privacy: "public" | "private" }) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const base = input.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "grupo";
  const { data, error } = await supabase.from("groups").insert({ owner_id: userId, name: input.name.trim(), slug: `${base}-${crypto.randomUUID().slice(0, 8)}`, description: input.description.trim() || null, city: input.city.trim() || null, state: input.state.trim().toUpperCase() || null, privacy: input.privacy }).select("id,name,slug,description,avatar_url,city,state,privacy,member_count").single();
  if (error) throw new Error(`Não foi possível criar o grupo: ${error.message}`);
  return data as AdventureGroup;
}

export async function joinGroup(userId: string, group: AdventureGroup) {
  if (group.privacy === "private") throw new Error("Grupos privados aceitam membros somente por convite.");
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: userId, role: "member" });
  if (error) throw new Error(`Não foi possível entrar no grupo: ${error.message}`);
}

export async function leaveGroup(userId: string, groupId: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId).eq("role", "member");
  if (error) throw new Error(`Não foi possível sair do grupo: ${error.message}`);
}

export async function createEvent(userId: string, input: { groupId?: string; name: string; description: string; startAt: string; meetingPoint: string; difficulty: string; distanceKm: number; maxParticipants: number; equipment: string }) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.from("events").insert({ creator_id: userId, group_id: input.groupId || null, name: input.name.trim(), description: input.description.trim() || null, start_at: new Date(input.startAt).toISOString(), meeting_point: input.meetingPoint.trim() || null, difficulty: input.difficulty, distance: Math.max(0, input.distanceKm), max_participants: input.maxParticipants > 0 ? Math.round(input.maxParticipants) : null, recommended_equipment: input.equipment.split(",").map((item) => item.trim()).filter(Boolean), visibility: input.groupId ? "group" : "public" }).select("id,name,description,start_at,meeting_point,difficulty,distance,max_participants,group_id,recommended_equipment").single();
  if (error) throw new Error(`Não foi possível criar o evento: ${error.message}`);
  return data as OutdoorEvent;
}

export async function respondToEvent(userId: string, eventId: string, response: "going" | "maybe" | "not_going") {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("event_participants").upsert({ event_id: eventId, user_id: userId, response }, { onConflict: "event_id,user_id" });
  if (error) throw new Error(`Não foi possível responder ao evento: ${error.message}`);
}

export async function updateProfile(userId: string, input: Pick<Profile, "full_name" | "bio" | "city" | "state" | "experience_level" | "profile_visibility" | "hide_route_endpoints">) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("profiles").update({ ...input, full_name: input.full_name.trim(), bio: input.bio?.trim() || null, city: input.city?.trim() || null, state: input.state?.trim().toUpperCase() || null }).eq("id", userId);
  if (error) throw new Error(`Não foi possível atualizar o perfil: ${error.message}`);
}

export async function loadNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("notifications").select("id,user_id,actor_id,type,title,body,data,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(`Não foi possível carregar as notificações: ${error.message}`);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationsRead(userId: string) {
  const supabase = createClient();
  if (!supabase) return;
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (error) throw new Error(`Não foi possível atualizar as notificações: ${error.message}`);
}

export async function loadAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const [all, unlocked] = await Promise.all([
    supabase.from("achievements").select("id,code,name,description,icon,points,threshold,category").order("threshold"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  const error = all.error ?? unlocked.error;
  if (error) throw new Error(`Não foi possível carregar as conquistas: ${error.message}`);
  const ids = new Set((unlocked.data ?? []).map((item) => item.achievement_id));
  return (all.data ?? []).map((item) => ({ ...item, unlocked: ids.has(item.id) })) as Achievement[];
}

export async function loadEnvironmentReports(userId?: string): Promise<EnvironmentReport[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("environment_reports").select("id,user_id,trail_id,category,description,latitude,longitude,photo_url,status,confirmation_count,created_at,report_confirmations(user_id)").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Não foi possível carregar o mapa ambiental: ${error.message}`);
  return (data ?? []).map((item) => ({ ...item, confirmed_by_me: Boolean(userId && item.report_confirmations?.some((confirmation: { user_id: string }) => confirmation.user_id === userId)) })) as unknown as EnvironmentReport[];
}

export async function toggleReportConfirmation(userId: string, reportId: string, confirmed: boolean) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const result = confirmed ? await supabase.from("report_confirmations").delete().eq("report_id", reportId).eq("user_id", userId) : await supabase.from("report_confirmations").insert({ report_id: reportId, user_id: userId });
  if (result.error) throw new Error(`Não foi possível confirmar a ocorrência: ${result.error.message}`);
}

export async function createPlace(userId: string, input: { name: string; category: string; description: string; latitude: number; longitude: number; city: string; state: string }) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("places").insert({ created_by: userId, name: input.name.trim(), category: input.category, description: input.description.trim() || null, latitude: input.latitude, longitude: input.longitude, city: input.city.trim() || null, state: input.state.trim().toUpperCase() || null });
  if (error) throw new Error(`Não foi possível cadastrar o local: ${error.message}`);
}

export async function createPost(userId: string, input: { title: string; body: string; location: string; visibility: string }) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("posts").insert({ user_id: userId, title: input.title.trim() || null, body: input.body.trim(), location: input.location.trim() || null, visibility: input.visibility });
  if (error) throw new Error(`Não foi possível publicar: ${error.message}`);
}
