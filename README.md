# Privacy Runtime Auditor (PRA)

A production-oriented runtime privacy compliance auditing platform for websites. PRA detects cookies, storage, scripts, network requests, pixels, and third-party vendors by crawling websites dynamically and testing behaviour across multiple consent scenarios.

## Features

- **Dynamic website crawling** — discover and analyse up to 15 relevant pages
- **Multiple consent scenarios** — test before consent, accept all, reject all, and granular choices
- **Runtime evidence collection** — cookies, localStorage, sessionStorage, IndexedDB, scripts, network requests
- **Advanced signal detection** — canvas/WebGL fingerprinting, session replay tools, keystroke capture, pixel signatures, cookie-blocker evasion
- **Privacy-dependent tracker detection** — highlights trackers that appear or disappear depending on consent state
- **Rule-based findings** — 12 deterministic rules with severity levels
- **Compliance scoring** — four dimension scores (0–100) and an overall score
- **Report generation** — PDF and JSON reports with evidence and remediation hints
- **Historical tracking** — baseline scanning and regression detection

---

## Quick Start

### With Docker Compose (recommended)

**Prerequisites:** Docker with Compose plugin (Docker Desktop or `docker compose` v2 CLI).

```bash
# 1. Clone and enter the repo
git clone <repo-url> pra && cd pra

# 2. Start all services — migrations and seed data run automatically
docker compose up -d

# 3. Tail logs to watch startup
docker compose logs -f api
```

Once the `api` container logs `Server listening at http://0.0.0.0:3001` the stack is ready:

| Service  | URL                                       |
|----------|-------------------------------------------|
| Frontend | <http://localhost:3000>                   |
| Backend  | <http://localhost:3001>                   |
| Health   | <http://localhost:3001/health>            |

> **Port conflict on 3000?** Use `FRONTEND_PORT=3002 docker compose up -d`.

To stop the stack:

```bash
docker compose down          # keep volumes (database persisted)
docker compose down -v       # also wipe volumes (full reset)
```

---

### Local Development (without Docker)

**Prerequisites:** Node.js 22+, PostgreSQL 16, Redis 7.

#### 1. Install dependencies

```bash
npm install
```

#### 2. Create your environment file

```bash
cp .env.example .env
```

Edit `.env` and replace the Docker-internal hostnames with `localhost`:

```env
# Database — point to your local PostgreSQL
DATABASE_URL=postgresql://pra_user:pra_password@localhost:5432/pra_db

# Redis — point to your local Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
NODE_ENV=development

# Frontend — use localhost so the browser can reach the API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Worker
WORKER_CONCURRENCY=2
STORAGE_PATH=./data/uploads

# Change this before deploying
JWT_SECRET=your-secret-key-change-in-production

# Uncomment to allow scanning localhost URLs during development
# ALLOW_PRIVATE_TARGETS=true
```

#### 3. Create the database and user

```bash
# In psql as a superuser:
createuser pra_user --pwprompt        # password: pra_password
createdb pra_db --owner=pra_user
```

#### 4. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

#### 5. Start all services

```bash
npm run dev
```

This starts the backend API, worker, and frontend concurrently in the same terminal. Access the app at <http://localhost:3000>.

To start services individually in separate terminals:

```bash
# Terminal 1 — Backend API (port 3001)
npm run dev:backend

# Terminal 2 — Worker (no HTTP port, connects to queue)
npm run dev:worker

# Terminal 3 — Frontend (port 3000)
npm run dev:frontend
```

---

## Architecture

Multi-service monorepo built on npm workspaces.

```
├── apps/
│   ├── frontend/          # Next.js 15, React 19, Tailwind CSS
│   ├── backend/           # Fastify 5 API, Zod validation, rate limiting
│   └── worker/            # BullMQ consumer, Playwright browser automation
├── packages/
│   ├── shared/            # Domain types and Zod schemas
│   ├── utils/             # URL safety, validation, logger
│   ├── db/                # Drizzle ORM schema, migrations, seed
│   ├── vendor-registry/   # Third-party vendor classification
│   ├── rules-engine/      # Finding rules (R001–R012) and scoring
│   ├── policy-parser/     # Privacy policy HTML extraction
│   ├── report-generator/  # JSON and PDF report output
│   └── browser-runner/    # Playwright scanning and evidence collection
├── tests/
│   ├── integration/       # API and worker integration tests
│   ├── e2e/               # Playwright end-to-end tests
│   └── helpers/           # Fixture server for testing
├── docker-compose.yml
├── vitest.config.ts
└── playwright.config.ts
```

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript 5.8 |
| HTTP | Fastify 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Queue | Redis 7 + BullMQ |
| Browser | Playwright 1.53 (Chromium) |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Tests | Vitest (unit/integration), Playwright test (E2E) |

