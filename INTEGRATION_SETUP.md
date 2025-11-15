# VetHub External Integrations Setup Guide

## Overview

VetHub 2.0 can connect to your existing veterinary practice management systems to import patient data and treatment sheets automatically. This eliminates manual data entry and keeps VetHub synchronized with your hospital's systems.

**Supported Integrations:**
- ✅ **EzyVet** - Cloud-based practice management system (API integration)
- ✅ **VetRadar** - Anesthesia and treatment monitoring (web scraping)

---

## Quick Start

### 1. Create Environment File

Copy the example environment file:
```bash
cp .env.example .env.local
```

### 2. Add Your Credentials

Edit `.env.local` and add your credentials:

```bash
# EzyVet Integration
EZYVET_API_KEY=your_api_key_here
EZYVET_PARTNER_ID=your_partner_id_here
EZYVET_BASE_URL=https://api.trial.ezyvet.com/v2

# VetRadar Integration
VETRADAR_USERNAME=your_username_here
VETRADAR_PASSWORD=your_password_here
VETRADAR_BASE_URL=https://vetradar.com
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Access Integrations Page

Navigate to: **http://localhost:3000/integrations**

---

## EzyVet Integration

### Getting API Credentials

1. **Log in to EzyVet**
   - Go to https://ezyvet.com and sign in to your account

2. **Navigate to API Settings**
   - Click **Settings** (gear icon)
   - Select **API Access** or **Integrations**

3. **Generate API Key**
   - Click **Create New API Key** or **Generate Key**
   - Copy the **API Key** (long alphanumeric string)
   - Note your **Partner ID** (usually a number or short code)

4. **Add to .env.local**
   ```bash
   EZYVET_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   EZYVET_PARTNER_ID=12345
   ```

### Testing Connection

1. Go to http://localhost:3000/integrations
2. Click **Test Connection** under EzyVet
3. You should see a green checkmark if successful

### Syncing Patients

Click **Sync Patients from EzyVet** to import all active patients.

**Data Imported:**
- Patient name, species, breed
- Age, sex, weight
- Owner contact information
- Active medications
- Allergies and chronic conditions
- Current presenting problems

---

## VetRadar Integration

### Adding Login Credentials

1. **Get Your Credentials**
   - Use your normal VetRadar login username and password

2. **Add to .env.local**
   ```bash
   VETRADAR_USERNAME=your_username@clinic.com
   VETRADAR_PASSWORD=your_secure_password
   ```

### How VetRadar Sync Works

VetRadar doesn't have a public API, so we use **automated web scraping** with Playwright:

1. Logs in to VetRadar with your credentials
2. Navigates to the active patients page
3. Extracts patient information and treatment sheets
4. Closes the browser session

**Important:**
- First sync may be slow (browser needs to load)
- Requires stable internet connection
- Updates VetRadar CSS may break scraping (we'll fix if needed)

### Syncing Treatment Sheets

Click **Sync from VetRadar** to fetch:
- Active hospitalized patients
- Current medications and fluids
- Vital signs and monitoring data
- Nursing notes and concerns

---

## API Routes Reference

### EzyVet Endpoints

#### Test Connection
```
GET /api/integrations/ezyvet/test
```

Response:
```json
{
  "success": true,
  "message": "Connection successful",
  "timestamp": "2025-11-14T12:00:00.000Z"
}
```

#### Get All Patients
```
GET /api/integrations/ezyvet/patients?limit=50&active=true
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "ezyvet-12345",
      "name": "Buddy",
      "demographics": {
        "species": "Canine",
        "breed": "Golden Retriever",
        "age": "5yo",
        "sex": "Male Neutered",
        "weight": 30,
        "weightUnit": "kg"
      },
      "medicalHistory": {
        "allergies": ["Penicillin"],
        "currentMedications": ["Phenobarbital 2mg/kg PO q12h"]
      }
    }
  ],
  "count": 1
}
```

#### Sync Single Patient
```
POST /api/integrations/ezyvet/sync
Content-Type: application/json

{
  "patientId": "12345"
}
```

### VetRadar Endpoints

#### Get Active Patients
```
GET /api/integrations/vetradar/patients
```

#### Get Treatment Sheet
```
POST /api/integrations/vetradar/treatment
Content-Type: application/json

