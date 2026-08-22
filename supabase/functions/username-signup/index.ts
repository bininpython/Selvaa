import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const INTERNAL_AUTH_DOMAIN = "users.selva.invalid";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function readNamedKey(name: string, legacyName: string) {
  const named = Deno.env.get(name);
  if (named) {
    try {
      const parsed = JSON.parse(named) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // The legacy single-value variables below remain supported by Supabase.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

function allowAttempt(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("cf-connecting-ip") || "unknown";
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

  let body: { fullName?: unknown; username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Dados de cadastro inválidos." }, 400);
  }

  const fullName = String(body.fullName ?? "").trim().replace(/\s+/g, " ");
  const username = String(body.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const password = String(body.password ?? "");
  if (fullName.length < 2 || fullName.length > 80) return json({ ok: false, error: "Informe seu nome completo." });
  if (!USERNAME_PATTERN.test(username)) return json({ ok: false, error: "Escolha um username válido." });
  if (password.length < 8 || password.length > 72) return json({ ok: false, error: "A senha deve ter entre 8 e 72 caracteres." });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = readNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  if (!url || !secretKey || !publicKey) return json({ ok: false, error: "Cadastro indisponível no momento." }, 503);

  const email = `${username}@${INTERNAL_AUTH_DOMAIN}`;
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });

  if (created.error) {
    const duplicate = /already|registered|exists|unique/i.test(created.error.message);
    return json({ ok: false, error: duplicate ? "Esse username já está em uso." : "Não foi possível criar a conta." });
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
