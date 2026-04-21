FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspace packages and apps
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install dependencies needed for building
RUN npm ci

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

FROM node:22-alpine

WORKDIR /app

# Copy workspace files
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/backend/ ./apps/backend/

# Install production dependencies only for runtime
RUN npm ci --omit=dev

# Point workspace package exports at built artifacts for Node runtime.
RUN node -e "const fs=require('fs'); const path=require('path'); for (const dir of fs.readdirSync('packages')) { const pkgPath=path.join('packages', dir, 'package.json'); if (!fs.existsSync(pkgPath)) continue; const pkg=JSON.parse(fs.readFileSync(pkgPath, 'utf8')); pkg.main='./dist/index.js'; pkg.module='./dist/index.mjs'; pkg.types='./dist/index.d.ts'; pkg.exports={'.':{types:'./dist/index.d.ts',import:'./dist/index.mjs',require:'./dist/index.js',default:'./dist/index.js'}}; fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2)); }"

EXPOSE 3001

CMD ["npm", "--workspace", "apps/backend", "run", "start"]
