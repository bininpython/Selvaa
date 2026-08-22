import { calculateActivityMetrics, distanceMeters } from "../lib/activity-metrics";
import { deleteOfflineActivity, updateOfflineActivity } from "../lib/offline-route";
import { createClient } from "../lib/supabase/client";
import type { Activity, PublishActivityInput } from "../types/domain";

const PRIVATE_ENDPOINT_RADIUS_M = 200;

function publicRoutePoints(points: PublishActivityInput["points"], hideEndpoints: boolean) {
  if (!hideEndpoints || points.length < 3) return points;
  const firstVisible = points.findIndex((point) => distanceMeters(points[0], point) >= PRIVATE_ENDPOINT_RADIUS_M);
  let lastVisible = -1;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (distanceMeters(points.at(-1)!, points[index]) >= PRIVATE_ENDPOINT_RADIUS_M) {
      lastVisible = index;
      break;
    }
  }
  return firstVisible >= 0 && lastVisible > firstVisible ? points.slice(firstVisible, lastVisible + 1) : [];
}

export async function publishActivity(userId: string, input: PublishActivityInput) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const metrics = calculateActivityMetrics(input.points, input.durationSeconds);
  const { data: privacy } = await supabase.from("profiles")
    .select("hide_route_endpoints")
    .eq("id", userId)
    .maybeSingle();
  const visiblePoints = publicRoutePoints(input.points, privacy?.hide_route_endpoints !== false);
  await updateOfflineActivity(input.localId, { status: "syncing", title: input.title, description: input.description });

  const { data: activity, error: activityError } = await supabase.from("activities").insert({
    user_id: userId,
    title: input.title,
    description: input.description || null,
    activity_type: input.activityType,
    distance_m: metrics.distanceM,
    duration_seconds: input.durationSeconds,
    moving_time_seconds: metrics.movingTimeSeconds,
    elevation_gain_m: metrics.elevationGainM,
    elevation_loss_m: metrics.elevationLossM,
    max_altitude_m: metrics.maxAltitudeM,
    min_altitude_m: metrics.minAltitudeM,
    avg_speed: metrics.avgSpeedMps,
    max_speed: metrics.maxSpeedMps,
    avg_pace: metrics.avgPaceSecondsPerKm,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    difficulty: input.difficulty,
    trail_conditions: input.trailConditions || null,
    visibility: input.visibility,
    route_geojson: visiblePoints.length >= 2
      ? { type: "LineString", coordinates: visiblePoints.map((point) => [point.longitude, point.latitude]) }
      : null,
    sync_status: "syncing",
  }).select().single();
  if (activityError) {
    await updateOfflineActivity(input.localId, { status: "failed", error: activityError.message });
    throw new Error(`Não foi possível criar a atividade: ${activityError.message}`);
  }

  const typedActivity = activity as Activity;
  for (let index = 0; index < input.points.length; index += 500) {
    const batch = input.points.slice(index, index + 500).map((point) => ({
      activity_id: typedActivity.id,
      latitude: point.latitude,
      longitude: point.longitude,
      altitude: point.altitude,
      accuracy: point.accuracy,
      speed: point.speed,
      recorded_at: point.recordedAt,
    }));
    const { error } = await supabase.from("activity_points").insert(batch);
    if (error) {
      await updateOfflineActivity(input.localId, { status: "failed", error: error.message });
      throw new Error(`Atividade salva, mas a rota ainda precisa sincronizar: ${error.message}`);
    }
  }

  const { data: post, error: postError } = await supabase.from("posts").insert({
    user_id: userId,
    activity_id: typedActivity.id,
    title: input.title,
    body: input.description || null,
    visibility: input.visibility,
  }).select("id").single();
  if (postError) throw new Error(`Atividade salva, mas a publicação falhou: ${postError.message}`);

  for (const [sortOrder, photo] of input.photos.entries()) {
    const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${typedActivity.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("activity-photos").upload(path, photo, { upsert: false });
    if (uploadError) continue;
    await Promise.all([
      supabase.from("activity_photos").insert({ activity_id: typedActivity.id, user_id: userId, storage_path: path, sort_order: sortOrder }),
      supabase.from("post_photos").insert({ post_id: post.id, user_id: userId, storage_path: path, sort_order: sortOrder }),
    ]);
  }

  await supabase.from("activities").update({ sync_status: "synced" }).eq("id", typedActivity.id);
  await deleteOfflineActivity(input.localId);
  return typedActivity;
}
