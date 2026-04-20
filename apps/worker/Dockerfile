FROM node:18-alpine

WORKDIR /app

# Install chromium for Playwright
RUN apk add --no-cache \
    chromium \
    dbus \
    ttf-freefont

# Copy workspace files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Copy app files
COPY . .

# Install dependencies
RUN npm ci

# Build
RUN npm run build

CMD ["npm", "run", "start"]
