# Load testing this site

Measured 2026-09-12 against `my-blog-one-flame.vercel.app`.

## First: what is actually on the other end

Two very different things live behind that domain.

**Static files on a CDN.** Every page, every asset, the CV PDFs. Vercel serves
these from an edge location — Frankfurt (`fra1`) for you. Your code does not run.
Load testing them measures Vercel's CDN, which is built to absorb far more
traffic than a portfolio will ever see. You will not find your limit; you will
find Vercel's abuse threshold.

**Four serverless functions**, `api/auth/*`. This is the only code of yours that
runs per request, and the only place a load test can tell you something about
*your* work.

So "how many requests can it handle" has an uncomfortable answer: for the pages,
effectively unlimited and not yours to take credit for; for the functions, as
many as Vercel will run concurrently, which is a quota question more than a
performance one.

## The two questions you are actually asking

They need different tools, and people mix them up constantly.

| Question | What it means | Tool |
| --- | --- | --- |
| "How fast is it for one visitor?" | Latency, page load, LCP, TTFB | Lighthouse, PageSpeed Insights, WebPageTest |
| "How many at once before it degrades?" | Throughput, saturation | k6, autocannon, oha, Artillery |

**For a portfolio, the first question is the one that matters.** Nobody is going
to send 5,000 concurrent users at it. A recruiter on hotel wifi is the realistic
worst case, and that is a latency problem, not a throughput one.

Learn the second anyway — it is the skill that transfers to real backends.

## What happened when I tried it on the live site

This is the most useful thing in this document.

I ran 10 connections for 20 seconds against `/en`. Result:

```text
459 2xx responses, 3416 non 2xx responses
```

Nearly 90% failed. Not because the site fell over — because Vercel decided I was
an attack:

```http
HTTP/1.1 403 Forbidden
X-Vercel-Mitigated: challenge
X-Vercel-Challenge-Token: 2.1789162485.60.NDQ0OTYxNzRmYjU1NWQyNzc3MGU4NjBl...
Content-Type: text/html
<title>Vercel Security Checkpoint</title>
```

Every timing after that point measured *the checkpoint page*, not your site.

Two checks worth copying:

- From a **real browser on a home connection**: the site served normally,
  `<title>Portfolio</title>`, heading `BASHAR KHOUJAH`. **Real visitors were
  never affected.**
- From a **second datacenter IP**: also 403. The mitigation targets automated
  clients, not your account.

### The lesson

> You cannot load test a CDN-hosted site from one machine. You will measure the
> DDoS mitigation, and the numbers will be confidently wrong.

Both scripts in `loadtest/` detect the challenge header and tell you, rather
than reporting the checkpoint page's latency as if it were yours.

### So where do you load test instead

1. **Locally, against a production build.** This is where the numbers are yours.

   ```bash
   npm run build && npx vite preview --port 4173
   npm run loadtest:quick
   ```

   Baseline measured on this machine: **3,106 req/s, p50 2.9 ms, p95 4.9 ms,
   46,591 requests, zero errors.** That is the app and the machine, with no
   network in the way.
2. **A preview deployment**, which you can put under a lower-traffic test
   without touching the production domain.
3. **The functions specifically**, at a gentle rate — see below.
4. If you genuinely need to test the production domain hard, Vercel's fair-use
   policy asks you to tell them first. For a portfolio you never will.

## Measured numbers, live site, single requests

Before I tripped the mitigation:

| Path | TTFB | Notes |
| --- | --- | --- |
| `/en` | 143 ms | `X-Vercel-Cache: HIT`, edge `fra1` |
| `/en/projects` | 151 ms | `HIT` |
| `/api/auth/session` | 277 ms | `MISS`, and see below |

About 90 ms of each is the TLS handshake, paid once per connection, not per
request.

### A real finding: your functions run on the wrong continent

```text
/en                 X-Vercel-Id: fra1::...
/api/auth/session   X-Vercel-Id: fra1::iad1::...
```

Your pages are served from Frankfurt. Your functions execute in `iad1`,
Washington DC. Every API call crosses the Atlantic and back — roughly **130 ms
of pure geography**, which is most of the difference between 143 ms and 277 ms.

