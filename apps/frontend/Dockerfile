FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspace packages and apps
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/

# Install dependencies
RUN npm ci

# Build packages and frontend
RUN npm run build --workspace packages/shared
RUN npm run build --workspace packages/utils
RUN npm run build --workspace apps/frontend

FROM node:18-alpine

WORKDIR /app

# Copy built packages and frontend from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/frontend/ ./apps/frontend/

# Install production dependencies only
RUN npm ci --omit=dev

EXPOSE 3000

ENV NEXT_PUBLIC_API_URL=http://api:3001
ENV NODE_ENV=production

CMD ["npm", "--workspace", "apps/frontend", "run", "start"]
