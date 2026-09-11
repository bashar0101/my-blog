import type { IncomingMessage, ServerResponse } from "node:http";
import { baseUrl, clearState, setSession, validState } from "../_auth.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const url = new URL(request.url ?? "", baseUrl());
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || !validState(request, state)) throw new Error("Invalid sign-in request.");
    clearState(response);
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID, client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET, code }) });
    const token = (await tokenResponse.json() as { access_token?: string }).access_token;
    if (!token) throw new Error("GitHub sign-in failed.");
    const userResponse = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` } });
    const user = await userResponse.json() as { login?: string };
    if (!userResponse.ok || !user.login || user.login.toLowerCase() !== (process.env.ADMIN_GITHUB_LOGIN ?? "").toLowerCase()) throw new Error("This GitHub account is not authorized.");
    setSession(response, user.login);
    response.writeHead(302, { Location: "/admin" });
    response.end();
  } catch { response.writeHead(403); response.end("Access denied."); }
}
