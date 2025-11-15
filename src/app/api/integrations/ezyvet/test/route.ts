import { NextResponse } from 'next/server';
import { EzyVetClient } from '@/lib/integrations/ezyvet-client';

/**
 * GET /api/integrations/ezyvet/test
 *
 * Test EzyVet API connection
 */
export async function GET() {
  try {
    const client = new EzyVetClient();
    const result = await client.testConnection();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
