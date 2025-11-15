import { NextResponse } from 'next/server';
import { VetRadarScraper } from '@/lib/integrations/vetradar-scraper';

/**
 * GET /api/integrations/vetradar/patients
 *
 * Fetch active patients from VetRadar
 */
export async function GET(request: Request) {
  try {
    const username = process.env.VETRADAR_USERNAME;
    const password = process.env.VETRADAR_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'VetRadar credentials not configured. Set VETRADAR_USERNAME and VETRADAR_PASSWORD in .env.local',
        },
        { status: 500 }
      );
    }

    const scraper = new VetRadarScraper();
    const session = await scraper.login(username, password);

    try {
      const patients = await scraper.getActivePatients(session);

      return NextResponse.json({
        success: true,
        data: patients,
        count: patients.length,
      });
    } finally {
      await scraper.closeSession(session);
    }
  } catch (error) {
    console.error('VetRadar integration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
