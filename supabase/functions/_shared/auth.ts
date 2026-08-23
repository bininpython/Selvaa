export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const INTERNAL_AUTH_DOMAIN = "users.selva.invalid";

const BRAZIL_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function readNamedKey(name: string, legacyName: string) {
  const named = Deno.env.get(name);
  if (named) {
    try {
      const parsed = JSON.parse(named) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Supabase continues to expose the legacy single-value keys as a fallback.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

export function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function normalizeHumanText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function cleanHumanText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeKeyword(value: unknown) {
  return normalizeHumanText(value).replace(/[\u0000-\u001f\u007f]/g, "");
}

export function validBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && date <= new Date()
    && date.getUTCFullYear() >= 1900;
}

export function validState(value: string) {
  return BRAZIL_STATES.has(value);
}

export async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recoveryDigests(secret: string, fullName: string, birthDate: string, keyword: string) {
  const identityDigest = await hmacHex(secret, `selva:recovery:identity:v1:${normalizeHumanText(fullName)}|${birthDate}`);
  const keywordDigest = await hmacHex(secret, `selva:recovery:keyword:v1:${normalizeKeyword(keyword)}`);
  return { identityDigest, keywordDigest };
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || "unknown";
}
