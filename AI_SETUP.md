# AI Parsing Setup Guide

VetHub now supports AI-powered parsing for both appointments and patient rounding sheets using Claude 3.5 Sonnet from Anthropic.

## Quick Setup

### 1. Get Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure Environment

1. Open the `.env.local` file in the project root
2. Add your API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here
   ```
3. Restart your development server

## Features

### Appointments Page (`/appointments`)

The AI parser can extract:
- Patient name and signalment
- Presenting problem
- Last recheck date and plan
- MRI information (date and findings)
- Bloodwork due dates
- Current medications with doses
- Owner concerns and clinical signs

**How to use:**
1. Check the "🤖 Use AI Parsing" checkbox
2. Paste patient history into the text area
3. Click "Add to List"

### Patient Rounding Sheet (Main Page)

The AI parser can extract comprehensive rounding data:
- **Patient Info**: Species, breed, sex, age, weight, owner details, patient/client IDs
- **Signalment**: Brief description for rounding
- **Problem List**: Main diagnoses and concerns
- **Subjective Assessment**: Patient status and observations
- **Objective Findings**: Physical exam findings and vitals
- **Diagnostic Findings**: Lab results, imaging findings, abnormal values
- **Therapeutics**: Current medications with doses and frequencies
- **Plan**: Treatment plan and next steps

**How to use:**
1. Expand a patient's "Rounding Sheet" section
2. Check the "🤖 Use AI Parsing" checkbox
3. Paste patient details into the "Quick Import" text area
4. Click "Extract with AI (All Fields)"

## Fallback Behavior

If AI parsing fails (e.g., no API key, network error, API quota exceeded), the system will automatically fall back to the local regex-based parser. The local parser is faster and doesn't require an API key, but it's less comprehensive.

## Cost Considerations

- Each API call to Claude costs approximately $0.003-0.015 depending on the length of the input
- The AI parser is optional and can be toggled on/off at any time
- For basic extractions (signalment, weight, IDs), the local parser is sufficient and free

## API Endpoints

### `/api/parse-appointment`
- Parses appointment-specific information
- Returns: name, signalment, problem, lastRecheck, lastPlan, mriDate, mriFindings, bloodworkDue, medications, otherConcerns

### `/api/parse-rounding`
- Parses comprehensive patient rounding data
- Returns: patientInfo, roundingData, medications array, raw bloodwork

## Troubleshooting

### "AI service not configured" error
- Make sure `ANTHROPIC_API_KEY` is set in `.env.local`
- Restart your development server after adding the key

### "AI parsing failed" error
- Check your API key is valid
- Check you have remaining API credits
- Check your internet connection
- The system will automatically fall back to local parsing

### No data extracted
- Ensure the pasted text contains the relevant information
- Try using the local parser to see if it's a data format issue
- The AI works best with structured clinical notes from veterinary practice management systems

## Development

To modify AI parsing behavior:
- Edit prompts in `/src/app/api/parse-appointment/route.ts` for appointments
- Edit prompts in `/src/app/api/parse-rounding/route.ts` for rounding sheets
- Both use Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
