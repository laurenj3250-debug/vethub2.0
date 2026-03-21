import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// GET - Fetch surgery-type patients that don't have a Surgery record logged yet
// Used to show "pending surgery" drafts in the residency tracker
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // Get all active surgery patients
    const surgeryPatients = await prisma.patient.findMany({
      where: {
        type: 'Surgery',
        status: { notIn: ['Discharged', 'Discharging'] },
      },
      select: {
        id: true,
        demographics: true,
        createdAt: true,
      },
    });

    if (surgeryPatients.length === 0) {
      return NextResponse.json([]);
    }

    // Find which of these patients already have a Surgery record (any date)
    const patientIds = surgeryPatients.map((p) => p.id);
    const existingSurgeries = await prisma.surgery.findMany({
      where: {
        patientId: { in: patientIds },
      },
      select: {
        patientId: true,
      },
    });

    const loggedPatientIds = new Set(
      existingSurgeries.map((s) => s.patientId).filter(Boolean)
    );

    // Return patients that haven't been logged yet
    const pending = surgeryPatients
      .filter((p) => !loggedPatientIds.has(p.id))
      .map((p) => {
        const demographics = p.demographics as {
          name?: string;
          species?: string;
          breed?: string;
          patientId?: string;
        } | null;

        return {
          patientId: p.id,
          patientName: demographics?.name || 'Unknown',
          species: demographics?.species,
          breed: demographics?.breed,
          admittedAt: p.createdAt,
        };
      });

    return NextResponse.json(pending);
  } catch (error) {
    console.error('Error fetching pending surgeries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending surgeries' },
      { status: 500 }
    );
  }
}
