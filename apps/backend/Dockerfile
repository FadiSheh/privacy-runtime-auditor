FROM node:18-alpine

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspace packages and apps
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install dependencies
RUN npm ci --omit=dev

# Build packages and backend
RUN npm run build --workspace packages/shared
RUN npm run build --workspace packages/utils
RUN npm run build --workspace packages/db
RUN npm run build --workspace packages/vendor-registry
RUN npm run build --workspace packages/rules-engine
RUN npm run build --workspace packages/policy-parser
RUN npm run build --workspace packages/report-generator
RUN npm run build --workspace packages/browser-runner
RUN npm run build --workspace apps/backend

# Run migrations
RUN npm --workspace apps/backend run db:migrate

# Run seed
RUN npm --workspace apps/backend run db:seed

EXPOSE 3001

CMD ["npm", "--workspace", "apps/backend", "run", "start"]
