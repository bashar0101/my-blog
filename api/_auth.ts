import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const SESSION_COOKIE = "portfolio_admin_session";
const STATE_COOKIE = "portfolio_oauth_state";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("Authentication is not configured.");
  return value;
}

/**
 * Cookie NAMES only — never values. Used to tell "the browser sent us no
 * cookies at all" apart from "it sent cookies but not the state one", which
 * have different causes and are indistinguishable from a null lookup.
 */
export function cookieNames(request: IncomingMessage): string[] {
  const header = request.headers.cookie;
  if (!header) return [];
  return header.split(";").map((item) => item.trim().split("=")[0] ?? "").filter(Boolean);
}

function cookieValue(request: IncomingMessage, name: string): string | null {
  const pair = request.headers.cookie?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function sign(value: string): string {
  return createHmac("sha256", required("AUTH_SESSION_SECRET")).update(value).digest("base64url");
}

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secureCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function baseUrl(): string { return required("AUTH_BASE_URL").replace(/\/$/, ""); }
export function newState(): string { return randomBytes(32).toString("base64url"); }
export function setState(response: ServerResponse, state: string): void { response.setHeader("Set-Cookie", secureCookie(STATE_COOKIE, state, 600)); }
export function validState(request: IncomingMessage, state: string): boolean {
  const stored = cookieValue(request, STATE_COOKIE);
  return Boolean(stored && sameValue(stored, state));
}
/**
 * Distinguishes "the browser sent no state cookie" from "it sent a different
 * one". They look identical to validState but have opposite causes: the first
 * means the cookie never reached us — typically the flow began on a different
 * host than AUTH_BASE_URL, so it was set on one domain and read on another.
 * The second means a stale flow: sign-in was started more than once and an
 * older callback arrived after a newer one overwrote the cookie.
 */
export function stateFailure(request: IncomingMessage, state: string): "missing" | "mismatch" | null {
  const stored = cookieValue(request, STATE_COOKIE);
  if (!stored) return "missing";
  return sameValue(stored, state) ? null : "mismatch";
}
export function clearState(response: ServerResponse): void { response.setHeader("Set-Cookie", secureCookie(STATE_COOKIE, "", 0)); }
export function setSession(response: ServerResponse, login: string): void {
  const payload = Buffer.from(JSON.stringify({ login, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })).toString("base64url");
  response.setHeader("Set-Cookie", secureCookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, MAX_AGE_SECONDS));
}
export function clearSession(response: ServerResponse): void { response.setHeader("Set-Cookie", secureCookie(SESSION_COOKIE, "", 0)); }
export function sessionLogin(request: IncomingMessage): string | null {
  try {
    const cookie = cookieValue(request, SESSION_COOKIE);
    if (!cookie) return null;
    const [payload, signature] = cookie.split(".");
    if (!payload || !signature || !sameValue(sign(payload), signature)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { login?: unknown; exp?: unknown };
    return typeof data.login === "string" && typeof data.exp === "number" && data.exp > Date.now() / 1000 ? data.login : null;
  } catch { return null; }
}
export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}
