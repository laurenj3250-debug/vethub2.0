/**
 * Google Sheets MRI Sync
 *
 * Auto-syncs MRI patient data to Google Sheets with calculated drug doses
 */

import { google } from 'googleapis';
import { calculateMRIDosesFromWeight } from '@/lib/mri-calculator';

const sheets = google.sheets('v4');

// Sheet configuration
const SHEET_ID = process.env.GOOGLE_MRI_SHEET_ID;
const SHEET_NAME = 'Sheet1'; // Default sheet name, can be configured

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
  signalment?: string;  // e.g., "8y MN Lab"
  weightKg: number;
  scanType: 'Brain' | 'C-Spine' | 'T-Spine' | 'LS' | string;
}

/**
 * Format patient data for Google Sheets row
 * Matches the MRI anesthesia sheet format:
 * Name | CID# | Signalment | kg | lb | Scan | Opioid | mg | mL | Valium mg | mL | Contrast mL
 */
function formatPatientRow(patient: MRIPatientData): (string | number)[] {
  const weightLbs = patient.weightKg * 2.20462;
  const doses = calculateMRIDosesFromWeight(String(patient.weightKg), patient.scanType as any);

  if (!doses) {
    return [
      patient.name,
      patient.patientId,
      patient.signalment || '',
      patient.weightKg.toFixed(1),
      weightLbs.toFixed(2),
      patient.scanType,
      'N/A', // opioid name
      'N/A', // opioid mg
      'N/A', // opioid mL
      'N/A', // valium mg
      'N/A', // valium mL
      'N/A', // contrast mL
    ];
  }

  return [
    patient.name,
    patient.patientId,
    patient.signalment || '',
    patient.weightKg.toFixed(1),
    weightLbs.toFixed(2),
    patient.scanType,
    doses.opioid.name,
    doses.opioid.doseMg.toFixed(2),
    doses.opioid.volumeMl.toFixed(2),
    doses.valium.doseMg.toFixed(2),
    doses.valium.volumeMl.toFixed(1),
    doses.contrast.volumeMl.toFixed(1),
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

    // Header row
    const headers = [
      'Name', 'CID#', 'Signalment', 'kg', 'lb', 'Scan',
      'Pre-med', 'mg', 'mL',
      'Valium mg', 'mL', 'Contrast mL'
    ];

    // Format all patient data
    const rows = patients.map(formatPatientRow);

    // Combine headers and data
    const values = [headers, ...rows];

    // Clear existing content in the range (A1 to L100 should cover most cases)
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:L100`,
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

    // Optional: Format header row (bold, background color)
    // Wrapped in try-catch - formatting is nice-to-have, data sync is critical
    try {
      // Get actual sheet ID (don't assume 0)
      const spreadsheet = await sheets.spreadsheets.get({
        auth,
        spreadsheetId: SHEET_ID,
        fields: 'sheets.properties',
      });
      const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0;

      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.918, green: 0.863, blue: 0.957 },
                    textFormat: { bold: true },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      });
    } catch (formatError) {
      console.warn('[Google Sheets] Header formatting failed (non-critical):', formatError);
    }

    return { success: true, rowsWritten: rows.length };
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
