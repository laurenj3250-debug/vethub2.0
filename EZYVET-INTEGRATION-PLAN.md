# EzyVet API Integration Plan
**VetHub 2.0 → EzyVet Direct Integration**

## 🎯 Vision: VetHub as True Clinical Hub

Transform VetHub from "paste data" to **direct API integration** - pulling live patient data, appointments, medications, and diagnostics directly from EzyVet.

## 📊 Current State vs Future State

### Current (VetRadar Paste Workflow)
1. Export patient data from VetRadar
2. Copy text to clipboard
3. Paste into VetHub
4. AI parses text → rounding sheet

**Problems:**
- Manual copy/paste required
- Data becomes stale immediately
- No real-time updates
- Risk of human error
- Time-consuming for multiple patients

### Future (EzyVet Direct Integration)
1. Click "Import from EzyVet" button
2. Select patients from live EzyVet list
3. One-click import with real-time data
4. Auto-sync updates from EzyVet
5. Two-way sync (optional): Update EzyVet from VetHub

**Benefits:**
- ⚡ **Real-time data** - always current
- 🔄 **Auto-sync** - no manual updates
- 🎯 **Zero manual entry** - click and import
- 📈 **Bulk import** - entire ICU census at once
- 🔐 **Secure OAuth** - no password storage
- 💾 **Complete data** - all EzyVet fields available

## 🔧 Technical Implementation

### Phase 1: Authentication (Week 1)
**Setup EzyVet OAuth 2.0 Connection**

#### Backend API Routes
```typescript
// /api/ezyvet/auth
POST /api/ezyvet/connect
  - Store client credentials in database (encrypted)
  - Generate OAuth access token
  - Return connection status

GET /api/ezyvet/status
  - Check if EzyVet is connected
  - Verify token validity
  - Return clinic info

POST /api/ezyvet/disconnect
  - Revoke access token
  - Clear stored credentials
```

#### Environment Variables
```bash
EZYVET_CLIENT_ID="your-client-id"
EZYVET_CLIENT_SECRET="your-client-secret"
EZYVET_API_URL="https://api.ezyvet.com"
EZYVET_SANDBOX_URL="https://api.trial.ezyvet.com" # For testing
```

#### Database Schema Addition
```prisma
model EzyVetConnection {
  id               String   @id @default(cuid())
  clinicId         String   @unique
  clientId         String
  clientSecret     String   // Encrypted
  accessToken      String?  // Encrypted
  tokenExpiry      DateTime?
  refreshToken     String?  // Encrypted
  isActive         Boolean  @default(true)
  lastSyncedAt     DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### Phase 2: Patient Data Import (Week 2)
**Fetch and Import Patient Records**

#### API Endpoints Available from EzyVet
```typescript
GET /v1/animal?active=1&limit=100
  Returns:
  - id (EzyVet animal ID)
  - name
  - species_id
  - breed_id
  - sex
  - date_of_birth
  - weight
  - microchip
  - color_markings
  - contact_id (owner)
  - health_status

GET /v1/contact/{id}
  Returns owner info:
  - first_name, last_name
  - phone_number
  - email
  - address
```

#### VetHub Backend Route
```typescript
// /api/ezyvet/patients/import
POST /api/ezyvet/patients/import
  Body: {
    animalIds: [123, 456, 789], // Optional: specific patients
    importAll: boolean,          // Or import entire active list
    createRoundingSheet: boolean // Auto-create rounding data
  }

  Flow:
  1. Authenticate with EzyVet OAuth token
  2. Fetch patient data from /v1/animal
  3. Fetch owner data from /v1/contact
  4. Transform EzyVet schema → VetHub schema
  5. Create Patient records in VetHub database
  6. Optionally create empty rounding sheets
  7. Return import summary

  Response: {
    imported: 15,
    failed: 0,
    patients: [...], // Created patient IDs
    errors: []
  }
```

#### Data Mapping (EzyVet → VetHub)
```typescript
interface EzyVetToVetHubMapping {
  // Demographics
  'animal.name' → 'demographics.name'
  'animal.species_id' → 'demographics.species' (lookup table)
  'animal.breed_id' → 'demographics.breed' (lookup table)
  'animal.sex' → 'demographics.sex' (map: 1=Male, 2=Female, etc.)
  'animal.date_of_birth' → 'demographics.age' (calculate)
  'animal.weight' → 'demographics.weight'
  'animal.color_markings' → 'demographics.colorMarkings'
  'animal.microchip' → 'demographics.microchip'

