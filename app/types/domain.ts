export type Visibility = "public" | "followers" | "private";
export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type ActivityType = "walking" | "trail" | "trekking" | "hiking" | "trail_running" | "mountaineering" | "cycling" | "mtb" | "camping" | "climbing" | "expedition";

export interface Profile {
  id: string; username: string; full_name: string; avatar_url: string | null; cover_url: string | null;
  bio: string | null; city: string | null; state: string | null; country: string; experience_level: string;
  interests: string[]; profile_visibility: "public" | "private"; hide_route_endpoints: boolean;
  created_at: string; updated_at: string;
}

export interface ActivityPoint {
  id?: number; activity_id: string; latitude: number; longitude: number; altitude: number | null;
  accuracy: number | null; speed: number | null; recorded_at: string;
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Activity {
  id: string; user_id: string; trail_id: string | null; title: string; description: string | null;
  activity_type: ActivityType; distance_m: number; duration_seconds: number; moving_time_seconds: number;
  elevation_gain_m: number; elevation_loss_m: number; max_altitude_m: number | null; min_altitude_m: number | null;
  avg_speed: number | null; max_speed: number | null; avg_pace: number | null; started_at: string;
  finished_at: string | null; difficulty: Difficulty | null; trail_conditions: string | null; visibility: Visibility;
  route_geojson: GeoJSONLineString | null;
}

export interface Trail {
  id: string; created_by: string | null; name: string; slug: string; description: string | null;
  location: string | null; distance_m: number; elevation_gain: number; difficulty: Difficulty;
  estimated_duration: number | null; route_geojson: GeoJSONLineString | null; latitude: number | null;
  longitude: number | null; region: string | null; city: string | null; state: string | null;
  terrain_type: string | null; max_altitude_m: number | null; best_season: string | null;
  water_source: boolean | null; cell_signal: string | null; camping_area: boolean | null;
  entrance_fee: number | null; parking: boolean | null; pets_allowed: boolean | null;
  guide_required: boolean | null; verified: boolean; created_at?: string; rating?: number; review_count?: number;
}

export interface UserStatistics {
  user_id: string; activity_count: number; total_distance_m: number; total_duration_seconds: number;
  total_elevation_gain_m: number; trails_completed: number; states_explored: number;
  places_discovered: number; reputation_points: number; updated_at: string;
}

export interface FeedPost {
  id: string; user_id: string; activity_id: string | null; title: string | null; body: string | null;
  location: string | null; visibility: Visibility; created_at: string; profile: Pick<Profile, "username" | "full_name" | "avatar_url"> | null;
  activity: Activity | null; photos: { id: string; storage_path: string; sort_order: number; signed_url?: string }[];
  likes: number; comments: number; liked_by_me: boolean;
}

export interface AdventureGroup {
  id: string; name: string; slug: string; description: string | null; avatar_url: string | null;
  city: string | null; state: string | null; privacy: "public" | "private"; member_count: number;
  joined?: boolean; role?: "owner" | "admin" | "moderator" | "member" | null;
}

export interface OutdoorEvent {
  id: string; name: string; description: string | null; start_at: string; meeting_point: string | null;
  difficulty: string | null; distance: number | null; max_participants: number | null; group_id: string | null;
  latitude?: number | null; longitude?: number | null; recommended_equipment?: string[] | null;
  participant_count?: number; response?: "going" | "maybe" | "not_going" | null;
}

export interface EnvironmentReport {
  id: string; user_id: string; trail_id: string | null; category: string; description: string;
  latitude: number; longitude: number; photo_url: string | null;
  status: "reported" | "confirmed" | "in_review" | "resolved";
  confirmation_count: number; created_at: string; confirmed_by_me?: boolean;
}

export interface AppNotification {
  id: string; user_id: string; actor_id: string | null; type: string; title: string;
  body: string | null; data: Record<string, unknown>; read_at: string | null; created_at: string;
}

export interface Achievement {
  id: string; code: string; name: string; description: string; icon: string | null;
  points: number; threshold: number | null; category: string | null; unlocked?: boolean;
}

export interface RecordedPoint {
  latitude: number; longitude: number; altitude: number | null; accuracy: number; speed: number | null; recordedAt: string;
}

export interface PublishActivityInput {
  localId: string; title: string; description: string; activityType: ActivityType; difficulty: Difficulty;
  trailConditions: string; visibility: Visibility; startedAt: string; finishedAt: string; durationSeconds: number;
  points: RecordedPoint[]; photos: File[];
}
