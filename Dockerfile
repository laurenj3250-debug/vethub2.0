# Stage 1: Build stage
FROM mcr.microsoft.com/playwright:v1.48.2-jammy AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client (required for build)
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate

# Build Next.js
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production runtime
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies AND prisma (needed for runtime generation)
RUN npm ci --only=production
RUN npm install prisma --save-dev

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package*.json ./

# Copy Prisma schema (needed for migrations at runtime)
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_ENV=production

EXPOSE 3000

# Create start script that runs migrations and starts server
RUN echo '#!/bin/sh\n\
set -e\n\
echo "Running database migrations..."\n\
npx prisma migrate deploy\n\
echo "Starting Next.js server..."\n\
exec npm start' > /app/start.sh && chmod +x /app/start.sh

CMD ["/bin/sh", "/app/start.sh"]