Nothing in your code will fix that. The region will. In `vercel.json`:

```json
{ "regions": ["fra1"] }
```

I have not applied it: it changes where production runs, which is your call, not
a side effect of a performance investigation. It only matters for the admin
sign-in, since nothing else calls a function.

## The tools, and when each one earns its place

| Tool | Install | Use it when |
| --- | --- | --- |
| **k6** | `winget install k6` | The one to learn. JS scripts, ramp stages, pass/fail thresholds, CI-friendly. Everything below is a subset of it. |
| **autocannon** | `npx autocannon -c 10 -d 20 URL` | A number in thirty seconds, no install, Node-native. |
| **oha** | `winget install hatoo.oha` | Same idea in Rust, with a live TUI. Nice to watch. |
| **hey** / **wrk** / **ab** | package manager | Older one-shot CLIs. `ab` is ancient and single-threaded — it often becomes the bottleneck itself. Do not trust it above a few hundred req/s. |
| **Artillery** | `npx artillery` | YAML scenarios, multi-step user journeys. Good when a test is "log in, browse, check out". |
| **Lighthouse** | `npx lighthouse URL --view` | The question that actually matters here. Real Chrome, real rendering, LCP/CLS/TTFB. |
| **PageSpeed Insights / WebPageTest** | hosted | Same, from real devices on real networks, plus Chrome's field data from actual visitors. |
| **Vercel Speed Insights** | dashboard | Real user monitoring. The honest long-run answer, because it measures your actual visitors instead of your guesses. |

Start with k6 and Lighthouse. The rest are variations.

## Running the tests in this repo

```bash
npm run loadtest:quick     # node, no install, local preview by default
npm run loadtest:static    # k6, ramps 5 -> 20 -> 50 virtual users
npm run loadtest:api       # k6, the serverless functions, gently
```

`loadtest:quick` takes a URL argument and honours `CONNECTIONS` and `SECONDS`:

```bash
CONNECTIONS=25 SECONDS=30 node loadtest/quick.mjs https://your-preview.vercel.app/en
```

The k6 scripts default to `http://localhost:4173` so a stray run cannot hit
production by accident. Point them elsewhere with `-e BASE_URL=...`.

## Rules that are not negotiable

- **Never load test `/api/auth/callback`.** Every request there makes two calls
  to github.com with your OAuth credentials. Load testing it means load testing
  GitHub, which is abuse of someone else's service and gets tokens revoked.
  `loadtest/k6-api.js` deliberately omits it, and sets `redirects: 0` on
  `/api/auth/login` so the test does not follow that redirect to GitHub either.
- **Only test what you own.** Pointing these at any other domain is an attack,
  whatever you meant by it.
- **Function invocations cost quota.** Static requests cost bandwidth. Both are
  metered on your Vercel account, and a long run at high concurrency is a real
  bill on a paid plan.

## Reading the output without fooling yourself

**Ignore the average.** 95 requests at 50 ms and 5 at 5 s average 297 ms, which
describes nothing that happened. Quote p50, p95 and p99. p95 is the number to
budget against; p99 is where the pain your users actually report lives.

**Latency and throughput are not the same claim.** "3,000 req/s" and "3 ms
response" are different axes. Throughput collapses at the point latency starts
climbing — which is why the k6 script ramps instead of sitting at one level. The
shape of the curve is the finding; a single number is not.

**Think time matters.** Without a `sleep()` every virtual user is an infinite
loop, a load pattern no human produces. 50 looping users are not 50 visitors —
they are more like several thousand.

**Watch for coordinated omission.** If a tool waits for each response before
sending the next, a stall silently stops the clock instead of queueing work, and
the slow tail disappears from the results. k6's `constant-arrival-rate` executor
sends at a fixed rate regardless, which is the honest way to measure a system
under stress.

**Check what the response actually was.** My first run reported a tidy latency
distribution — for 3,416 error pages. Always assert on status and content, which
is what the `check()` calls in the k6 scripts are for.
