/**
 * Load test for the static pages.
 *
 * Run against a LOCAL build by default. Pointing this at the deployed site
 * measures Vercel's edge CDN, not your code — and past a low rate Vercel's bot
 * mitigation starts answering with a 403 challenge page, so the numbers stop
 * meaning anything. The check below catches that and says so.
 *
 *   npm run build && npx vite preview --port 4173
 *   k6 run loadtest/k6-static.js
 *
 * Against a deployment (read docs/load-testing.md first):
 *   k6 run -e BASE_URL=https://my-blog-one-flame.vercel.app loadtest/k6-static.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:4173";

const challenged = new Rate("vercel_challenge_rate");

export const options = {
  // A ramp, not a flat rate: you want the shape of the curve — the point where
  // latency starts climbing — not one number from one arbitrary load level.
  stages: [
    { duration: "20s", target: 5 },
    { duration: "30s", target: 20 },
    { duration: "30s", target: 50 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // p95, not the average. An average hides the slow tail completely: 95 fast
    // requests and 5 five-second ones still average well under a second.
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
    vercel_challenge_rate: ["rate<0.01"],
  },
};

const PAGES = ["/en", "/en/projects", "/en/articles", "/en/videos", "/ar", "/tr"];

export default function () {
  const path = PAGES[Math.floor(Math.random() * PAGES.length)];
  const response = http.get(`${BASE}${path}`, { tags: { path } });

  const blocked = response.headers["X-Vercel-Mitigated"] === "challenge";
  challenged.add(blocked);

  check(response, {
    "status is 200": (r) => r.status === 200,
    "served the app shell": (r) => !blocked && r.body.includes("<div id=\"root\">"),
    "not a Vercel challenge page": () => !blocked,
  });

  // Think time. Without it every virtual user is an infinite loop, which is a
  // load pattern no real visitor produces.
  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  const challenge = data.metrics.vercel_challenge_rate?.values?.rate ?? 0;
  if (challenge > 0.01) {
    console.error(
      `\n${Math.round(challenge * 100)}% of responses were Vercel's bot-mitigation challenge, ` +
        `not your site. These timings measure the checkpoint page. Read docs/load-testing.md.\n`
    );
  }
  return { stdout: JSON.stringify(data.metrics.http_req_duration.values, null, 2) };
}
