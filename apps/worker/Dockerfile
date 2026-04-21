FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspace packages and apps
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies needed for building
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

# Build packages and worker
RUN npm run build --workspace packages/shared
RUN npm run build --workspace packages/utils
RUN npm run build --workspace packages/db
RUN npm run build --workspace packages/vendor-registry
RUN npm run build --workspace packages/rules-engine
RUN npm run build --workspace packages/policy-parser
RUN npm run build --workspace packages/report-generator
RUN npm run build --workspace packages/browser-runner
RUN npm run build --workspace apps/worker

# Use Ubuntu-based image for Playwright compatibility
FROM node:22-bookworm-slim

WORKDIR /app

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy built workspace
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/worker/ ./apps/worker/

# Install all deps (including devDeps for playwright CLI), install browsers, then prune
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
RUN npm ci
RUN npx playwright install chromium
RUN npm prune --omit=dev

# Point workspace package exports at built artifacts for Node runtime.
RUN node -e "const fs=require('fs'); const path=require('path'); for (const dir of fs.readdirSync('packages')) { const pkgPath=path.join('packages', dir, 'package.json'); if (!fs.existsSync(pkgPath)) continue; const pkg=JSON.parse(fs.readFileSync(pkgPath, 'utf8')); pkg.main='./dist/index.js'; pkg.module='./dist/index.mjs'; pkg.types='./dist/index.d.ts'; pkg.exports={'.':{types:'./dist/index.d.ts',import:'./dist/index.mjs',require:'./dist/index.js',default:'./dist/index.js'}}; fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2)); }"

ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

CMD ["npm", "--workspace", "apps/worker", "run", "start"]
