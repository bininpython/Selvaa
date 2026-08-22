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

export interface Activity {
  id: string; user_id: string; trail_id: string | null; title: string; description: string | null;
  activity_type: ActivityType; distance_m: number; duration_seconds: number; moving_time_seconds: number;
  elevation_gain_m: number; elevation_loss_m: number; max_altitude_m: number | null; min_altitude_m: number | null;
  avg_speed: number | null; max_speed: number | null; avg_pace: number | null; started_at: string;
  finished_at: string | null; difficulty: Difficulty | null; visibility: Visibility; route_geojson: GeoJSON.LineString | null;
}

export interface Trail {
  id: string; created_by: string | null; name: string; slug: string; description: string | null;
  location: string | null; distance_m: number; elevation_gain: number; difficulty: Difficulty;
  estimated_duration: number | null; route_geojson: GeoJSON.LineString | null; latitude: number | null;
  longitude: number | null; city: string | null; state: string | null; verified: boolean;
}

export namespace GeoJSON {
  export interface LineString { type: "LineString"; coordinates: [number, number][] }
}
