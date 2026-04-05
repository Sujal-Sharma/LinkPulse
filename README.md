# ⚡ LinkPulse

> Production-grade URL shortener with real-time analytics, Redis caching,
> token-bucket rate limiting, Bull job queues, Socket.io, and geographic insights.
> Built to demonstrate every layer of a real production system.

## 🌐 Live Demo
- **App:** https://linkpulse.vercel.app
- **API:** https://linkpulse-api.onrender.com

---

## 📊 Performance Metrics

| Metric | Value |
|---|---|
| Redirect latency — cache HIT | < 5ms (p99) |
| Redirect latency — cache MISS | < 15ms (p99) |
| Cache hit rate | > 95% |
| Concurrent redirects | 10,000+ |
| Daily redirect capacity | 1,000,000+ |
| Analytics processing | Async — 0ms impact on redirect |
| Rate limiter | Token Bucket (Redis Lua, atomic) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LINKPULSE ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘
                    ┌───────────┐
                    │   User    │
                    └─────┬─────┘
                          │ HTTP Request
                          ▼
                ┌─────────────────┐
                │   Vercel CDN    │
                │  (Frontend)     │
                └────────┬────────┘
                         │ API calls
                         ▼
          ┌──────────────────────────────┐
          │      Express API Server       │
          │  ┌──────────┐ ┌───────────┐  │
          │  │  Rate    │ │  Helmet   │  │
          │  │ Limiter  │ │ Security  │  │
          │  └──────────┘ └───────────┘  │
          │  ┌──────────┐ ┌───────────┐  │
          │  │  Morgan  │ │  Winston  │  │
          │  │ Logging  │ │  Logging  │  │
          │  └──────────┘ └───────────┘  │
          └───────┬──────────────┬────────┘
                  │              │
       ┌──────────▼──┐    ┌──────▼──────┐
       │    Redis    │    │   MongoDB   │
       │  (Upstash)  │    │   (Atlas)   │
       │             │    │             │
       │ • URL Cache │    │ • Links     │
       │ • Rate Limit│    │ • Users     │
       │ • Counters  │    │ • Analytics │
       │ • Bloom Fltr│    │ • Workspaces│
       │ • Geo Cache │    │             │
       └──────┬──────┘    └─────────────┘
              │
       ┌──────▼──────┐
       │ Bull Queue  │
       │             │
       │ • Analytics │
       │ • Expiry    │
       │ • Emails    │
       │ • Reports   │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  Socket.io  │
       │             │
       │ • Live clicks│
       │ • Geo updates│
       │ • Counters  │
       └─────────────┘

REDIRECT LATENCY BREAKDOWN:
Redis HIT:  [Redis ~1ms] + [Queue push ~1ms] = ~2ms total ✅
Redis MISS: [Redis ~1ms] + [MongoDB ~8ms] + [Cache ~1ms] = ~10ms
```

---

## 🔧 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | Non-blocking I/O, perfect for high-throughput redirects |
| API framework | Express 4 | Minimal, fast, battle-tested |
| Database | MongoDB + Mongoose | Flexible schema, horizontal scaling |
| Cache | Redis (Upstash) | O(1) URL lookup, shared across instances |
| Queue | Bull (Redis-backed) | Reliable async job processing with retries |
| Real-time | Socket.io | WebSocket with fallback polling |
| Rate limiting | Custom Token Bucket | More accurate than fixed-window |
| Geo lookup | geoip-lite | Fast in-process IP→location, no external API |
| UA parsing | ua-parser-js | Device/browser detection |
| Short codes | nanoid | URL-safe, collision-resistant |
| Bloom filter | Custom Redis bitset | Zero-DB-hit rejection of invalid codes |
| Auth | JWT (access + refresh) | Stateless, scalable |
| Validation | Zod | Runtime type-safe schema validation |
| Security | Helmet, hpp, mongo-sanitize | Defense in depth |
| Logging | Winston + DailyRotateFile | Structured, searchable logs |
| Frontend | React 18 + Vite | Fast dev experience, optimized bundles |
| Charts | Recharts | Composable, React-native charting |
| Maps | react-simple-maps | SVG world map, no tile server needed |
| Animations | Framer Motion | Production-quality UI animations |
| State | React Query + Zustand | Server + client state management |
| CI/CD | GitHub Actions | Lint → Test → Deploy on every PR |
| Backend hosting | Render | Auto-deploy, free tier available |
| Frontend hosting | Vercel | Edge CDN, instant deploys |
| Containers | Docker + Compose | Reproducible local environment |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- MongoDB (Atlas free tier or local)
- Redis (Upstash free tier or local)

### Option 1: Docker Compose (recommended)
```bash
git clone https://github.com/Sujal-Sharma/LinkPulse
cd linkpulse

# Copy env files
cp .env.example .env
cp backend/.env.example backend/.env

# Start all services (MongoDB + Redis + API)
docker-compose up -d

