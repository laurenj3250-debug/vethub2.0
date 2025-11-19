import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/neuro-exams
 * Fetch all neuro exams with optional patientId filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');

    const neuroExams = await prisma.neuroExam.findMany({
      where: patientId ? { patientId: parseInt(patientId) } : undefined,
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform Prisma result
    const transformedExams = neuroExams.map((exam) => ({
      id: exam.id,
      patientId: exam.patientId,
      patientName: exam.patient ? (exam.patient.demographics as any)?.name : undefined,
      sections: exam.sections,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      createdBy: exam.createdBy || undefined,
    }));

    return NextResponse.json(transformedExams);
  } catch (error) {
    console.error('[API] Error fetching neuro exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch neuro exams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/neuro-exams
 * Create a new neuro exam
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const neuroExam = await prisma.neuroExam.create({
      data: {
        patientId: body.patientId || null,
        sections: body.sections || {},
        createdBy: body.createdBy || null,
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

    return NextResponse.json(
      {
        id: neuroExam.id,
        patientId: neuroExam.patientId,
        patientName: neuroExam.patient ? (neuroExam.patient.demographics as any)?.name : undefined,
        sections: neuroExam.sections,
        createdAt: neuroExam.createdAt,
        updatedAt: neuroExam.updatedAt,
        createdBy: neuroExam.createdBy,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating neuro exam:', error);
    return NextResponse.json(
      { error: 'Failed to create neuro exam' },
      { status: 500 }
    );
  }
}
