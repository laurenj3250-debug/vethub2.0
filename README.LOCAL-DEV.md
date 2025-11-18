# VetHub 2.0 - Local Development Setup

## Quick Start

### 1. Start PostgreSQL with Docker

```bash
# Start PostgreSQL in the background
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local and add your ANTHROPIC_API_KEY
# DATABASE_URL is already set for local Docker PostgreSQL
```

### 3. Initialize Database

```bash
# Run Prisma migrations to create tables
npx prisma migrate dev

# (Optional) Seed with test data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Database Management

### View Database in Prisma Studio
```bash
npm run db:studio
```

### Reset Database (WARNING: Deletes all data)
```bash
npx prisma migrate reset
```

### Stop PostgreSQL
```bash
docker-compose down
```

### Stop and Remove All Data
```bash
docker-compose down -v
```

## Environment Variables

See `.env.local.example` for all required variables.

**Important**:
- `DATABASE_URL` should point to local Docker PostgreSQL for development
- `ANTHROPIC_API_KEY` is required for AI parsing features
- Never commit `.env.local` to git (it's in .gitignore)

## Troubleshooting

### Port 5432 already in use
If you have another PostgreSQL instance running:
```bash
# Find process using port 5432
lsof -i :5432

# Stop it or change docker-compose.yml port mapping to "5433:5432"
```

### Connection errors
```bash
# Check container is running
docker-compose ps

# Check logs for errors
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

### Prisma issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Check database connection
npx prisma db push
```

## Production vs Development

**Development (Local)**:
- Uses Docker PostgreSQL (localhost:5432)
- Faster iteration, no network latency
- Safe to experiment and reset data
- Independent from production

**Production (Railway)**:
- Uses Railway PostgreSQL (cloud)
- All real patient data
- Auto-deploys from GitHub main branch
- User's preference: Use this for all real operations

## Notes

According to `CLAUDE.md`, the user prefers to use Railway production for all patient operations.

Local development should only be used for:
- Testing UI changes
- Developing new features
- Running tests

Do NOT save real patient data locally - use Railway production at https://empathetic-clarity-production.up.railway.app/
