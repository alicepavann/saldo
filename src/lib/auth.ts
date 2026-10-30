/**
 * Login por senha única (APP_PASSWORD) com cookie assinado (HMAC-SHA256).
 * Usa só Web Crypto, então funciona no proxy e nas rotas.
 *
 * Cookie: "<expira-em-ms>.<assinatura-base64url>"
 */

export const SESSION_COOKIE = "saldo_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function secret() {
  // AUTH_SECRET é o ideal; sem ele, deriva da própria senha (trocar a senha derruba as sessões).
  return process.env.AUTH_SECRET || `pw:${process.env.APP_PASSWORD ?? ""}`;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Comparação em tempo constante (sobre o hash, para não vazar o tamanho). */
async function safeEqual(a: string, b: string) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export function authConfigured() {
  return !!process.env.APP_PASSWORD;
}

export async function checkPassword(input: string) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return false;
  return safeEqual(input, pw);
}

export async function createSession(now = Date.now()) {
  const exp = String(now + SESSION_DAYS * 864e5);
  return `${exp}.${await hmac(`session:${exp}`)}`;
}

export async function verifySession(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(`session:${exp}`));
}

/** Para rotas: confere o cookie da requisição. Sem APP_PASSWORD, só libera fora de produção. */
export async function isAuthed(req: Request) {
  if (!authConfigured()) return process.env.NODE_ENV !== "production";
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return verifySession(m ? decodeURIComponent(m[1]) : undefined);
}
