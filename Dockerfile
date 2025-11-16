FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Accept NEXT_PUBLIC_ environment variables as build arguments
ARG NEXT_PUBLIC_ANTHROPIC_API_KEY
ENV NEXT_PUBLIC_ANTHROPIC_API_KEY=$NEXT_PUBLIC_ANTHROPIC_API_KEY

# Build Next.js application
RUN npm run build

EXPOSE 3000

# Create start script inline to avoid line ending issues
RUN echo '#!/bin/sh\nset -e\necho "Running database migrations..."\nnpx prisma db push --accept-data-loss\necho "Starting Next.js server..."\nexec npm start' > /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/bin/sh", "/app/start.sh"]
