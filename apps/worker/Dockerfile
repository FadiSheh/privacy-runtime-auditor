FROM node:18-alpine

WORKDIR /app

# Install chromium for Playwright
RUN apk add --no-cache \
    chromium \
    dbus \
    ttf-freefont

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspace packages and apps
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies
RUN npm ci --omit=dev

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

CMD ["npm", "--workspace", "apps/worker", "run", "start"]
