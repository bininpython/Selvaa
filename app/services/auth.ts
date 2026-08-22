import type { Session } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const INTERNAL_AUTH_DOMAIN = "users.selva.invalid";

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Use de 3 a 30 caracteres: letras, números ou _.");
  }
  return username;
}

function internalEmail(username: string) {
  return `${username}@${INTERNAL_AUTH_DOMAIN}`;
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Usuário ou senha incorretos.";
  if (normalized.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (normalized.includes("fetch")) return "Não foi possível conectar. Verifique sua internet.";
  return message;
}

export async function signInWithUsername(usernameValue: string, password: string) {
  const username = validateUsername(usernameValue);
  const supabase = createClient();
  if (!supabase) throw new Error("O acesso está temporariamente indisponível.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail(username),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  return data.session;
}

type SignupResponse = {
  ok: boolean;
  error?: string;
  session?: Pick<Session, "access_token" | "refresh_token">;
};

export async function signUpWithUsername(input: {
  fullName: string;
  username: string;
  password: string;
}) {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const username = validateUsername(input.username);
  if (fullName.length < 2 || fullName.length > 80) throw new Error("Informe seu nome completo.");
  if (input.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");

  const supabase = createClient();
  if (!supabase) throw new Error("O cadastro está temporariamente indisponível.");

  const { data, error } = await supabase.functions.invoke<SignupResponse>("username-signup", {
    body: { fullName, username, password: input.password },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data?.ok || !data.session) throw new Error(data?.error ?? "Não foi possível criar sua conta.");

  const sessionResult = await supabase.auth.setSession(data.session);
  if (sessionResult.error) throw new Error(friendlyAuthError(sessionResult.error.message));
  return sessionResult.data.session;
}
