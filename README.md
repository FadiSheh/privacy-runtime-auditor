# Privacy Runtime Auditor (PRA)

A production-oriented runtime privacy compliance auditing platform for websites. PRA detects cookies, storage, scripts, requests, pixels, and third-party vendors by crawling websites dynamically and testing behavior across multiple consent scenarios.

## Features

- 🔍 **Dynamic Website Crawling** - Discover and analyze up to 15 relevant pages
- 📋 **Multiple Consent Scenarios** - Test before consent, accept all, reject all, granular choices
- 🎯 **Runtime Evidence Collection** - Cookies, localStorage, sessionStorage, IndexedDB, scripts, requests
- 🧪 **Advanced Privacy Signal Detection** - Canvas/WebGL fingerprinting, session replay tools, key capture signals, pixel signatures, and cookie-blocker evasion heuristics
- 🔄 **Privacy-Dependent Tracker Detection** - Highlights trackers that appear or disappear depending on consent state
- 📊 **Findings & Scoring** - Rule-based analysis with severity levels and compliance scores
- 📝 **Report Generation** - PDF and JSON reports with evidence and remediation hints
- 🔄 **Historical Tracking** - Baseline scanning and regression detection
- ✅ **Fully Tested** - Unit, integration, and E2E test coverage

## How It Works

### Scan Pipeline

1. **Crawl** — A headless Chromium browser visits the target website and discovers up to the configured number of pages by following internal links from the root URL.
2. **Consent scenarios** — Each discovered page is tested under four distinct browser contexts:
   - **Pre-consent** — Page loaded with no cookies, before any banner interaction. Captures what runs before the user has expressed any choice.
   - **Accept all** — A consent banner "Accept all" action is simulated. Captures what is activated after full consent is given.
   - **Reject all** — A "Reject all" action is simulated. The system verifies that tracking actually stops.
   - **Granular (functional only)** — Only functional/necessary consent is granted. Used to detect whether granular controls are respected.
3. **Evidence collection** — For each page × scenario combination, the runner collects:
   - **Cookies** (name, domain, secure/httpOnly flags, SameSite, expiry)
   - **localStorage** and **sessionStorage** entries
   - **IndexedDB** databases and record counts
   - **Network requests** (URLs, methods, initiators)
   - **Script sources** loaded on the page
   - **Browser instrumentation signals** (canvas/WebGL API calls, form listeners, input-correlated network sends)
4. **Vendor classification** — Every cookie domain, request host, and script source is matched against the built-in vendor registry to identify known third-party trackers (Google Analytics, Meta Pixel, HotJar, etc.) and their declared purposes (analytics, advertising, functional, …).
5. **Advanced signal synthesis** — Collected artifacts are summarized into higher-level privacy signals such as ad tracker counts, third-party cookies, cookie-blocker evasion heuristics, canvas fingerprinting, session recorders, keystroke capture, pixel presence, and Google remarketing indicators.
6. **Rule evaluation** — The rules engine runs 12 deterministic rules across the collected evidence to produce findings with severity levels.
7. **Policy parsing** — The site's privacy policy URL (if resolvable) is fetched and parsed to cross-reference which vendors are disclosed vs. which are observed at runtime.
8. **Scoring** — Four compliance dimension scores (0–100) and an overall score are computed from the findings.
9. **Report generation** — A structured JSON report and a human-readable PDF report are produced and stored.

### What Is Analyzed

| Evidence type | What PRA looks for |
| --- | --- |
| Cookies set pre-consent | Tracking identifiers fired before the user consents — a GDPR/ePrivacy violation |
| Cookies after reject | Cookies that persist after "Reject all" — proof of ineffective opt-out |
| Storage (localStorage / sessionStorage / IndexedDB) | Non-functional data stored without consent |
| Network requests | Third-party beacons and pixels sent before or despite rejection |
| Loaded scripts | Third-party SDKs executing before consent |
| Advanced browser signals | Canvas/WebGL calls, form event listeners, and requests triggered during typing |
| Vendor classification | Whether observed vendors are disclosed in the privacy policy |
| Consent banner behavior | Whether a banner is present, whether reject-all is as easy as accept-all (dark patterns) |
| Granular controls | Whether selecting "functional only" actually limits data collection |
| Privacy-dependent trackers | Which non-essential trackers change behavior across no-consent, accept-all, reject-all, and granular scenarios |

### Advanced Detection Coverage

In addition to rule-based compliance findings, PRA now synthesizes a privacy-signal summary from runtime artifacts. This summary is exposed in `report.json`, rendered in the PDF report, and displayed in the scan UI.

