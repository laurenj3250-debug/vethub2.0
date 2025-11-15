FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
