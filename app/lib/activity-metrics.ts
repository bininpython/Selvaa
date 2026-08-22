import type { RecordedPoint } from "../types/domain";

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: Pick<RecordedPoint, "latitude" | "longitude">, b: Pick<RecordedPoint, "latitude" | "longitude">) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const latitudeA = radians(a.latitude);
  const latitudeB = radians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function calculateActivityMetrics(points: RecordedPoint[], durationSeconds: number) {
  let distanceM = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let maxSpeed = 0;
  let movingTimeSeconds = 0;
  const altitudes: number[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.altitude !== null) altitudes.push(point.altitude);
    if (point.speed !== null && point.speed >= 0 && point.speed < 60) maxSpeed = Math.max(maxSpeed, point.speed);
    if (index === 0) continue;
    const segmentDistance = distanceMeters(points[index - 1], point);
    const segmentSeconds = Math.max(0, Math.min(120, (new Date(point.recordedAt).getTime() - new Date(points[index - 1].recordedAt).getTime()) / 1000));
    distanceM += segmentDistance;
    if (segmentSeconds > 0 && segmentDistance / segmentSeconds >= 0.5) movingTimeSeconds += segmentSeconds;
    const previousAltitude = points[index - 1].altitude;
    if (previousAltitude !== null && point.altitude !== null) {
      const delta = point.altitude - previousAltitude;
      if (delta >= 3) elevationGainM += delta;
      else if (delta <= -3) elevationLossM += Math.abs(delta);
    }
  }

  return {
    distanceM,
    movingTimeSeconds: Math.min(durationSeconds, Math.round(movingTimeSeconds)),
    elevationGainM,
    elevationLossM,
    minAltitudeM: altitudes.length ? Math.min(...altitudes) : null,
    maxAltitudeM: altitudes.length ? Math.max(...altitudes) : null,
    avgSpeedMps: durationSeconds > 0 ? distanceM / durationSeconds : 0,
    maxSpeedMps: maxSpeed,
    avgPaceSecondsPerKm: distanceM >= 50 && durationSeconds > 0 ? durationSeconds / (distanceM / 1000) : null,
  };
}