---

## How It Works

### Scan pipeline

1. **Crawl** — Headless Chromium visits the target URL and discovers up to the configured number of pages by following internal links.
2. **Consent scenarios** — Each page is tested under four browser contexts:
   - **Pre-consent** — No cookies, no banner interaction. Captures what runs before the user makes any choice.
   - **Accept all** — "Accept all" is simulated on the consent banner.
   - **Reject all** — "Reject all" is simulated. Verifies that tracking actually stops.
   - **Granular (functional only)** — Only necessary consent is granted. Detects whether granular controls are respected.
3. **Evidence collection** — For each page × scenario combination: cookies, localStorage, sessionStorage, IndexedDB, network requests, script sources, and browser instrumentation signals (canvas/WebGL API calls, form listeners, input-correlated requests).
4. **Vendor classification** — Every cookie domain, request host, and script is matched against the built-in vendor registry to identify known trackers and their declared purposes.
5. **Signal synthesis** — Artifacts are summarised into higher-level privacy signals (ad trackers, fingerprinting, session recorders, pixel presence, etc.).
6. **Rule evaluation** — 12 deterministic rules produce findings with severity levels.
7. **Policy parsing** — The site's privacy policy is fetched and parsed to cross-reference disclosed vendors against observed ones.
8. **Scoring** — Four compliance dimension scores (0–100) and an overall score are computed.
9. **Report generation** — A JSON report and a human-readable PDF are produced and stored.

### Evidence collected

| Evidence type | What PRA looks for |
|---|---|
| Cookies set pre-consent | Tracking identifiers fired before consent — a GDPR/ePrivacy violation |
| Cookies after reject | Cookies that persist after "Reject all" — proof of ineffective opt-out |
| Storage | Non-functional data in localStorage/sessionStorage/IndexedDB without consent |
| Network requests | Third-party beacons and pixels sent before or despite rejection |
| Loaded scripts | Third-party SDKs executing before consent |
| Advanced browser signals | Canvas/WebGL calls, form listeners, requests triggered during typing |
| Vendor classification | Whether observed vendors are disclosed in the privacy policy |
| Consent banner | Whether a banner is present, whether reject is as easy as accept |
| Granular controls | Whether "functional only" actually limits data collection |

### Advanced detection signals

| Signal | Detection strategy |
|---|---|
| Ad trackers | Third-party requests/scripts/iframes classified as advertising vendors |
| Third-party cookies | Cookies whose domain is not first-party for the scanned site |
| Cookie-blocker evasion | Storage writes, ETag presence, ID-bearing requests, first-party cloaked traffic |
| Canvas fingerprinting | `toDataURL`, `getImageData`, `measureText`, `getParameter`, `readPixels` API calls |
| Session recorders | Vendor/script matching for Hotjar, FullStory, Mouseflow, Contentsquare, Crazy Egg, Lucky Orange |
| Keystroke capture | Form/input listeners plus network sends correlated with typing events |
| Facebook / TikTok / X Pixel | URL, script, and vendor signatures for known pixel endpoints |
| Google remarketing | Ads/DoubleClick/GA request patterns associated with remarketing audiences |

### Compliance scores

Scores range from **0** (non-compliant) to **100** (fully compliant).

| Dimension | What it measures |
|---|---|
| **Pre-consent** | How clean the page is before any user interaction |
| **Consent UX** | Quality of the consent mechanism (banner presence, reject-all accessibility) |
| **Blocking** | How effectively vendors are blocked after rejection |
| **Policy** | Alignment between runtime behaviour and the privacy policy |
| **Overall** | Weighted aggregate of the four dimensions |

### Finding rules (R001–R012)

| Rule | Severity | Description |
|---|---|---|
| R001 | critical | Non-essential tracking before consent |
| R002 | high | Missing consent banner |
| R003 | critical | Ineffective reject all — tracking persists after rejection |
| R004 | medium | Dark patterns in consent UX |
| R005 | high | Policy–runtime vendor mismatch |
| R006 | medium | Cookie set at runtime but not listed in the privacy policy |
| R007 | high | Rejection less effective than acceptance |
| R008 | high | Granular controls not respected after functional-only selection |
| R009 | high | Storage written without consent |
| R010 | info | Vendor mentioned in policy but never observed at runtime |
| R011 | high | Consent regression from baseline scan |
| R012 | medium | New vendor detected since baseline |

