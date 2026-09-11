/**
 * Load test for the serverless functions — the only code of yours that runs
 * per request. Everything else is a file on a CDN.
 *
 *   k6 run -e BASE_URL=https://my-blog-one-flame.vercel.app loadtest/k6-api.js
 *
 * Only two of the four endpoints are here, and that is deliberate:
 *
 *   /api/auth/session   reads a cookie, verifies an HMAC, returns JSON.
 *                       No network calls. The best measure of your own code.
 *   /api/auth/login     makes a random state, sets a cookie, returns a 302.
 *                       Also no outbound call — it only redirects the browser.
 *
 *   /api/auth/callback  NEVER load test this. Every request makes two calls to
 *                       github.com and api.github.com. Load testing it means
 *                       load testing GitHub with your credentials attached,
 *                       which is abuse of someone else's service and will get
 *                       the token rate-limited or revoked.
 *   /api/auth/logout    trivial, and nothing to learn from it.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
if (!BASE) throw new Error("Set BASE_URL. There is no local default: these are deployed functions.");

export const options = {
  // Far gentler than the static test. Each request is a function invocation
  // that counts against the account's quota, and a cold start is a real cost.
  stages: [
    { duration: "30s", target: 5 },
    { duration: "60s", target: 15 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // Looser than the static budget on purpose: a function that has to boot
    // answers in hundreds of milliseconds, and that is normal, not a fault.
    "http_req_duration{endpoint:session}": ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // 401 is the correct answer for an anonymous caller; treating it as a failure
  // would make the whole run look broken.
  const session = http.get(`${BASE}/api/auth/session`, {
    tags: { endpoint: "session" },
    redirects: 0,
  });
  check(session, {
    "session answers 200 or 401": (r) => r.status === 200 || r.status === 401,
    "session is never cached": (r) => (r.headers["Cache-Control"] || "").includes("no-store"),
  });

  const login = http.get(`${BASE}/api/auth/login`, {
    tags: { endpoint: "login" },
    // Do not follow the redirect: the target is github.com, and following it
    // would point this load test at GitHub.
    redirects: 0,
  });
  check(login, {
    "login redirects to GitHub": (r) =>
      r.status === 302 && (r.headers["Location"] || "").startsWith("https://github.com/"),
  });

  sleep(Math.random() * 3 + 1);
}