| Signal | Detection strategy |
| --- | --- |
| Ad trackers | Third-party requests, scripts, and iframes classified as advertising vendors |
| Third-party cookies | Browser cookies whose domain is not first-party for the scanned site |
| Cookie-blocker evasion | Heuristics across storage writes, ETag presence, identifier-bearing requests, apparent ID sync endpoints, and first-party cloaked vendor traffic |
| Canvas fingerprinting | Instrumented calls to canvas and WebGL APIs such as `toDataURL`, `getImageData`, `measureText`, `getParameter`, and `readPixels` |
| Session recorders | Vendor and script matching for tools such as Hotjar, FullStory, Mouseflow, Contentsquare, Crazy Egg, and Lucky Orange |
| Keystroke capture | Form/input listeners plus network transmissions observed immediately after typing events |
| Facebook / TikTok / X Pixel | URL, script, and vendor signatures for known pixel endpoints and libraries |
| Google Analytics remarketing | Google Ads / DoubleClick / GA request patterns associated with remarketing audiences |

These signals are heuristic detections. They are intended to surface likely privacy-relevant behavior quickly, not to replace a manual forensic review when a legal-grade conclusion depends on edge cases.

### Understanding the Findings

Each finding has a **rule ID**, a **severity** (critical / high / medium / low / info), a **page** where it was observed, and **evidence** (the specific cookies, requests, or vendors involved).

| Rule | What it means |
| --- | --- |
| **R001** Non-essential tracking before consent | A tracking cookie, pixel, or script fired before the user interacted with the consent banner. This is a direct GDPR/ePrivacy violation. |
| **R002** Missing consent banner | No recognizable consent mechanism was detected on the page. |
| **R003** Ineffective reject all | Cookies or requests observed after "Reject all" that were also present after "Accept all" — rejection has no real effect. |
| **R004** Dark patterns in consent UX | "Reject" is harder to reach than "Accept" (extra clicks, hidden options, pre-ticked boxes). |
| **R005** Policy–runtime vendor mismatch | A third-party vendor observed at runtime is not mentioned anywhere in the privacy policy. |
| **R006** Cookie without policy disclosure | A specific cookie (by name/domain) is set at runtime but not listed in the privacy policy cookie table. |
| **R007** Rejection less effective than acceptance | Significantly fewer tracking cookies are cleared on rejection than would be expected — indicates a partial opt-out. |
| **R008** Granular controls not persisted | After selecting granular consent (functional only), tracking vendors that should be off are still active. |
| **R009** Storage without consent | Data written to localStorage, sessionStorage, or IndexedDB before the user consented. |
| **R010** Unexpected vendor in policy | The privacy policy names a vendor that was never observed at runtime (not a violation, but useful for policy hygiene). |
| **R011** Consent regression from baseline | A vendor or cookie that was absent in a previous baseline scan has appeared in the current scan. |
| **R012** New vendor detected | A new third-party vendor appeared since the baseline was set. |

### Compliance Scores

Scores range from **0** (non-compliant) to **100** (fully compliant). A score of 0 does not mean the site is broken — it means the dimension has critical unresolved findings.

| Dimension | What it measures |
| --- | --- |
| **Pre-consent** | How clean the page is before any user interaction |
| **Consent UX** | Quality of the consent mechanism (banner presence, reject-all accessibility) |
| **Blocking** | How effectively vendors are blocked after rejection |
| **Policy** | Alignment between the runtime behaviour and the privacy policy |
| **Overall** | Weighted aggregate of the four dimensions |

## Architecture

Multi-service monorepo architecture:

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend API**: Fastify with Zod validation, rate limiting, CORS
- **Worker Service**: BullMQ queue, Playwright browser automation
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: Redis + BullMQ
- **Shared Packages**: URL logic, vendor registry, rules engine, policy parsing, report generation, browser runner

## Project Structure

```text
├── apps/
│   ├── frontend/              # Next.js web application
│   ├── backend/               # Fastify API server
│   └── worker/                # Background worker for crawling
├── packages/
│   ├── shared/                # Shared domain types
│   ├── utils/                 # URL safety, validation
│   ├── db/                    # Drizzle schema, migrations, seed
│   ├── vendor-registry/       # Vendor classification
│   ├── rules-engine/          # Finding rules and scoring
│   ├── policy-parser/         # Privacy policy extraction
│   ├── report-generator/      # JSON and PDF reporting
│   └── browser-runner/        # Playwright scanning logic
├── tests/
│   ├── integration/           # API and worker integration tests
│   ├── e2e/                   # Playwright end-to-end tests
│   └── helpers/               # Fixture server for testing
├── docker-compose.yml         # Local development environment
├── playwright.config.ts       # E2E test configuration
├── vitest.config.ts           # Unit/integration test configuration
└── tsconfig.base.json         # Shared TypeScript config with path aliases
```

## Quick Start

### Prerequisites

- Docker with Compose support (recommended for local development)
- OR Node.js 22+, PostgreSQL 16+, Redis 7+

### With Docker Compose (Recommended)