  // Owner
  'contact.first_name + last_name' → 'demographics.ownerName'
  'contact.phone_number' → 'demographics.ownerPhone'
  'contact.email' → 'demographics.ownerEmail'

  // Medical
  'health_status' → 'status' (Active/Critical/Stable)
  'animal.id' → 'externalIds.ezyvetAnimalId' (for sync)
}
```

### Phase 3: Appointment Import (Week 2)
**Import Scheduled Appointments**

#### EzyVet Appointments API
```typescript
GET /v2/appointment?start_date=2025-01-18&end_date=2025-01-19&limit=200
  Returns:
  - id
  - animal_id
  - appointment_time
  - appointment_type_id (Neuro Consult, MRI, Surgery)
  - appointment_status_id (Scheduled, Arrived, In Progress)
  - description (chief complaint)
  - duration_minutes
```

#### VetHub Route
```typescript
POST /api/ezyvet/appointments/import
  Body: {
    startDate: "2025-01-18",
    endDate: "2025-01-19",
    appointmentTypes: ["Neuro Consult", "MRI"], // Filter
  }

  Flow:
  1. Fetch appointments from EzyVet
  2. Match animal_id to existing VetHub patients
  3. Create missing patients if needed
  4. Create Appointment records
  5. Auto-populate appointment details
```

### Phase 4: Medical Records Import (Week 3)
**Pull Consult Notes, Medications, Diagnostics**

#### Available Data from EzyVet
```typescript
// Consult Records
GET /v1/consult?animal_id={id}
  - Date, time, veterinarian
  - Chief complaint
  - Diagnosis
  - Treatment plan

// Medications
GET /v2/prescription?animal_id={id}
  - Medication name
  - Dose, route, frequency
  - Start date, end date
  - Instructions

// Physical Exams
GET /v1/physicalexam?animal_id={id}
  - Weight, temperature, heart rate
  - Physical exam findings
  - Body condition score

// Diagnostics
GET /v1/diagnosticresult?animal_id={id}
  - Lab results (CBC, Chemistry)
  - Imaging results
  - Test dates, values, reference ranges

// Assessments
GET /v1/assessment?consult_id={id}
  - SOAP notes
  - Progress notes
  - Treatment updates
```

#### Auto-Populate Rounding Sheets
```typescript
POST /api/ezyvet/sync-rounding-data
  Body: {
    patientId: 123, // VetHub patient ID
    animalId: 456,  // EzyVet animal ID
  }

  Flow:
  1. Fetch latest consult from EzyVet
  2. Fetch active prescriptions
  3. Fetch recent diagnostics
  4. Fetch physical exam data
  5. Transform to rounding sheet format:
     - signalment: from animal data
     - problems: from consult diagnosis
     - diagnosticFindings: from diagnosticresult
     - therapeutics: from prescriptions
     - fluids: from prescription (IV fluids)
     - concerns: from assessment notes
  6. Update patient's roundingData in VetHub
```

### Phase 5: Real-Time Sync (Week 4)
**Automatic Background Sync**

#### Sync Service
```typescript
// Background job runs every 15 minutes
async function syncEzyVetData() {
  const connections = await getActiveEzyVetConnections();

  for (const connection of connections) {
    try {
      // Sync patients
      const updatedPatients = await fetchEzyVetPatients(connection);
      await updateVetHubPatients(updatedPatients);

      // Sync appointments
      const todayAppointments = await fetchTodayAppointments(connection);
      await updateVetHubAppointments(todayAppointments);

      // Sync medications (for active patients)
      const activePrescriptions = await fetchActivePrescriptions(connection);
      await updateRoundingSheetMedications(activePrescriptions);

      // Update last synced timestamp
      await updateLastSyncedAt(connection.id);
    } catch (error) {
      console.error(`Sync failed for clinic ${connection.clinicId}:`, error);
      // Log error, notify user
    }
  }
}
```

#### Sync Indicators in UI
```typescript
// Show sync status on dashboard
<div className="sync-indicator">
  {lastSyncedAt && (
    <span className="text-sm text-slate-400">
      Last synced: {formatRelativeTime(lastSyncedAt)}
      {isSyncing && <Loader2 className="animate-spin ml-2" />}
    </span>
  )}
  <button onClick={handleManualSync}>
    <RefreshCcw size={16} /> Sync Now
  </button>
