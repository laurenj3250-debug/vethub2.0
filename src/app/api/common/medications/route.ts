import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/common/medications
 * Fetch all common medications for auto-complete
 */
export async function GET() {
  try {
    const medications = await prisma.commonMedication.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(medications);
  } catch (error) {
    console.error('[API] Error fetching common medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch common medications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/common/medications
 * Create a new common medication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Medication name is required' },
        { status: 400 }
      );
    }

    const medication = await prisma.commonMedication.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(medication, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating common medication:', error);

    // Handle unique constraint violation
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Medication already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create common medication' },
      { status: 500 }
    );
  }
}
