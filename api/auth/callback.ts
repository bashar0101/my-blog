import type { IncomingMessage, ServerResponse } from "node:http";
import { baseUrl, clearState, setSession, stateFailure } from "../_auth.js";

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
    // An unset ADMIN_GITHUB_LOGIN would otherwise compare every real login
    // against "" and deny everyone, which reads identically to a genuine
    // account mismatch. Separate it so the operator is told to set it.
    if (!clientId || !clientSecret || !adminLogin) throw new Denied("config");

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
    // Vercel captures this; the token and secret are never included.
    console.error(`[auth/callback] denied: ${reason}`);
    response.writeHead(403);
    response.end(
      {
        config: "Access denied (config): set GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET and ADMIN_GITHUB_LOGIN in the deployment environment, then redeploy.",
        "state-missing": "Access denied (state-missing): no sign-in state cookie came back. The flow almost certainly started on a different host than AUTH_BASE_URL, so the cookie was set on one domain and read on another. Begin at the exact domain AUTH_BASE_URL names.",
        "state-mismatch": "Access denied (state-mismatch): the state cookie came back holding a different value, so an older sign-in attempt finished after a newer one replaced it. Close the extra tabs and sign in once from /admin.",
        token: "Access denied (token): GitHub would not exchange the code. The client secret is usually wrong or stale — regenerate it, update the deployment environment, then redeploy.",
        account: "Access denied (account): this GitHub account is not the authorized admin.",
        unexpected: "Access denied.",
      }[reason]
    );
  }
}
