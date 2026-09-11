import type { IncomingMessage, ServerResponse } from "node:http";
import { clearSession, sendJson } from "../_auth.js";
export default function handler(request: IncomingMessage, response: ServerResponse) { if (request.method !== "POST") { response.writeHead(405); response.end(); return; } clearSession(response); sendJson(response, 200, { ok: true }); }
