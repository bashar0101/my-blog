import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, sessionLogin } from "../_auth";
export default function handler(request: IncomingMessage, response: ServerResponse) { const login = sessionLogin(request); sendJson(response, login ? 200 : 401, { authenticated: Boolean(login), login }); }