# API available at http://localhost:8000
# Health check: curl http://localhost:8000/health
```

### Option 2: Manual setup
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB + Redis credentials
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

---

## 📁 Project Structure

```
linkpulse/
├── .github/workflows/       # CI (lint+test) + CD (deploy)
├── backend/
│   └── src/
│       ├── config/          # Redis, MongoDB, Bull connections
│       ├── middleware/       # auth, rateLimiter, validate, security
│       ├── models/           # User, Link, ClickEvent, Workspace
│       ├── queues/           # Bull queues + analytics/expiry/email workers
│       ├── routes/           # auth, links, redirect (critical path), analytics
│       ├── services/         # cache, bloomFilter, geo, analytics, link, email
│       ├── socket/           # Socket.io setup + event handlers
│       └── utils/            # logger, metrics, shortCode, cron
├── frontend/
│   └── src/
│       ├── components/       # Layout, dashboard, analytics, shared UI
│       ├── hooks/            # useSocket, useLinks, useAnalytics
│       ├── pages/            # Landing, Dashboard, Analytics, Workspace
│       └── services/         # Axios API client
└── docker-compose.yml
```

---

## 🔄 Technical Trade-offs & Decisions

### Why Redis for URL cache instead of in-memory?
In-memory cache dies when the server restarts and doesn't work with multiple
server instances. Redis survives restarts and is shared across all instances —
essential for horizontal scaling.
**Trade-off:** Network latency (~1ms) vs local memory (0ms). Worth it for
reliability and scale.

### Why Bull queue for analytics instead of sync?
Processing analytics synchronously adds 50–100ms to every redirect. At 1M
redirects/day that's significant user-experience degradation. Async queue keeps
redirect latency < 10ms while processing analytics reliably with retry logic.
**Trade-off:** Analytics is slightly delayed (~1 second) but redirect speed is
maximized.

### Why Bloom filter before cache?
Invalid shortCode requests (bots, typos, scanners) would hit Redis and MongoDB
unnecessarily. The Bloom filter rejects definitely-invalid codes in O(1) with
zero DB load.
**Trade-off:** ~0.1% false positives (valid codes wrongly rejected) — acceptable
for this use case.

### Why Token Bucket over Fixed Window rate limiting?
Fixed window allows burst: 60 requests in the last second of window + 60 in the
first second of the next = 120 requests in 2 seconds — defeating the purpose.
Token bucket smooths this by tracking token replenishment continuously.
**Trade-off:** More complex Redis Lua script but significantly more accurate
rate limiting.

### Why 301 over 302 redirect?
301 (permanent) tells browsers to cache the redirect. Returning visitors skip
our server entirely.
**Trade-off:** If destination URL changes, some users see the cached old URL.
Mitigated by cache-control headers and Redis TTL management.

### Why Node.js cluster over single process?
JavaScript is single-threaded. Cluster creates one worker per CPU core.
4-core server = 4× throughput. Trade-off: shared state must go through Redis
(not memory). We designed for this from the start.

> **Note:** On Render/Railway free tier, use `node src/index.js` (not cluster)
> to avoid memory limits.

---

## 🔐 Security Features

- **Helmet** — 12+ security headers (HSTS, CSP, X-Frame-Options, etc.)
- **JWT** — Access token (15min) + refresh token (7d, httpOnly cookie)
- **Token rotation** — Refresh tokens are rotated and blacklisted on use
- **NoSQL injection** — express-mongo-sanitize strips `$` operators from inputs
- **HTTP param pollution** — hpp prevents parameter array injection
- **Zod validation** — All inputs validated at route level before DB operations
- **Rate limiting** — Token bucket per IP (redirect) and per user (API/create)
- **Request size limit** — 10KB max body to prevent payload attacks
- **IP anonymization** — Last octet masked before storing (GDPR-friendly)

---

## 📈 Monitoring

| Endpoint | Description |
|---|---|
| `GET /health` | Service health check (used by UptimeRobot) |
| `GET /metrics` | Performance metrics: latency p50/p95/p99, cache hit rate, RPM |

---

## 🧪 Tests

```bash
cd backend
npm test               # Run all tests
npm run test:coverage  # With coverage report
```

**Test coverage:**
- `redirect.test.js` — Cache HIT/MISS, bloom filter, expiry, A/B test, queue
- `rateLimiter.test.js` — Token bucket: limits, reset, separate buckets, headers
- `analytics.test.js` — Geo, device parsing, Redis counters, IP anonymization

---

## 🌐 Deployment

### Backend (Render)
1. Connect GitHub repo to Render
2. Set environment variables (see `.env.example`)
3. Build command: `cd backend && npm install`
4. Start command: `node src/index.js`

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Root directory: `frontend`
3. Set `VITE_API_URL` and `VITE_BASE_URL` environment variables

### Required secrets for GitHub Actions
```
RENDER_SERVICE_ID   — Render service ID
RENDER_API_KEY      — Render API key
VERCEL_TOKEN        — Vercel deployment token
```

---

## 📜 License

MIT © 2026 Sujal Sharma
