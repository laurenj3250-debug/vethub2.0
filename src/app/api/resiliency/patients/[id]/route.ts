import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/resiliency/patients/[id]
 * Fetch all resiliency entries for a specific patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const entries = await prisma.resiliencyEntry.findMany({
      where: {
        patientId: patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('[API] Error fetching resiliency entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resiliency entries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resiliency/patients/[id]
 * Create a new resiliency entry for a specific patient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.entryText || typeof body.entryText !== 'string') {
      return NextResponse.json(
        { error: 'Entry text is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const entry = await prisma.resiliencyEntry.create({
      data: {
        entryText: body.entryText.trim(),
        category: body.category || undefined,
        createdBy: body.createdBy || undefined,
        patientId: patientId,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating resiliency entry:', error);
    return NextResponse.json(
      { error: 'Failed to create resiliency entry' },
      { status: 500 }
    );
  }
}