{
  "patientId": "67890"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "treatmentSheet": {
      "patientName": "Max",
      "medications": [
        {
          "medication": "Fentanyl CRI",
          "dose": "5mcg/kg/hr",
          "route": "IV",
          "frequency": "Continuous"
        }
      ],
      "fluids": [
        {
          "type": "LRS",
          "rate": "60",
          "units": "mL/hr"
        }
      ]
    },
    "roundingData": {
      "signalment": "Canine, 8yo, MN, 25kg",
      "location": "ICU 3",
      "therapeutics": "Fentanyl CRI 5mcg/kg/hr IV Continuous",
      "fluids": "LRS at 60 mL/hr"
    }
  }
}
```

---

## Data Mapping

### EzyVet → VetHub Patient

| EzyVet Field | VetHub Field |
|--------------|--------------|
| `animal.name` | `patient.name` |
| `animal.species_name` | `demographics.species` |
| `animal.breed_name` | `demographics.breed` |
| `animal.date_of_birth` | `demographics.age` (calculated) |
| `animal.sex.name` | `demographics.sex` |
| `animal.weight` | `demographics.weight` |
| `contacts[0]` | `demographics.owner` |
| `allergies` | `medicalHistory.allergies` |
| `active_prescriptions` | `medicalHistory.currentMedications` |

### VetRadar → VetHub Rounding Data

| VetRadar Field | VetHub Rounding Field |
|----------------|------------------------|
| Treatment medications | `therapeutics` |
| Fluid orders | `fluids` |
| Nursing notes | `concerns` |
| Cage/ward location | `location` |
| Patient demographics | `signalment` |

---

## Troubleshooting

### EzyVet Connection Failed

**Problem:** `Connection failed: 401 Unauthorized`

**Solution:**
1. Verify your API key is correct in `.env.local`
2. Check that Partner ID is correct
3. Ensure API key hasn't expired (regenerate if needed)
4. Confirm your EzyVet account has API access enabled

**Problem:** `Connection failed: 403 Forbidden`

**Solution:**
- Your API key may not have permission to access patient data
- Contact EzyVet support to enable full API access

### VetRadar Login Failed

**Problem:** `VetRadar login failed - could not verify successful authentication`

**Solution:**
1. Double-check username and password in `.env.local`
2. Try logging in manually at https://vetradar.com
3. Check if VetRadar is currently down
4. Ensure no 2FA is enabled (scraper can't handle 2FA)

**Problem:** `Failed to fetch active patients`

**Solution:**
- VetRadar may have updated their UI
- Check browser console for detailed errors
- Contact VetHub support for scraper updates

### Environment Variables Not Loading

**Problem:** Integration shows "credentials not configured"

**Solution:**
1. Ensure `.env.local` file exists in project root
2. Restart development server (`npm run dev`)
3. Check for typos in environment variable names
4. Make sure `.env.local` is NOT in `.gitignore` locally (it should be, but you need to create it)

---

## Security Best Practices

### Credential Storage

✅ **DO:**
- Store credentials in `.env.local` (never committed to git)
- Use environment-specific files (`.env.production` for production)
- Rotate API keys periodically

❌ **DON'T:**
- Commit `.env.local` to version control
- Share API keys in Slack/email
- Use production credentials in development

### Production Deployment

When deploying to Railway/Vercel:

1. Add environment variables in platform dashboard
2. Never expose credentials in client-side code
3. Use Railway's secret management
4. Enable HTTPS for all API calls

---

## Advanced Usage

### Custom Data Transformations

Edit `src/lib/integrations/ezyvet-client.ts` to customize how patient data is mapped:

```typescript
private mapEzyVetPatient(ezyvetData: EzyVetPatient): UnifiedPatient {
  return {
    id: `ezyvet-${ezyvetData.id}`,
    name: ezyvetData.name,
    // Add custom field mappings here
    customField: ezyvetData.someEzyVetField,
  };
}
```

### Scheduled Sync

To sync automatically every 5 minutes:

```typescript
// In your main page component
useEffect(() => {
  const interval = setInterval(async () => {
    await fetch('/api/integrations/ezyvet/sync');
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, []);
```

### Webhook Integration (EzyVet)

If EzyVet supports webhooks, create endpoint:

```typescript
// src/app/api/webhooks/ezyvet/route.ts
export async function POST(request: Request) {
  const event = await request.json();

  switch (event.type) {
    case 'animal.created':
      await handleNewPatient(event.data);
      break;
    case 'animal.updated':
      await handlePatientUpdate(event.data);
      break;
  }

  return NextResponse.json({ success: true });
}
```

---

## Support

### Getting Help

1. **Check Logs**
   ```bash
   # Development logs
   npm run dev
   # Look for errors in terminal
   ```

2. **Browser Console**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

3. **Test Endpoints Directly**
   ```bash
   # Test EzyVet connection
   curl http://localhost:3000/api/integrations/ezyvet/test

   # Test patient fetch
   curl http://localhost:3000/api/integrations/ezyvet/patients
   ```

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `credentials not configured` | Missing .env.local | Create .env.local with credentials |
| `401 Unauthorized` | Invalid API key | Check EZYVET_API_KEY |
| `403 Forbidden` | No API access | Enable API in EzyVet settings |
| `Network error` | Can't reach EzyVet | Check internet connection |
| `Login failed` | VetRadar credentials wrong | Verify VETRADAR_USERNAME/PASSWORD |

---

## Next Steps

1. **Test the Integration**
   - Go to http://localhost:3000/integrations
   - Click "Test Connection" for EzyVet
   - Try syncing a few patients

2. **Verify Data Accuracy**
   - Compare imported data with EzyVet
   - Check that all fields mapped correctly
   - Report any mapping issues

3. **Customize Workflow**
   - Add automatic sync to your dashboard
   - Create buttons on patient pages to "Refresh from EzyVet"
   - Set up scheduled syncs if needed

4. **Document Your Setup**
   - Note any custom configurations
   - Share with your team
   - Update this guide if you find better approaches

---

**Questions?** Check the main VetHub documentation or contact support.

**Last Updated:** November 14, 2025
