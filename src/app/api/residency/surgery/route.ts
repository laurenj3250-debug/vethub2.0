import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const surgerySchema = z.object({
  dailyEntryId: z.string(),
  procedureName: z.string().min(1, 'Procedure name is required'),
  participation: z.enum(['S', 'O', 'C', 'D', 'K']),
  patientName: z.string().optional(),
  patientId: z.number().optional(), // Link to VetHub patient
  notes: z.string().optional(),
});

// GET - Fetch surgeries (optionally filtered)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dailyEntryId = searchParams.get('dailyEntryId');
    const participation = searchParams.get('participation');

    const where: { dailyEntryId?: string; participation?: string } = {};
    if (dailyEntryId) where.dailyEntryId = dailyEntryId;
    if (participation) where.participation = participation;

    const surgeries = await prisma.surgery.findMany({
      where,
      include: {
        dailyEntry: true,
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(surgeries);
  } catch (error) {
    console.error('Error fetching surgeries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surgeries' },
      { status: 500 }
    );
  }
}

// Helper: Calculate residency year based on program start date
async function getResidencyYear(): Promise<number> {
  const profile = await prisma.aCVIMProfile.findFirst();
  if (!profile?.programStartDate) return 1;

  const start = new Date(profile.programStartDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 +
                     (now.getMonth() - start.getMonth());

  if (monthsDiff < 12) return 1;
  if (monthsDiff < 24) return 2;
  return 3;
}

// Helper: Map participation level to ACVIM role
function mapParticipationToRole(participation: string): 'Primary' | 'Assistant' {
  return participation === 'S' ? 'Primary' : 'Assistant';
}

// POST - Create new surgery (also creates ACVIM case log entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = surgerySchema.parse(body);
    const skipAcvim = body.skipAcvim === true; // Allow opting out

    // Get the daily entry to get the date
    const dailyEntry = await prisma.dailyEntry.findUnique({
      where: { id: validated.dailyEntryId },
    });

    if (!dailyEntry) {
      return NextResponse.json(
        { error: 'Daily entry not found' },
        { status: 404 }
      );
    }

    // Look up patient if patientId provided (for name and caseIdNumber)
    let patientName = validated.patientName;
    let caseIdNumber = 'N/A';
    let patientInfo: string | undefined;

    if (validated.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      });
      // Validate patient still exists (race condition protection)
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found. They may have been discharged or deleted.' },
          { status: 404 }
        );
      }
      const demographics = patient.demographics as { name?: string; species?: string; breed?: string } | null;
      patientName = demographics?.name || patientName;
      caseIdNumber = `VH-${validated.patientId}`; // VetHub patient ID as case number
      patientInfo = [demographics?.species, demographics?.breed].filter(Boolean).join(' ');
    }

    // Get residency year upfront (before transaction)
    const residencyYear = skipAcvim ? 1 : await getResidencyYear();

    // Create both in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the daily stats surgery (with patientId link)
      const surgery = await tx.surgery.create({
        data: {
          dailyEntryId: validated.dailyEntryId,
          procedureName: validated.procedureName,
          participation: validated.participation,
          patientName,
          patientId: validated.patientId,
          notes: validated.notes,
        },
        include: {
          dailyEntry: true,
          patient: true,
        },
      });

      // 2. Also create ACVIM case log entry (unless skipped)
      let acvimCase = null;
      if (!skipAcvim) {
        acvimCase = await tx.aCVIMNeurosurgeryCase.create({
          data: {
            procedureName: validated.procedureName,
            dateCompleted: dailyEntry.date,
            caseIdNumber,
            role: mapParticipationToRole(validated.participation),
            hours: 1.0, // Default 1 hour - can be edited later on full page
            residencyYear,
            patientId: validated.patientId,
            patientName,
            patientInfo,
            notes: validated.notes,
          },
        });
      }

      return { surgery, acvimCase };
    });

    return NextResponse.json(result.surgery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating surgery:', error);
    return NextResponse.json(
      { error: 'Failed to create surgery' },
      { status: 500 }
    );
  }
}

// DELETE - Remove surgery by ID (also removes corresponding ACVIM case)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }

    // First get the surgery to find matching ACVIM case
    const surgery = await prisma.surgery.findUnique({
      where: { id },
      include: { dailyEntry: true },
    });

    if (!surgery) {
      return NextResponse.json(
        { error: 'Surgery not found' },
        { status: 404 }
      );
    }

    // Delete both surgery and matching ACVIM case in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete the surgery
      await tx.surgery.delete({
        where: { id },
      });

      // 2. Try to find and delete the matching ACVIM case
      // Match on: procedureName, dateCompleted, and (patientId OR patientName)
      const matchCriteria: {
        procedureName: string;
        dateCompleted: string;
        patientId?: number;
        patientName?: string;
      } = {
        procedureName: surgery.procedureName,
        dateCompleted: surgery.dailyEntry.date,
      };

      if (surgery.patientId) {
        matchCriteria.patientId = surgery.patientId;
      } else if (surgery.patientName) {
        matchCriteria.patientName = surgery.patientName;
      }

      // Delete matching ACVIM case (best effort - may not find exact match)
      await tx.aCVIMNeurosurgeryCase.deleteMany({
        where: matchCriteria,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting surgery:', error);
    return NextResponse.json(
      { error: 'Failed to delete surgery' },
      { status: 500 }
    );
  }
}