---

## API Reference

### Projects

| Method | Path | Description |
|---|---|---|
| `POST` | `/projects` | Create a project |
| `GET` | `/projects` | List all projects |
| `GET` | `/projects/:id` | Get project details |
| `PATCH` | `/projects/:id` | Update project |
| `DELETE` | `/projects/:id` | Delete project |
| `GET` | `/projects/:id/scans` | List scans for a project |
| `POST` | `/projects/:id/scans` | Start a new scan |

### Scans

| Method | Path | Description |
|---|---|---|
| `GET` | `/scans/:id` | Get scan metadata |
| `GET` | `/scans/:id/status` | Scan progress (phase, page, % complete) |
| `GET` | `/scans/:id/findings` | Findings with evidence |
| `GET` | `/scans/:id/pages` | Discovered pages and their scenarios |
| `GET` | `/scans/:id/policies` | Extracted privacy policies |
| `GET` | `/scans/:id/privacy-dependent-trackers` | Trackers that change behaviour per consent |
| `GET` | `/scans/:id/report.json` | Full JSON report |
| `GET` | `/scans/:id/report.pdf` | PDF report download |
| `GET` | `/scans/:id/diff` | Changes vs. baseline |
| `POST` | `/scans/:id/set-baseline` | Mark scan as baseline |
| `POST` | `/scans/:id/cancel` | Stop a running scan |

### Other

| Method | Path | Description |
|---|---|---|
| `GET` | `/vendors` | Vendor registry |
| `GET` | `/health` | Health check |

### Scan configuration

When starting a scan (`POST /projects/:id/scans`), an optional `config` object is accepted:

```json
{
  "maxPages": 15,
  "preActionWaitMs": 2000,
  "postActionWaitMs": 1000,
  "scannerTimeoutMs": 30000
}
```

---

## Configuration

All services are configured via environment variables. Copy `.env.example` as a starting point.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string (`memory` for in-memory test mode) |
| `API_PORT` | `3001` | Backend HTTP port |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |
| `NEXT_PUBLIC_API_URL` | — | API base URL as seen by the browser |
| `WORKER_CONCURRENCY` | `2` | Parallel scan jobs |
| `STORAGE_PATH` | `./data/uploads` | Directory for generated report files |
| `JWT_SECRET` | — | Secret for auth token signing — **change before deploying** |
| `ALLOW_PRIVATE_TARGETS` | `false` | Allow scanning `localhost`/`127.x.x.x` (for development) |
| `FRONTEND_PORT` | `3000` | Host port mapped to the frontend container |

---

## Testing

### Unit tests

```bash
npm run test:unit
```

Covers URL validation, vendor classification, scoring, policy parsing, report generation, database migrations, and browser discovery.

### Integration tests

```bash
npm run test:integration
```

Full API and worker orchestration tests using PGlite (in-memory database) and no-op queue (`REDIS_URL=memory`). No external services required.

### End-to-end tests

```bash
npm run test:e2e
```

Browser-driven Playwright tests simulating the full user flow from homepage through to report viewing. Requires the stack to be running.

### All tests

```bash
npm test   # runs test:unit + test:integration
```

### In-memory mode for CI / offline testing

```bash
export NODE_ENV=test
export DATABASE_URL=memory          # PGlite in-memory database
export REDIS_URL=memory             # No-op queue
export ALLOW_PRIVATE_TARGETS=true   # Scan localhost fixture server
```

---

## Build & Code Quality

```bash
# Build all packages and apps
npm run build

# TypeScript validation across the entire monorepo
npm run typecheck

# ESLint
npm run lint
```

### Docker production build

```bash
docker compose build        # build all images
docker compose up -d        # start detached
docker compose logs -f      # stream logs
docker compose down         # stop (keep data)
docker compose down -v      # stop and wipe all data
```

---

## Contributing

Contributions are welcome. Keep changes focused, follow the monorepo structure, and include tests for anything that affects crawling, rule evaluation, API contracts, persistence, or user-facing flows.

Before opening a pull request:

```bash
npm run typecheck
npm test
```

For frontend or E2E changes:

```bash
npm run test:e2e
```

When changing the database schema, update the Drizzle schema and migration files together. When changing scanner behaviour, add evidence in tests or fixtures so regressions are easy to reproduce.

---

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE).
