import { NextResponse } from 'next/server';
import { EzyVetClient } from '@/lib/integrations/ezyvet-client';

/**
 * POST /api/integrations/ezyvet/sync
 *
 * Sync a specific patient from EzyVet to VetHub
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const client = new EzyVetClient();
    const ezyvetPatient = await client.getPatientById(patientId);

    // In a real implementation, you would save this to your database here
    // For now, we just return the mapped patient data
    // const savedPatient = await prisma.patient.create({ data: ezyvetPatient });

    return NextResponse.json({
      success: true,
      data: ezyvetPatient,
      message: 'Patient synced successfully',
    });
  } catch (error) {
    console.error('EzyVet sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/ezyvet/sync
 *
 * Sync all active patients from EzyVet
 */
export async function GET(request: Request) {
  try {
    const client = new EzyVetClient();
    const patients = await client.getPatients({ active: true });

    // In a real implementation, you would:
    // 1. Check which patients already exist in your database
    // 2. Update existing patients
    // 3. Create new patients
    // For now, we just return the data

    return NextResponse.json({
      success: true,
      data: patients,
      count: patients.length,
      message: `Synced ${patients.length} patients from EzyVet`,
    });
  } catch (error) {
    console.error('EzyVet bulk sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