</div>
```

## 🎨 User Interface Design

### Settings Page: EzyVet Connection
```
┌─────────────────────────────────────────────────┐
│ ⚙️ Settings > Integrations                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔗 EzyVet Integration                          │
│                                                 │
│ Status: ● Connected                            │
│ Clinic: Animal Neurology & Imaging Center      │
│ Last Synced: 2 minutes ago                     │
│                                                 │
│ [🔄 Sync Now]  [⚙️ Configure]  [🔌 Disconnect] │
│                                                 │
│ Sync Settings:                                 │
│ ☑ Auto-sync every 15 minutes                   │
│ ☑ Sync patient demographics                    │
│ ☑ Sync appointments                            │
│ ☑ Sync medications → rounding sheets           │
│ ☑ Sync lab results → diagnostic findings       │
│                                                 │
│ [Save Settings]                                │
└─────────────────────────────────────────────────┘
```

### Dashboard: Import from EzyVet
```
┌─────────────────────────────────────────────────┐
│ 📋 Patient Dashboard                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ [+ Add Patient ▼]                              │
│   ├─ Add Manually                              │
│   ├─ Paste VetRadar Data                       │
│   └─ 🔗 Import from EzyVet                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Import Modal
```
┌──────────────────────────────────────────────────┐
│ Import from EzyVet                              │
├──────────────────────────────────────────────────┤
│                                                  │
│ Select patients to import:                      │
│                                                  │
│ 🔍 Search: [                    ]               │
│                                                  │
│ ☑ Select All (24 patients)                      │
│                                                  │
│ ☑ Max - Golden Retriever (5yo MN)               │
│   Last visit: Today at 9:00 AM                  │
│   Type: Neuro Consult                           │
│                                                  │
│ ☑ Bella - Dachshund (8yo FS)                    │
│   Last visit: Today at 10:30 AM                 │
│   Type: MRI + Surgery                           │
│                                                  │
│ ☐ Charlie - Labrador (3yo MN)                   │
│   Last visit: Yesterday                         │
│   Type: Follow-up                               │
│                                                  │
│ [... 21 more patients]                          │
│                                                  │
│ Options:                                        │
│ ☑ Create rounding sheets automatically          │
│ ☑ Import appointment details                    │
│ ☑ Import medications                            │
│                                                  │
│ [Cancel]              [Import Selected (2)]     │
└──────────────────────────────────────────────────┘
```

