import type { IncomingMessage, ServerResponse } from "node:http";
import { baseUrl, clearState, cookieNames, setSession, stateFailure } from "../_auth.js";

/**
 * Distinguishes the three ways sign-in legitimately fails, so a 403 says which
 * one happened instead of collapsing all of them into one opaque message.
 *
 * None of these reasons help an attacker: "state" and "token" describe the
 * operator's own configuration, and "account" states what the feature exists to
 * enforce. What must never appear in a response is the client secret or the
 * GitHub access token, and neither is ever put in one.
 */
type DenialReason = "state-missing" | "state-mismatch" | "token" | "account" | "config";

class Denied extends Error {
  constructor(readonly reason: DenialReason) {
    super(reason);
  }
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
    const adminLogin = process.env.ADMIN_GITHUB_LOGIN;
    // AUTH_SESSION_SECRET is only read at the very end, by setSession signing
    // the cookie. Left unchecked it lets the entire flow succeed — state,
    // token exchange, account match — and then throws a plain Error that is
    // not a Denied, surfacing as a bare "Access denied." with no reason.
    const sessionSecret = process.env.AUTH_SESSION_SECRET;
    // An unset ADMIN_GITHUB_LOGIN would otherwise compare every real login
    // against "" and deny everyone, which reads identically to a genuine
    // account mismatch. Separate it so the operator is told to set it.
    if (!clientId || !clientSecret || !adminLogin || !sessionSecret) throw new Denied("config");

    const url = new URL(request.url ?? "", baseUrl());
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) throw new Denied("state-missing");
    const stateProblem = stateFailure(request, state);
    if (stateProblem) throw new Denied(stateProblem === "missing" ? "state-missing" : "state-mismatch");
    clearState(response);

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const token = (await tokenResponse.json() as { access_token?: string }).access_token;
    if (!token) throw new Denied("token");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    });
    const user = await userResponse.json() as { login?: string };
    if (!userResponse.ok || !user.login) throw new Denied("token");
    if (user.login.toLowerCase() !== adminLogin.toLowerCase()) throw new Denied("account");

    setSession(response, user.login);
    response.writeHead(302, { Location: "/admin" });
    response.end();
  } catch (cause) {
    const reason = cause instanceof Denied ? cause.reason : "unexpected";

    // Diagnostic for state-missing only. Cookie NAMES, never values; the host
    // the request actually arrived on, and the host AUTH_BASE_URL names. That
    // is enough to separate a domain mismatch from an expired cookie from a
    // browser dropping cookies entirely. Remove once sign-in is working.
    let detail = "";
    if (reason === "config") {
      const missing = [
        ["GITHUB_OAUTH_CLIENT_ID", process.env.GITHUB_OAUTH_CLIENT_ID],
        ["GITHUB_OAUTH_CLIENT_SECRET", process.env.GITHUB_OAUTH_CLIENT_SECRET],
        ["ADMIN_GITHUB_LOGIN", process.env.ADMIN_GITHUB_LOGIN],
        ["AUTH_SESSION_SECRET", process.env.AUTH_SESSION_SECRET],
        ["AUTH_BASE_URL", process.env.AUTH_BASE_URL],
      ].filter(([, value]) => !value).map(([name]) => name);
      detail = `

not set: ${missing.length ? missing.join(", ") : "(all present)"}`;
    }
    if (reason === "state-missing") {
      const names = cookieNames(request);
      let expected = "(AUTH_BASE_URL unreadable)";
      try { expected = new URL(baseUrl()).host; } catch { /* leave as-is */ }
      detail =
        `

seen host: ${request.headers.host ?? "(none)"}` +
        `
AUTH_BASE_URL host: ${expected}` +
        `
cookies received: ${names.length ? names.join(", ") : "(none at all)"}`;
    }
    // Vercel captures this; the token and secret are never included.
    console.error(`[auth/callback] denied: ${reason}`);
    response.writeHead(403);
    response.end(
      {
        config: "Access denied (config): one of GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, ADMIN_GITHUB_LOGIN or AUTH_SESSION_SECRET is not set in the deployment environment. Set all four, then redeploy.",
        "state-missing": "Access denied (state-missing): no sign-in state cookie came back. The flow almost certainly started on a different host than AUTH_BASE_URL, so the cookie was set on one domain and read on another. Begin at the exact domain AUTH_BASE_URL names.",
        "state-mismatch": "Access denied (state-mismatch): the state cookie came back holding a different value, so an older sign-in attempt finished after a newer one replaced it. Close the extra tabs and sign in once from /admin.",
        token: "Access denied (token): GitHub would not exchange the code. The client secret is usually wrong or stale — regenerate it, update the deployment environment, then redeploy.",
        account: "Access denied (account): this GitHub account is not the authorized admin.",
        unexpected: "Access denied.",
      }[reason] + detail
    );
  }
}
