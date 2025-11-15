import { NextResponse } from 'next/server';
import { VetRadarScraper } from '@/lib/integrations/vetradar-scraper';

/**
 * POST /api/integrations/vetradar/treatment
 *
 * Fetch treatment sheet for a specific patient from VetRadar
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

    const username = process.env.VETRADAR_USERNAME;
    const password = process.env.VETRADAR_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'VetRadar credentials not configured',
        },
        { status: 500 }
      );
    }

    const scraper = new VetRadarScraper();
    const session = await scraper.login(username, password);

    try {
      const treatmentSheet = await scraper.getPatientTreatmentSheet(patientId, session);
      const roundingData = scraper.parseToRoundingData(treatmentSheet);

      return NextResponse.json({
        success: true,
        data: {
          treatmentSheet,
          roundingData,
        },
      });
    } finally {
      await scraper.closeSession(session);
    }
  } catch (error) {
    console.error('VetRadar treatment fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
