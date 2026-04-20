# Privacy Runtime Auditor (PRA)

A production-oriented runtime privacy compliance auditing platform for websites.

## Overview

PRA detects cookies, storage, scripts, requests, pixels, and third-party vendors by crawling websites dynamically and testing behavior across multiple consent scenarios.

### Key Features
- 🔍 **Dynamic Website Crawling** - Discover and analyze up to 15 relevant pages
- 📋 **Multiple Consent Scenarios** - Test before consent, accept all, reject all, granular choices
- 🎯 **Runtime Evidence Collection** - Cookies, localStorage, sessionStorage, IndexedDB, scripts, requests
- 📊 **Findings & Scoring** - Rule-based analysis with severity levels
- 📝 **Report Generation** - PDF and JSON reports with evidence
- 🔄 **Historical Tracking** - Baseline scanning and regression detection

## Architecture

Multi-service architecture with:
- **Frontend**: Next.js + TypeScript + Tailwind + shadcn/ui
- **Backend API**: NestJS with TypeScript
- **Worker Service**: Browser automation with Playwright
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **Deployment**: Docker Compose

## Project Structure

```
├── apps/
│   ├── frontend/       # Next.js web application
│   ├── backend/        # NestJS API server
│   └── worker/         # Background worker for crawling
├── packages/
│   └── shared/         # Shared types and utilities
├── docker-compose.yml  # Local development environment
├── .env.example        # Environment variables template
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose (or Node.js 18+)
- Git

### Local Development

1. Clone and setup:
```bash
cd /home/fshehadeh/Documents/PRA
cp .env.example .env
```

2. Start services:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Database: localhost:5432

### Manual Setup (without Docker)

```bash
# Install dependencies
npm install

# Setup database
npm run db:migrate

# Start services
npm run dev
```

## Development

### Available Scripts

```bash
# Start all services with Docker
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Run migrations
npm run db:migrate

# Run tests
npm run test

# Build for production
npm run build
```

## MVP Scope

### Input
- Root URL only

### Discovery
- 5-15 relevant pages per scan

### Scenarios
- No consent (initial state)
- Accept all
- Reject all
- Granular/customized choice (if available)

### Data Collection
- Cookies, localStorage, sessionStorage
- IndexedDB metadata
- Scripts and third-party requests
- iframes and screenshots
- DOM extracts around consent UI

### Output
- Findings with severity levels
- Evidence references
- Compliance score
- PDF & JSON reports
- Remediation hints
- Comparison against baseline scans

## Implementation Status

- [ ] Frontend setup
- [ ] Backend API setup
- [ ] Worker service setup
- [ ] Database schema
- [ ] Authentication
- [ ] Project management endpoints
- [ ] Scan orchestration
- [ ] Browser automation integration
- [ ] Rule engine
- [ ] Report generation
- [ ] Dashboard UI

## Contributing

Guidelines TBD

## License

TBD

## Resources

- [Full Specification](./privacy-runtime-auditor-spec-v2-ui.md)
