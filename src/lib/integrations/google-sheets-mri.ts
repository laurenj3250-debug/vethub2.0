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
 * MASTERMIND FIX: Railway/Vercel store private keys with escaped newlines.
 * We need to handle multiple escape scenarios:
 * - \\n (literal backslash-n) → actual newline
 * - Literal \n string (already a newline, no change needed)
 * - JSON-encoded keys (double-escaped)
 */
function getAuthClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Google service account credentials not configured');
  }

  // Handle multiple escape scenarios from env vars
  // 1. Replace literal \\n with actual newlines (most common)
  privateKey = privateKey.replace(/\\n/g, '\n');

  // 2. If still no newlines and key looks Base64-ish, try JSON parse
  if (!privateKey.includes('\n') && !privateKey.includes('-----BEGIN')) {
    try {
      // Maybe it's JSON-stringified
      privateKey = JSON.parse(`"${privateKey}"`);
    } catch {
      // Not JSON, try one more replacement for double-escaped
      privateKey = privateKey.replace(/\\\\n/g, '\n');
    }
  }

  // Debug: Log key format (first/last 20 chars only for security)
  const keyPreview = privateKey.length > 40
    ? `${privateKey.slice(0, 20)}...${privateKey.slice(-20)}`
    : '[key too short]';
  console.log('[Google Sheets] Key format check:', {
    hasBeginMarker: privateKey.includes('-----BEGIN'),
    hasNewlines: privateKey.includes('\n'),
    keyPreview,
  });

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

export interface MRIPatientData {
  name: string;
  patientId: string;
  weightKg: number;
  scanType: 'Brain' | 'C-Spine' | 'T-Spine' | 'LS' | string;
}

/**
 * Format patient data for Google Sheets row
 * Matches the MRI anesthesia sheet format:
 * Name | CID# | kg | lb | Scan | Opioid | mg | mL | Valium mg | mL | Contrast mL
 */
function formatPatientRow(patient: MRIPatientData): (string | number)[] {
  const weightLbs = patient.weightKg * 2.20462;
  const doses = calculateMRIDosesFromWeight(String(patient.weightKg), patient.scanType as any);

  if (!doses) {
    return [
      patient.name,
      patient.patientId,
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
      'Name', 'CID#', 'kg', 'lb', 'Scan',
      'Pre-med', 'mg', 'mL',
      'Valium mg', 'mL', 'Contrast mL'
    ];

    // Format all patient data
    const rows = patients.map(formatPatientRow);

    // Combine headers and data
    const values = [headers, ...rows];

    // Clear existing content in the range (A1 to K100 should cover most cases)
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:K100`,
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
    await sheets.spreadsheets.batchUpdate({
      auth,
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.918, green: 0.863, blue: 0.957 }, // Light purple
                  textFormat: { bold: true },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

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
  return !!(
    process.env.GOOGLE_MRI_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}
