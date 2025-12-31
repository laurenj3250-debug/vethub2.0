import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reference/medications
 * Fetch all reference medications
 */
export async function GET() {
  try {
    const medications = await prisma.referenceMedication.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(medications);
  } catch (error) {
    console.error('[API] Error fetching reference medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reference medications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reference/medications
 * Create a new reference medication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.dose) {
      return NextResponse.json(
        { error: 'Missing required fields: name, dose' },
        { status: 400 }
      );
    }

    // Get max sortOrder for new item
    const maxSort = await prisma.referenceMedication.aggregate({
      _max: { sortOrder: true },
    });

    const medication = await prisma.referenceMedication.create({
      data: {
        name: body.name,
        dose: body.dose,
        notes: body.notes || null,
        isDefault: body.isDefault ?? false,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(medication, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating reference medication:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A medication with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reference medication' },
      { status: 500 }
    );
  }
}
