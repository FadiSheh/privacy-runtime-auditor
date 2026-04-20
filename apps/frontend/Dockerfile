FROM node:18-alpine

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Copy app files
COPY . .

# Install dependencies
RUN npm ci

# Build
RUN npm run build

EXPOSE 3000

ENV NEXT_PUBLIC_API_URL=http://api:3001
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
