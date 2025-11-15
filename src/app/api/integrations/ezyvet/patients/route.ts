import { NextResponse } from 'next/server';
import { EzyVetClient } from '@/lib/integrations/ezyvet-client';

/**
 * GET /api/integrations/ezyvet/patients
 *
 * Fetch active patients from EzyVet
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const active = searchParams.get('active');
    const offset = searchParams.get('offset');

    const client = new EzyVetClient();

    const patients = await client.getPatients({
      limit: limit ? parseInt(limit) : 50,
      active: active !== 'false',
      offset: offset ? parseInt(offset) : 0,
    });

    return NextResponse.json({
      success: true,
      data: patients,
      count: patients.length,
    });
  } catch (error) {
    console.error('EzyVet integration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
