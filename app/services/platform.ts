import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import type { AdventureGroup, FeedPost, OutdoorEvent, Profile, UserStatistics } from "../types/domain";

type RawFeedPost = Omit<FeedPost, "profile" | "activity" | "photos" | "likes" | "comments" | "liked_by_me"> & {
  profile: FeedPost["profile"] | FeedPost["profile"][];
  activity: FeedPost["activity"] | FeedPost["activity"][];
  photos: FeedPost["photos"];
  like_rows: { user_id: string }[];
  comment_rows: { id: string }[];
};

export async function loadProfile(user: User): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(`Falha ao carregar perfil: ${error.message}`);
  return data as Profile | null;
}

export async function loadStatistics(userId: string): Promise<UserStatistics | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_statistics").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Falha ao carregar estatísticas: ${error.message}`);
  return data as UserStatistics | null;
}

export async function loadWeeklyStatistics(userId: string) {
  const supabase = createClient();
  if (!supabase) return { activities: 0, distanceM: 0, durationSeconds: 0, elevationGainM: 0 };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const { data, error } = await supabase.from("activities")
    .select("distance_m,duration_seconds,elevation_gain_m")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString());
  if (error) throw new Error(`Falha ao carregar a semana: ${error.message}`);
  return (data ?? []).reduce((summary, activity) => ({
    activities: summary.activities + 1,
    distanceM: summary.distanceM + Number(activity.distance_m),
    durationSeconds: summary.durationSeconds + Number(activity.duration_seconds),
    elevationGainM: summary.elevationGainM + Number(activity.elevation_gain_m),
  }), { activities: 0, distanceM: 0, durationSeconds: 0, elevationGainM: 0 });
}

export async function loadFeed(userId?: string, from = 0, limit = 15): Promise<FeedPost[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("posts").select(`
    id,user_id,activity_id,title,body,location,visibility,created_at,
    profile:profiles!posts_user_id_fkey(username,full_name,avatar_url),
    activity:activities!posts_activity_id_fkey(*),
    photos:post_photos(id,storage_path,sort_order),
    like_rows:likes(user_id),comment_rows:comments(id)
  `).order("created_at", { ascending: false }).range(from, from + limit - 1);
  if (error) throw new Error(`Falha ao carregar o feed: ${error.message}`);
  const posts = ((data ?? []) as unknown as RawFeedPost[]).map((post) => ({
    ...post,
    profile: Array.isArray(post.profile) ? post.profile[0] ?? null : post.profile,
    activity: Array.isArray(post.activity) ? post.activity[0] ?? null : post.activity,
    photos: post.photos ?? [],
    likes: post.like_rows?.length ?? 0,
    comments: post.comment_rows?.length ?? 0,
    liked_by_me: Boolean(userId && post.like_rows?.some((like) => like.user_id === userId)),
  }));
  const paths = posts.flatMap((post) => post.photos.map((photo) => photo.storage_path));
  if (!paths.length) return posts;
  const { data: signed } = await supabase.storage.from("activity-photos").createSignedUrls(paths, 3600);
  const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return posts.map((post) => ({ ...post, photos: post.photos.map((photo) => ({ ...photo, signed_url: urls.get(photo.storage_path) ?? undefined })) }));
}

export async function toggleLike(userId: string, postId: string, liked: boolean) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const result = liked
    ? await supabase.from("likes").delete().eq("user_id", userId).eq("post_id", postId)
    : await supabase.from("likes").insert({ user_id: userId, post_id: postId });
  if (result.error) throw new Error(`Não foi possível atualizar a curtida: ${result.error.message}`);
}

export async function addComment(userId: string, postId: string, body: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.from("comments").insert({ user_id: userId, post_id: postId, body });
  if (error) throw new Error(`Não foi possível comentar: ${error.message}`);
}

export async function toggleSavedPost(userId: string, postId: string, saved: boolean) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const result = saved
    ? await supabase.from("saved_items").delete().eq("user_id", userId).eq("item_type", "post").eq("item_id", postId)
    : await supabase.from("saved_items").upsert({ user_id: userId, item_type: "post", item_id: postId });
  if (result.error) throw new Error(`Não foi possível atualizar os salvos: ${result.error.message}`);
}

export async function toggleFollow(userId: string, profileId: string) {
  if (userId === profileId) throw new Error("Este é o seu próprio perfil");
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.from("follows").select("follower_id").eq("follower_id", userId).eq("following_id", profileId).maybeSingle();
  if (error) throw new Error(`Não foi possível verificar o perfil: ${error.message}`);
  const result = data
    ? await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", profileId)
    : await supabase.from("follows").insert({ follower_id: userId, following_id: profileId });
  if (result.error) throw new Error(`Não foi possível atualizar o perfil: ${result.error.message}`);
  return !data;
}

