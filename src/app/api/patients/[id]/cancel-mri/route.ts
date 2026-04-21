import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDateET } from '@/lib/timezone';

/**
 * POST /api/patients/[id]/cancel-mri
 *
 * Explicitly cancel a scheduled MRI for an MRI-type patient. Decrements the
 * mriCount and totalCases on the DailyEntry for the MRI date (admission + 1 day ET),
 * and marks the patient with audit fields. Idempotent: calling twice is a no-op.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, type: true, createdAt: true, mriCancelled: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (patient.type !== 'MRI') {
      return NextResponse.json(
        { error: 'Patient is not an MRI patient' },
        { status: 400 }
      );
    }

    if (patient.mriCancelled) {
      return NextResponse.json({ success: true, alreadyCancelled: true });
    }

    // Same mriDate formula as POST /api/patients (admit date ET + 1 day)
    const admitDateET = formatDateET(patient.createdAt);
    const nextDay = new Date(admitDateET + 'T12:00:00Z');
    nextDay.setDate(nextDay.getDate() + 1);
    const mriDate = nextDay.toISOString().split('T')[0];

    await prisma.$transaction([
      prisma.dailyEntry.updateMany({
        where: { date: mriDate, mriCount: { gt: 0 } },
        data: {
          mriCount: { decrement: 1 },
          totalCases: { decrement: 1 },
        },
      }),
      prisma.patient.update({
        where: { id: patientId },
        data: {
          mriCancelled: true,
          mriCancelledAt: new Date(),
        },
      }),
    ]);

    console.log(`[API] Cancelled MRI for patient ${patientId} on ${mriDate}`);

    return NextResponse.json({ success: true, mriDate });
  } catch (error) {
    console.error('[API] Error cancelling MRI:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel MRI',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
