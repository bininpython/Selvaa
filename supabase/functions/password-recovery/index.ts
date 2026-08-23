import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  cleanHumanText, corsHeaders, hmacHex, json, normalizeKeyword, readNamedKey,
  recoveryDigests, requestIp, validBirthDate,
} from "../_shared/auth.ts";

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 30 * 60 * 1000;
const MAX_FAILURES = 5;
const GENERIC_ERROR = "Não foi possível confirmar os dados. Confira nome, data de nascimento e palavra-chave.";

type Attempt = {
  attempt_key: string;
  failures: number;
  window_started_at: string;
  blocked_until: string | null;
};

async function recordFailures(admin: SupabaseClient, keys: string[], current: Attempt[]) {
  const now = new Date();
  const existing = new Map(current.map((attempt) => [attempt.attempt_key, attempt]));
  const rows = keys.map((key) => {
    const attempt = existing.get(key);
    const windowStarted = attempt ? new Date(attempt.window_started_at) : now;
    const insideWindow = now.getTime() - windowStarted.getTime() < WINDOW_MS;
    const failures = insideWindow ? Number(attempt?.failures ?? 0) + 1 : 1;
    return {
      attempt_key: key,
      failures,
      window_started_at: (insideWindow ? windowStarted : now).toISOString(),
      blocked_until: failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS).toISOString() : null,
      last_attempt_at: now.toISOString(),
    };
  });
  await admin.from("password_recovery_attempts").upsert(rows, { onConflict: "attempt_key" });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) return json({ ok: false, error: GENERIC_ERROR }, 413);

  let body: {
    fullName?: unknown;
    birthDate?: unknown;
    recoveryKeyword?: unknown;
    newPassword?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: GENERIC_ERROR });
  }

  const fullName = cleanHumanText(body.fullName);
  const birthDate = String(body.birthDate ?? "");
  const recoveryKeyword = cleanHumanText(body.recoveryKeyword);
  const newPassword = String(body.newPassword ?? "");
  if (fullName.length < 2 || fullName.length > 80 || !validBirthDate(birthDate)) {
    return json({ ok: false, error: GENERIC_ERROR });
  }
  if (normalizeKeyword(recoveryKeyword).length < 4 || recoveryKeyword.length > 80) {
    return json({ ok: false, error: GENERIC_ERROR });
  }
  if (newPassword.length < 8 || newPassword.length > 72) {
    return json({ ok: false, error: "A nova senha deve ter entre 8 e 72 caracteres." });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = readNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  if (!url || !secretKey || !publicKey) {
    return json({ ok: false, error: "Recuperação indisponível no momento." }, 503);
  }

  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { identityDigest, keywordDigest } = await recoveryDigests(secretKey, fullName, birthDate, recoveryKeyword);
  const ipDigest = await hmacHex(secretKey, `selva:recovery:ip:v1:${requestIp(request)}`);
  const attemptKeys = [`identity:${identityDigest}`, `ip:${ipDigest}`];
  const attemptsResult = await admin.from("password_recovery_attempts")
    .select("attempt_key,failures,window_started_at,blocked_until")
    .in("attempt_key", attemptKeys);
  if (attemptsResult.error) return json({ ok: false, error: "Recuperação indisponível no momento." }, 503);

  const attempts = (attemptsResult.data ?? []) as Attempt[];
  const now = Date.now();
  if (attempts.some((attempt) => attempt.blocked_until && new Date(attempt.blocked_until).getTime() > now)) {
    return json({ ok: false, error: "Muitas tentativas. Aguarde 30 minutos e tente novamente." });
  }

  const credentials = await admin.from("account_recovery_credentials")
    .select("user_id")
    .eq("identity_digest", identityDigest)
    .eq("keyword_digest", keywordDigest)
    .limit(2);
  if (credentials.error || credentials.data?.length !== 1) {
    await recordFailures(admin, attemptKeys, attempts);
    return json({ ok: false, error: GENERIC_ERROR });
  }

  const userId = credentials.data[0].user_id;
  const authUser = await admin.auth.admin.getUserById(userId);
  if (authUser.error || !authUser.data.user?.email) {
    return json({ ok: false, error: "Recuperação indisponível no momento." }, 503);
  }

  const updated = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (updated.error) return json({ ok: false, error: "Não foi possível definir a nova senha." }, 500);

  await admin.from("password_recovery_attempts").delete().in("attempt_key", attemptKeys);

  const auth = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await auth.auth.signInWithPassword({
    email: authUser.data.user.email,
    password: newPassword,
  });
  if (signedIn.error || !signedIn.data.session) {
    return json({ ok: false, error: "Senha alterada. Entre novamente com sua nova senha." }, 500);
  }

  return json({
    ok: true,
    session: {
      access_token: signedIn.data.session.access_token,
      refresh_token: signedIn.data.session.refresh_token,
    },
  });
});
