import type { Session } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const INTERNAL_AUTH_DOMAIN = "users.selva.invalid";
const BRAZIL_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

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

function validateFullName(value: string) {
  const fullName = value.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 80) throw new Error("Informe seu nome completo.");
  return fullName;
}

function validateBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe uma data de nascimento válida.");
  const birthDate = new Date(`${value}T12:00:00Z`);
  const today = new Date();
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== value) {
    throw new Error("Informe uma data de nascimento válida.");
  }
  if (birthDate > today || birthDate.getUTCFullYear() < 1900) {
    throw new Error("Confira sua data de nascimento.");
  }
  return value;
}

function validateCity(value: string) {
  const city = value.trim().replace(/\s+/g, " ");
  if (city.length < 2 || city.length > 80) throw new Error("Informe sua cidade.");
  return city;
}

function validateState(value: string) {
  const state = value.trim().toUpperCase();
  if (!BRAZIL_STATES.has(state)) throw new Error("Selecione seu estado.");
  return state;
}

function validatePassword(value: string) {
  if (value.length < 8 || value.length > 72) throw new Error("A senha deve ter entre 8 e 72 caracteres.");
  return value;
}

function validateRecoveryKeyword(value: string) {
  const keyword = value.trim().replace(/\s+/g, " ");
  if (keyword.length < 4 || keyword.length > 80) {
    throw new Error("A palavra-chave deve ter entre 4 e 80 caracteres.");
  }
  return keyword;
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
  birthDate: string;
  city: string;
  state: string;
  recoveryKeyword: string;
}) {
  const fullName = validateFullName(input.fullName);
  const username = validateUsername(input.username);
  const password = validatePassword(input.password);
  const birthDate = validateBirthDate(input.birthDate);
  const city = validateCity(input.city);
  const state = validateState(input.state);
  const recoveryKeyword = validateRecoveryKeyword(input.recoveryKeyword);

  const supabase = createClient();
  if (!supabase) throw new Error("O cadastro está temporariamente indisponível.");

  const { data, error } = await supabase.functions.invoke<SignupResponse>("username-signup", {
    body: { fullName, username, password, birthDate, city, state, recoveryKeyword },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data?.ok || !data.session) throw new Error(data?.error ?? "Não foi possível criar sua conta.");

  const sessionResult = await supabase.auth.setSession(data.session);
  if (sessionResult.error) throw new Error(friendlyAuthError(sessionResult.error.message));
  return sessionResult.data.session;
}

export async function recoverPassword(input: {
  fullName: string;
  birthDate: string;
  recoveryKeyword: string;
  newPassword: string;
}) {
  const fullName = validateFullName(input.fullName);
  const birthDate = validateBirthDate(input.birthDate);
  const recoveryKeyword = validateRecoveryKeyword(input.recoveryKeyword);
  const newPassword = validatePassword(input.newPassword);

  const supabase = createClient();
  if (!supabase) throw new Error("A recuperação está temporariamente indisponível.");

  const { data, error } = await supabase.functions.invoke<SignupResponse>("password-recovery", {
    body: { fullName, birthDate, recoveryKeyword, newPassword },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data?.ok || !data.session) {
    throw new Error(data?.error ?? "Não foi possível recuperar sua conta.");
  }

  const sessionResult = await supabase.auth.setSession(data.session);
  if (sessionResult.error) throw new Error(friendlyAuthError(sessionResult.error.message));
  return sessionResult.data.session;
}
