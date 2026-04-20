# Privacy Runtime Auditor (PRA)

A production-oriented runtime privacy compliance auditing platform for websites. PRA detects cookies, storage, scripts, requests, pixels, and third-party vendors by crawling websites dynamically and testing behavior across multiple consent scenarios.

## Features

- 🔍 **Dynamic Website Crawling** - Discover and analyze up to 15 relevant pages
- 📋 **Multiple Consent Scenarios** - Test before consent, accept all, reject all, granular choices
- 🎯 **Runtime Evidence Collection** - Cookies, localStorage, sessionStorage, IndexedDB, scripts, requests
- 📊 **Findings & Scoring** - Rule-based analysis with severity levels and compliance scores
- 📝 **Report Generation** - PDF and JSON reports with evidence and remediation hints
- 🔄 **Historical Tracking** - Baseline scanning and regression detection
- ✅ **Fully Tested** - Unit, integration, and E2E test coverage

## Architecture

Multi-service monorepo architecture:

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend API**: Fastify with Zod validation, rate limiting, CORS
- **Worker Service**: BullMQ queue, Playwright browser automation
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: Redis + BullMQ
- **Shared Packages**: URL logic, vendor registry, rules engine, policy parsing, report generation, browser runner

## Project Structure

```
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

- Docker & Docker Compose 3.8+ (recommended for local development)
- OR Node.js 18+, PostgreSQL 16+, Redis 7+

### With Docker Compose (Recommended)

```bash
# Start all services (frontend, backend, worker, postgres, redis)
docker-compose up

# In a separate terminal, run migrations and seed data
docker-compose exec api npm --workspace apps/backend run db:migrate
docker-compose exec api npm --workspace apps/backend run db:seed

# Access the application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:3001
```

### Local Development (Without Docker)

1. Install dependencies:

```bash
npm install
```

2. Set up environment:

```bash
cp .env.example .env
# Edit .env with your PostgreSQL and Redis URLs
export DATABASE_URL="postgresql://user:password@localhost:5432/pra_db"
export REDIS_URL="redis://localhost:6379"
```

3. Set up database:

```bash
npm run db:migrate
npm run db:seed
```

4. Start services in separate terminals:

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

### Linting

```bash
npm run lint
```

Runs ESLint on all source files.

### Docker Compose Production Build

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
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

TBD
