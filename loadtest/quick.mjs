/**
 * A number in thirty seconds, with no tool to install.
 *
 * k6 is the thing to learn — it has thresholds, stages and a proper summary.
 * This is for the moment before you have installed it, and for checking that a
 * target is actually answering you rather than answering a bot challenge.
 *
 *   node loadtest/quick.mjs                      # local preview build
 *   node loadtest/quick.mjs https://example.com  # anything you own
 */
import { request } from "node:https";
import { request as insecure } from "node:http";

const target = new URL(process.argv[2] ?? "http://localhost:4173/en");
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 10);
const SECONDS = Number(process.env.SECONDS ?? 15);

const latencies = [];
const statuses = new Map();
let challenged = 0;
let bytes = 0;

function once() {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const send = target.protocol === "https:" ? request : insecure;
    const req = send(target, { method: "GET" }, (res) => {
      res.on("data", (chunk) => (bytes += chunk.length));
      res.on("end", () => {
        latencies.push(Number(process.hrtime.bigint() - started) / 1e6);
        statuses.set(res.statusCode, (statuses.get(res.statusCode) ?? 0) + 1);
        if (res.headers["x-vercel-mitigated"] === "challenge") challenged += 1;
        resolve();
      });
    });
    req.on("error", () => {
      statuses.set("error", (statuses.get("error") ?? 0) + 1);
      resolve();
    });
    req.end();
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const deadline = Date.now() + SECONDS * 1000;
async function worker() {
  while (Date.now() < deadline) await once();
}

console.log(`${target.href} — ${CONNECTIONS} connections for ${SECONDS}s\n`);
const startedAt = Date.now();
await Promise.all(Array.from({ length: CONNECTIONS }, worker));
const elapsed = (Date.now() - startedAt) / 1000;

const sorted = [...latencies].sort((a, b) => a - b);
const ms = (value) => `${value.toFixed(1)} ms`;

console.log(`requests     ${latencies.length}  (${(latencies.length / elapsed).toFixed(1)}/s)`);
console.log(`transferred  ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`statuses     ${[...statuses].map(([code, n]) => `${code}×${n}`).join("  ")}`);
console.log(`latency      p50 ${ms(percentile(sorted, 50))}   p95 ${ms(percentile(sorted, 95))}   p99 ${ms(percentile(sorted, 99))}   max ${ms(sorted.at(-1) ?? 0)}`);

if (challenged > 0) {
  console.log(
    `\n${challenged} of ${latencies.length} responses were Vercel's bot-mitigation challenge,\n` +
      `not your site. Those timings measure the checkpoint page. See docs/load-testing.md.`
  );
  process.exit(1);
}
