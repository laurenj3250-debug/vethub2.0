import { NextRequest, NextResponse } from 'next/server';
import { syncMRIPatientsToSheet, isGoogleSheetsConfigured, MRIPatientData } from '@/lib/integrations/google-sheets-mri';

/**
 * POST /api/mri/sync-sheets
 * Sync MRI patients to Google Sheets
 */
export async function POST(request: NextRequest) {
  try {
    // Check if configured
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: 'Google Sheets integration not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const patients: MRIPatientData[] = body.patients;

    if (!patients || !Array.isArray(patients)) {
      return NextResponse.json(
        { error: 'Invalid request: patients array required' },
        { status: 400 }
      );
    }

    const result = await syncMRIPatientsToSheet(patients);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Synced ${result.rowsWritten} patients to Google Sheets`,
        rowsWritten: result.rowsWritten,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] MRI sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync to Google Sheets' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mri/sync-sheets
 * Check if Google Sheets integration is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isGoogleSheetsConfigured(),
    sheetId: process.env.GOOGLE_MRI_SHEET_ID ? '***configured***' : null,
  });
}