export type GlobalSearchResult = { id: string; type: "user" | "trail" | "group" | "event"; title: string; subtitle: string };

export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  const supabase = createClient();
  if (!supabase || query.trim().length < 2) return [];
  const safeQuery = query.trim().replace(/[,%_().]/g, " ").replace(/\s+/g, " ").slice(0, 80);
  if (safeQuery.length < 2) return [];
  const value = `%${safeQuery}%`;
  const [profiles, trails, groups, events] = await Promise.all([
    supabase.from("profiles").select("id,full_name,username,city,state").or(`full_name.ilike.${value},username.ilike.${value}`).limit(5),
    supabase.from("trails").select("id,name,city,state,difficulty").ilike("name", value).limit(5),
    supabase.from("groups").select("id,name,city,state,member_count").ilike("name", value).limit(5),
    supabase.from("events").select("id,name,start_at,meeting_point").ilike("name", value).limit(5),
  ]);
  const error = profiles.error ?? trails.error ?? groups.error ?? events.error;
  if (error) throw new Error(`Falha na pesquisa: ${error.message}`);
  return [
    ...(profiles.data ?? []).map((item) => ({ id: item.id, type: "user" as const, title: item.full_name, subtitle: `@${item.username}${item.city ? ` · ${item.city}${item.state ? `, ${item.state}` : ""}` : ""}` })),
    ...(trails.data ?? []).map((item) => ({ id: item.id, type: "trail" as const, title: item.name, subtitle: `${item.city ?? item.state ?? "Brasil"} · ${item.difficulty}` })),
    ...(groups.data ?? []).map((item) => ({ id: item.id, type: "group" as const, title: item.name, subtitle: `${item.city ?? item.state ?? "Brasil"} · ${item.member_count} membros` })),
    ...(events.data ?? []).map((item) => ({ id: item.id, type: "event" as const, title: item.name, subtitle: `${new Date(item.start_at).toLocaleDateString("pt-BR")} · ${item.meeting_point ?? "Local a confirmar"}` })),
  ];
}

export async function loadCommunity(userId?: string) {
  const supabase = createClient();
  if (!supabase) return { groups: [] as AdventureGroup[], events: [] as OutdoorEvent[] };
  const [groupsResult, eventsResult, membershipsResult, responsesResult] = await Promise.all([
    supabase.from("groups").select("id,name,slug,description,avatar_url,city,state,privacy,member_count").order("member_count", { ascending: false }).limit(12),
    supabase.from("events").select("id,name,description,start_at,meeting_point,difficulty,distance,max_participants,group_id,latitude,longitude,recommended_equipment,event_participants(user_id,response)").gte("start_at", new Date().toISOString()).order("start_at").limit(12),
    userId ? supabase.from("group_members").select("group_id,role").eq("user_id", userId) : Promise.resolve({ data: [], error: null }),
    userId ? supabase.from("event_participants").select("event_id,response").eq("user_id", userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = groupsResult.error ?? eventsResult.error ?? membershipsResult.error ?? responsesResult.error;
  if (error) throw new Error(`Falha ao carregar a comunidade: ${error.message}`);
  const memberships = new Map((membershipsResult.data ?? []).map((item) => [item.group_id, item.role]));
  const responses = new Map((responsesResult.data ?? []).map((item) => [item.event_id, item.response]));
  const groups = (groupsResult.data ?? []).map((group) => ({ ...group, joined: memberships.has(group.id), role: memberships.get(group.id) ?? null })) as AdventureGroup[];
  const events = (eventsResult.data ?? []).map((event) => ({ ...event, participant_count: event.event_participants?.filter((item: { response: string }) => item.response === "going").length ?? 0, response: responses.get(event.id) ?? null })) as unknown as OutdoorEvent[];
  return { groups, events };
}

export async function createEnvironmentReport(userId: string, input: { category: string; description: string; latitude: number; longitude: number; photo?: File }) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  let photoUrl: string | null = null;
  if (input.photo) {
    const extension = input.photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("environment-reports").upload(path, input.photo);
    if (error) throw new Error(`Não foi possível enviar a foto: ${error.message}`);
    photoUrl = path;
  }
  const { error } = await supabase.from("environment_reports").insert({ user_id: userId, category: input.category, description: input.description, latitude: input.latitude, longitude: input.longitude, photo_url: photoUrl });
  if (error) throw new Error(`Não foi possível criar a ocorrência: ${error.message}`);
}

export function publicStorageUrl(bucket: string, path: string) {
  return createClient()?.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? "";
}
