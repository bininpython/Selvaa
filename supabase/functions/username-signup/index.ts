import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  cleanHumanText, corsHeaders, INTERNAL_AUTH_DOMAIN, json, normalizeKeyword, normalizeUsername,
  readNamedKey, recoveryDigests, requestIp, USERNAME_PATTERN, validBirthDate, validState,
} from "../_shared/auth.ts";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function allowAttempt(request: Request) {
  const key = requestIp(request);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    if (attempts.size > 1_000) {
      for (const [storedKey, stored] of attempts) if (stored.resetAt <= now) attempts.delete(storedKey);
    }
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);
  if (!allowAttempt(request)) return json({ ok: false, error: "Muitas tentativas. Aguarde alguns minutos." }, 429);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) return json({ ok: false, error: "Dados de cadastro inválidos." }, 413);

  let body: {
    fullName?: unknown;
    username?: unknown;
    password?: unknown;
    birthDate?: unknown;
    city?: unknown;
    state?: unknown;
    recoveryKeyword?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Dados de cadastro inválidos." }, 400);
  }

  const fullName = cleanHumanText(body.fullName);
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  const birthDate = String(body.birthDate ?? "");
  const city = cleanHumanText(body.city);
  const state = String(body.state ?? "").trim().toUpperCase();
  const recoveryKeyword = cleanHumanText(body.recoveryKeyword);
  if (fullName.length < 2 || fullName.length > 80) return json({ ok: false, error: "Informe seu nome completo." });
  if (!USERNAME_PATTERN.test(username)) return json({ ok: false, error: "Escolha um username válido." });
  if (password.length < 8 || password.length > 72) return json({ ok: false, error: "A senha deve ter entre 8 e 72 caracteres." });
  if (!validBirthDate(birthDate)) return json({ ok: false, error: "Informe uma data de nascimento válida." });
  if (city.length < 2 || city.length > 80) return json({ ok: false, error: "Informe sua cidade." });
  if (!validState(state)) return json({ ok: false, error: "Selecione seu estado." });
  if (normalizeKeyword(recoveryKeyword).length < 4 || recoveryKeyword.length > 80) {
    return json({ ok: false, error: "A palavra-chave deve ter entre 4 e 80 caracteres." });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = readNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  if (!url || !secretKey || !publicKey) return json({ ok: false, error: "Cadastro indisponível no momento." }, 503);

  const email = `${username}@${INTERNAL_AUTH_DOMAIN}`;
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { identityDigest, keywordDigest } = await recoveryDigests(secretKey, fullName, birthDate, recoveryKeyword);
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username, city, state },
  });

  if (created.error) {
    const duplicate = /already|registered|exists|unique/i.test(created.error.message);
    return json({ ok: false, error: duplicate ? "Esse username já está em uso." : "Não foi possível criar a conta." });
  }

  const recovery = await admin.from("account_recovery_credentials").insert({
    user_id: created.data.user.id,
    identity_digest: identityDigest,
    keyword_digest: keywordDigest,
  });
  if (recovery.error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return json({ ok: false, error: "Não foi possível proteger a recuperação da conta." }, 500);
  }

  const auth = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await auth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return json({ ok: false, error: "Não foi possível iniciar a sessão. Tente novamente." }, 500);
  }

  return json({
    ok: true,
    session: {
      access_token: signedIn.data.session.access_token,
      refresh_token: signedIn.data.session.refresh_token,
    },
  });
});