### Patient Page: EzyVet Sync Button
```
┌─────────────────────────────────────────────────┐
│ 🐕 Max (Golden Retriever)                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔗 EzyVet Animal ID: #12345                    │
│                                                 │
│ [🔄 Sync from EzyVet]                          │
│   ↳ Pull latest medications, labs, notes       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 📝 Data Flow Example

### Scenario: Morning Rounds Setup
**User workflow:**

1. **Open VetHub Dashboard**
   - See "Last synced: 5 minutes ago" indicator
   - Click "🔄 Sync Now" to get latest EzyVet data

2. **Click "Import from EzyVet"**
   - Modal opens showing today's ICU patients (auto-filtered)
   - See 8 patients currently in ICU
   - Select all 8 patients

3. **Import executes:**
   ```
   Importing 8 patients...
   ✓ Fetching patient demographics
   ✓ Fetching owner information
   ✓ Fetching active medications
   ✓ Fetching recent lab results
   ✓ Creating rounding sheets
   ✓ Populating clinical data

   Success! 8 patients imported in 3.2 seconds.
   ```

4. **Navigate to Rounding Sheets**
   - All 8 patients appear with pre-filled data:
     - Signalment: auto-populated
     - Problems: pulled from diagnosis
     - Therapeutics: all medications with doses
     - Diagnostic findings: abnormal labs auto-highlighted
     - Fluids: IV fluids from prescriptions
     - Code status: from health status

5. **User only fills:**
   - Location (cage number) - not in EzyVet
   - Concerns (clinical observations today)
   - Comments (today's plan)

**Time savings:**
- Before: 15-20 minutes manual entry per patient × 8 = **120-160 minutes**
- After: Click import + fill 3 fields × 8 = **10-15 minutes**
- **Saved: ~2 hours every morning!** ⏱️

## 🔐 Security & Compliance

### OAuth 2.0 Implementation
- Use Client Credentials flow (server-to-server)
- Store credentials encrypted in database (AES-256)
- Tokens expire after 1 hour (auto-refresh)
- No user passwords stored
- Revocable at any time

### Data Privacy
- Only fetch data for patients user has access to
- EzyVet permissions respected
- Audit log of all API calls
- HIPAA compliance considerations
- Data encrypted in transit (TLS 1.3)
- Data encrypted at rest (database level)

### Rate Limiting
- EzyVet limits: 60 requests/minute per endpoint
- VetHub batching: Group requests efficiently
- Retry logic with exponential backoff
- User notification if rate limit hit

## 💰 Cost Analysis

### Development Time
- **Phase 1 (Auth)**: 8-12 hours
- **Phase 2 (Patient Import)**: 16-20 hours
- **Phase 3 (Appointments)**: 8-12 hours
- **Phase 4 (Medical Records)**: 20-24 hours
- **Phase 5 (Sync Service)**: 12-16 hours
- **Testing & Refinement**: 16-20 hours

**Total: 80-104 hours (~2-3 weeks full-time)**

### API Costs
- EzyVet API access: **Free** (included with EzyVet subscription)
- VetHub server costs: +$20/month for background sync job

### ROI (Return on Investment)
**Time Savings:**
- 2 hours/day × 5 days/week = **10 hours/week saved**
- 10 hours/week × 50 weeks = **500 hours/year saved**
- At $100/hour veterinary rate = **$50,000/year value**

**Development cost:** ~$10,000 (100 hours @ $100/hr)
**Payback period:** ~1.5 months

## 🚀 Rollout Plan

### Beta Testing (Week 5)
1. Deploy to Railway staging environment
2. User tests with sandbox EzyVet account
3. Import 10-20 test patients
4. Validate data accuracy
5. Fix any mapping issues
6. Test sync functionality

### Production Launch (Week 6)
1. User connects real EzyVet account
2. Import 1-2 patients to verify
3. Bulk import entire ICU census
4. Enable auto-sync
5. Monitor sync logs for 1 week
6. Collect user feedback

### Future Enhancements
- **Two-way sync**: Update EzyVet from VetHub edits
- **Attachment sync**: Pull imaging, lab PDFs
- **Invoice integration**: Link charges to patients
- **Treatment sheets**: Auto-populate from prescriptions
- **Discharge notes**: Push back to EzyVet

## ✅ Success Criteria

1. ✅ Connect to EzyVet with OAuth (no errors)
2. ✅ Import 20+ patients in <10 seconds
3. ✅ 95%+ data mapping accuracy
4. ✅ Auto-sync runs every 15 minutes (0 failures)
5. ✅ User can bulk import ICU census in 3 clicks
6. ✅ Rounding sheets 80%+ pre-filled
7. ✅ Time savings: 2+ hours/day measured
8. ✅ Zero data loss or corruption
9. ✅ User satisfaction: 9/10 or higher

## 🎯 Next Steps

### Immediate Actions
1. ✅ **Research complete** - EzyVet API documented
2. ⬜ **User approval** - Review this plan, decide go/no-go
3. ⬜ **Get EzyVet credentials** - Request API Partner access
4. ⬜ **Set up sandbox** - Create test environment
5. ⬜ **Start Phase 1** - Build OAuth authentication

### Decision Point
**Should we proceed with EzyVet integration?**

**Pros:**
- Massive time savings (2+ hours/day)
- Real-time data (always current)
- Better clinical workflow
- Competitive advantage
- High ROI (~1.5 month payback)

**Cons:**
- 2-3 weeks development time
- Requires EzyVet API Partner approval
- Ongoing maintenance
- Dependency on EzyVet API stability

**Recommendation:** ✅ **Proceed** - The time savings and workflow improvements justify the development investment.

---

## 📞 EzyVet API Support
- **Documentation**: https://developers.ezyvet.com/docs/v1/
- **Support Email**: apisupport@ezyvet.com
- **Rate Limits**: 60 calls/min per endpoint, 180/min global
- **Sandbox**: https://api.trial.ezyvet.com
- **Production**: https://api.ezyvet.com

---

*This plan transforms VetHub from a manual data entry tool into a true clinical hub with live EzyVet integration. The result: 95% reduction in manual data entry, real-time patient information, and 2+ hours saved daily.*
