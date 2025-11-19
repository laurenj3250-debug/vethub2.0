import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/neuro-exams/[id]
 * Fetch a single neuro exam by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const neuroExam = await prisma.neuroExam.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
      },
    });

    if (!neuroExam) {
      return NextResponse.json(
        { error: 'Neuro exam not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: neuroExam.id,
      patientId: neuroExam.patientId,
      patientName: neuroExam.patient ? (neuroExam.patient.demographics as any)?.name : undefined,
      sections: neuroExam.sections,
      createdAt: neuroExam.createdAt,
      updatedAt: neuroExam.updatedAt,
      createdBy: neuroExam.createdBy,
    });
  } catch (error) {
    console.error('[API] Error fetching neuro exam:', error);
    return NextResponse.json(
      { error: 'Failed to fetch neuro exam' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/neuro-exams/[id]
 * Update a neuro exam
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const neuroExam = await prisma.neuroExam.update({
      where: { id },
      data: {
        sections: body.sections,
        patientId: body.patientId !== undefined ? body.patientId : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: neuroExam.id,
      patientId: neuroExam.patientId,
      patientName: neuroExam.patient ? (neuroExam.patient.demographics as any)?.name : undefined,
      sections: neuroExam.sections,
      createdAt: neuroExam.createdAt,
      updatedAt: neuroExam.updatedAt,
      createdBy: neuroExam.createdBy,
    });
  } catch (error) {
    console.error('[API] Error updating neuro exam:', error);
    return NextResponse.json(
      { error: 'Failed to update neuro exam' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/neuro-exams/[id]
 * Delete a neuro exam
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.neuroExam.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting neuro exam:', error);
    return NextResponse.json(
      { error: 'Failed to delete neuro exam' },
      { status: 500 }
    );
  }
}
