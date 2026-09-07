import type { IncomingMessage, ServerResponse } from "node:http";
import { baseUrl, newState, setState } from "../_auth";

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  try {
    const state = newState();
    setState(response, state);
    const params = new URLSearchParams({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID ?? "", redirect_uri: `${baseUrl()}/api/auth/callback`, state, scope: "read:user" });
    response.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
    response.end();
  } catch { response.writeHead(503); response.end("Authentication is not configured."); }
}