```bash
# Start all services (frontend, backend, worker, postgres, redis)
docker compose up

# In a separate terminal, run migrations and seed data
docker compose exec api npm --workspace apps/backend run db:migrate
docker compose exec api npm --workspace apps/backend run db:seed

# Access the application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:3001
```

If port 3000 is already in use, start the frontend on another host port:

```bash
FRONTEND_PORT=3002 docker compose up
```

### Local Development (Without Docker)

1. Install dependencies:

```bash
npm install
```

1. Set up environment:

```bash
cp .env.example .env
# Edit .env with your PostgreSQL and Redis URLs
export DATABASE_URL="postgresql://user:password@localhost:5432/pra_db"
export REDIS_URL="redis://localhost:6379"
```

1. Set up database:

```bash
npm run db:migrate
npm run db:seed
```

1. Start services in separate terminals:

```bash
# Terminal 1: Backend API
npm --workspace apps/backend run dev

# Terminal 2: Worker
npm --workspace apps/worker run dev

# Terminal 3: Frontend
npm --workspace apps/frontend run dev
```

Access the application at `http://localhost:3000`

## Testing

### Unit Tests

```bash
npm run test:unit
```

Tests for URL validation, vendor classification, scoring, policy parsing, report generation, database migrations, and browser discovery.

### Integration Tests

```bash
npm run test:integration
```

Full API and worker orchestration tests using in-memory database and no-op queue (memory mode).

### End-to-End Tests

```bash
npm run test:e2e
```

Browser-driven Playwright tests simulating the full user flow from homepage to report viewing.

### Run All Tests

```bash
npm test
```

This command runs both unit and integration suites, including browser instrumentation coverage and worker orchestration in `REDIS_URL=memory` mode.

## Build & Production

### Local Build

```bash
npm run build
```

Builds all packages and apps for production.

### Type Checking

```bash
npm run typecheck
```

Validates TypeScript across all packages and apps.

The repository typecheck includes the backend memory-queue path, the worker memory-cancellation path, browser instrumentation types, and the frontend report surfaces for privacy signals.

### Linting

```bash
npm run lint
```

Runs ESLint on all source files.

### Docker Compose Production Build

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check logs
docker compose logs -f

# Stop services
docker compose down
```

## API Endpoints

### Projects

- `POST /projects` - Create a new project
- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Scans

- `POST /projects/:id/scans` - Start a new scan
- `GET /scans/:id/status` - Get scan status and progress
- `GET /scans/:id/privacy-dependent-trackers` - List trackers whose behavior changes across consent scenarios
- `GET /scans/:id/report.json` - Get JSON report
- `GET /scans/:id/report.pdf` - Get PDF report
- `POST /scans/:id/baseline` - Set as baseline scan

### Vendors

- `GET /vendors` - List all vendors
- `GET /health` - Health check

## Memory Mode for Testing

For integration tests, the system supports in-memory database and no-op queue:

```bash
# Environment variables for tests
export NODE_ENV=test
export DATABASE_URL=memory        # Uses PGlite in-memory mode
export REDIS_URL=memory           # Uses no-op queue implementation
export ALLOW_PRIVATE_TARGETS=true # Allow scanning localhost/127.0.0.1
```

## Scan Configuration

Scans accept a configuration object:

```json
{
  "maxPages": 15,
  "preActionWaitMs": 2000,
  "postActionWaitMs": 1000,
  "scannerTimeoutMs": 30000
}
```

## Findings Rules

The system evaluates 12 deterministic finding rules (R001-R012):

- **R001**: Non-essential tracking before consent
- **R002**: Missing consent banner
- **R003**: Ineffective reject all
- **R004**: Dark patterns in consent UX
- **R005**: Policy-runtime vendor mismatch
- **R006**: Cookie without policy disclosure
- **R007**: Rejection less effective than acceptance
- **R008**: Granular controls not persisted
- **R009**: Storage without consent
- **R010**: Unexpected vendor in policy
- **R011**: Consent regression from baseline
- **R012**: New vendor detected

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pra_db

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development|production|test
API_PORT=3001
WORKER_CONCURRENCY=2
STORAGE_PATH=./data/uploads

# Testing
ALLOW_PRIVATE_TARGETS=true      # Allow scanning localhost
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development Commands

```bash
# Watch mode for development
npm run dev

# Build all packages and apps
npm run build

# Clean build artifacts
rm -rf dist .next .turbo

# TypeScript validation
npm run typecheck

# Linting
npm run lint

# Database migrations
npm run db:migrate

# Database seed
npm run db:seed

# Run full test suite
npm test

# Docker development
docker-compose up
docker-compose down
docker-compose logs -f [service]
```

## Specification

For the complete specification, see [privacy-runtime-auditor-spec-v2-ui.md](./privacy-runtime-auditor-spec-v2-ui.md)

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE).
