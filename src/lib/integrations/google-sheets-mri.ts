/**
 * Google Sheets MRI Sync
 *
 * Auto-syncs MRI patient data to Google Sheets with calculated drug doses
 */

import { google } from 'googleapis';

const sheets = google.sheets('v4');

// Sheet configuration
const SHEET_ID = process.env.GOOGLE_MRI_SHEET_ID;
const SHEET_NAME = 'Sheet2'; // MRI data goes to Sheet2

/**
 * Get authenticated Google Sheets client using service account
 *
 * MASTERMIND FIX: Use Base64-encoded JSON credentials to avoid newline hell.
 * Set GOOGLE_CREDENTIALS_BASE64 = base64(JSON.stringify(service-account.json))
 *
 * Fallback: Legacy individual env vars with newline replacement
 */
function getAuthClient() {
  // PREFERRED: Base64-encoded JSON credentials (avoids all newline issues)
  // Generate with: cat service-account.json | base64 | tr -d '\n'
  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

  if (credentialsBase64) {
    try {
      const credentials = JSON.parse(
        Buffer.from(credentialsBase64, 'base64').toString('utf-8')
      );
      console.log('[Google Sheets] Using Base64 credentials for:', credentials.client_email);

      return new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (error) {
      console.error('[Google Sheets] Failed to parse Base64 credentials:', error);
      throw new Error('Invalid GOOGLE_CREDENTIALS_BASE64 format');
    }
  }

  // FALLBACK: Legacy individual env vars
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error(
      'Google Sheets not configured. Set GOOGLE_CREDENTIALS_BASE64 (preferred) ' +
      'or GOOGLE_PRIVATE_KEY + GOOGLE_SERVICE_ACCOUNT_EMAIL'
    );
  }

  // Handle newline escapes from env vars
  privateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/\\\\n/g, '\n');

  console.log('[Google Sheets] Using legacy credentials for:', clientEmail);

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export interface MRIPatientData {
  name: string;
  patientId: string;
  weightKg: number;
  scanType: 'Brain' | 'C-Spine' | 'T-Spine' | 'LS' | string;
}

/**
 * Format patient data for Google Sheets row
 * Simple format for Sheet2: Name | CID# | kg | Scan
 */
function formatPatientRow(patient: MRIPatientData): (string | number)[] {
  return [
    patient.name,
    patient.patientId,
    patient.weightKg,  // Just the number, no formatting
    patient.scanType,
  ];
}

/**
 * Sync MRI patients to Google Sheets
 * Clears existing data and writes fresh data
 */
export async function syncMRIPatientsToSheet(patients: MRIPatientData[]): Promise<{
  success: boolean;
  rowsWritten: number;
  error?: string;
}> {
  if (!SHEET_ID) {
    return { success: false, rowsWritten: 0, error: 'Google Sheet ID not configured' };
  }

  if (patients.length === 0) {
    return { success: false, rowsWritten: 0, error: 'No patients to sync' };
  }

  try {
    const auth = getAuthClient();

    // Format all patient data (no headers - just data)
    const values = patients.map(formatPatientRow);

    // Clear existing content in the range (A1 to D100 - just 4 columns now)
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:D100`,
    });

    // Write new data
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    // No formatting - just clean data
    return { success: true, rowsWritten: values.length };
  } catch (error) {
    console.error('[Google Sheets] Sync error:', error);
    return {
      success: false,
      rowsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Append a single MRI patient to the sheet (doesn't clear existing)
 */
export async function appendMRIPatientToSheet(patient: MRIPatientData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!SHEET_ID) {
    return { success: false, error: 'Google Sheet ID not configured' };
  }

  try {
    const auth = getAuthClient();
    const row = formatPatientRow(patient);

    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[Google Sheets] Append error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Google Sheets integration is configured
 */
export function isGoogleSheetsConfigured(): boolean {
  const hasSheetId = !!process.env.GOOGLE_MRI_SHEET_ID;

  // Check for Base64 credentials (preferred) OR legacy individual vars
  const hasBase64Creds = !!process.env.GOOGLE_CREDENTIALS_BASE64;
  const hasLegacyCreds = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );

  return hasSheetId && (hasBase64Creds || hasLegacyCreds);
}
