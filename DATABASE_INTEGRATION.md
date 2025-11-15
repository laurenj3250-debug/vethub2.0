# VetHub 2.0 - Database Integration Summary

## Overview

Integrated PostgreSQL database with VetHub 2.0 using Prisma ORM, connecting to Railway-hosted backend. This enables persistent storage of patient data from VetRadar imports and manual entries.

## What Was Done

### 1. **Prisma Setup**
- Installed `prisma` and `@prisma/client` packages
- Created comprehensive database schema in `prisma/schema.prisma`
- Generated Prisma Client for TypeScript
- Added postinstall script to generate Prisma client on deployment

### 2. **Database Schema**
Created models for:
- **Patient**: Main patient record with JSON fields for flexible data storage
  - Demographics, medical history, current stay
  - Rounding data, MRI data, sticker data, appointment info
- **SOAPNote**: Clinical documentation (one-to-many with Patient)
- **Task**: Patient-specific and general tasks (one-to-many with Patient)
- **CommonProblem, CommonComment, CommonMedication**: Autocomplete data

### 3. **API Routes Created**
- `GET /api/patients` - Fetch all patients with optional status filter
- `POST /api/patients` - Create new patient
- `GET /api/patients/[id]` - Fetch single patient
- `PATCH /api/patients/[id]` - Update patient
- `DELETE /api/patients/[id]` - Delete patient

### 4. **VetRadar Integration**
Updated `POST /api/integrations/vetradar/patients` to:
- Import patients from VetRadar via web scraping
- **Save patients to database** (new patients) or **update existing** (sync)
- Match patients by name for sync functionality
- Preserve manual entries while updating VetRadar data

### 5. **PatientContext Updates**
Modified `src/contexts/PatientContext.tsx`:
- **API-first approach**: Try database API before localStorage
- **Fallback to localStorage**: Works offline if API unavailable
- `loadPatients()`: Calls `/api/patients`, falls back to localStorage
- `createPatient()`: Calls `/api/patients` POST, falls back to localStorage

### 6. **Build Configuration**
- Updated `package.json`:
  - `build` script generates Prisma client before Next.js build
  - `postinstall` script ensures Prisma client is generated on deployment
  - Added `db:push` and `db:studio` scripts for database management

## File Changes

### New Files
- `prisma/schema.prisma` - Database schema
- `prisma.config.ts` - Prisma configuration with dotenv
- `src/lib/prisma.ts` - Prisma client singleton
- `src/app/api/patients/route.ts` - GET/POST patient endpoints
- `src/app/api/patients/[id]/route.ts` - GET/PATCH/DELETE patient by ID
- `.env` - Environment variables for local development

### Modified Files
- `src/app/api/integrations/vetradar/patients/route.ts` - Now saves to database
- `src/contexts/PatientContext.tsx` - API-first with localStorage fallback
- `package.json` - Added Prisma scripts
- `src/app/patient-import/page.tsx` - Auto-fill VetRadar credentials
- `src/components/RoundingPageClient.tsx` - Added "Sync VetRadar" button
- `src/lib/integrations/vetradar-scraper.ts` - Changed to headless mode

## How It Works

### Patient Import Flow
```
1. User clicks "Import Patients from VetRadar" on /patient-import
2. POST /api/integrations/vetradar/patients
3. VetRadarScraper fetches patient data from VetRadar
4. VetRadarMapper maps to UnifiedPatient format (85% auto-filled)
5. API saves to Prisma → PostgreSQL database
6. Returns patients for manual data entry
7. User completes manual fields
8. Saves to database via PATCH /api/patients/[id]
```

### Sync Flow
```
1. User clicks "Sync VetRadar" button on /rounding
2. POST /api/integrations/vetradar/patients
3. Scrapes latest medications/treatments from VetRadar
4. Finds existing patient by name in database
5. **Updates** existing patient (preserves manual entries)
6. Returns updated patient list
7. UI refreshes with latest VetRadar data
```

### Data Persistence
```
- **Production (Railway)**: Prisma → PostgreSQL database
- **Development (Local)**: Prisma → localStorage fallback
- **Offline Mode**: localStorage fallback always available
```

## Deployment Steps

### Railway Deployment

1. **Push code to Railway**:
   ```bash
   git add .
   git commit -m "Add database integration with Prisma and VetRadar sync"
   git push
   ```

2. **Railway will automatically**:
   - Run `npm install` (includes `postinstall` → `prisma generate`)
   - Run `npm run build` (generates Prisma client again)
   - Connect to Railway PostgreSQL database via `DATABASE_URL`

3. **Push database schema** (after deployment):
   ```bash
   railway run npm run db:push
   ```
   This creates tables in the Railway PostgreSQL database.

4. **Verify deployment**:
   - Visit your Railway app URL
   - Go to `/patient-import`
   - Import patients from VetRadar
   - Check that patients persist across page reloads

### Environment Variables

Railway should have:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Railway)
- `NEXT_PUBLIC_VETRADAR_EMAIL` - VetRadar login email
- `NEXT_PUBLIC_VETRADAR_PASSWORD` - VetRadar password

## Testing Locally

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Test import**:
   - Visit http://localhost:3000/patient-import
   - Click "Import Patients from VetRadar"
   - Should save to localStorage (API calls will fail locally without Railway DB)

3. **Test sync**:
   - Visit http://localhost:3000/rounding
   - Click "Sync VetRadar" button
   - Should update patients with latest VetRadar data

## Next Steps

1. **Deploy to Railway** - Push changes and run `railway run npm run db:push`
2. **Test VetRadar import on production** - Verify database persistence
3. **Add authentication** - Secure API routes with user authentication
4. **Add Common Items endpoints** - Create API routes for problems/comments/medications autocomplete
5. **Add Task endpoints** - Create API routes for patient task management

## Technical Notes

- **JSON fields**: Used Prisma `Json` type for flexible nested objects (demographics, rounding data, etc.)
- **Name matching**: Sync functionality matches patients by `demographics.name` (no unique ID from VetRadar)
- **Cascading deletes**: Deleting a patient deletes associated SOAP notes and tasks
- **Timestamps**: Auto-managed by Prisma (`createdAt`, `updatedAt`)
- **Indexing**: Added indexes on `status`, `createdAt`, `patientId`, `completed` for query performance

## Database Schema Diagram

```
Patient (id, status, demographics, medicalHistory, ...)
  ├─ SOAPNote (id, patientId, createdAt, subjective, ...)
  └─ Task (id, patientId, title, completed, ...)

CommonProblem (id, name)
CommonComment (id, name)
CommonMedication (id, name)
```

## Troubleshooting

**"Failed to fetch" error**:
- Check Railway DATABASE_URL is set
- Verify Prisma client generated (`npm run postinstall`)
- Check Railway deployment logs for errors

**Patients not persisting**:
- Check Railway database has tables (`railway run npm run db:push`)
- Verify API routes are accessible (check Railway logs)
- Check browser console for API errors

**VetRadar sync not working**:
- Verify VetRadar credentials in Railway environment variables
- Check that Playwright can run in Railway environment (headless mode)
- Check Railway logs for scraper errors
