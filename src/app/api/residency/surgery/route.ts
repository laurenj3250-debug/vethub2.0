import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const surgerySchema = z.object({
  dailyEntryId: z.string(),
  procedureName: z.string().min(1, 'Procedure name is required'),
  participation: z.enum(['S', 'O', 'C', 'D', 'K']),
  patientName: z.string().optional(),
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

    // Get residency year upfront (before transaction)
    const residencyYear = skipAcvim ? 1 : await getResidencyYear();

    // Create both in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the daily stats surgery
      const surgery = await tx.surgery.create({
        data: validated,
        include: {
          dailyEntry: true,
        },
      });

      // 2. Also create ACVIM case log entry (unless skipped)
      let acvimCase = null;
      if (!skipAcvim) {
        acvimCase = await tx.aCVIMNeurosurgeryCase.create({
          data: {
            procedureName: validated.procedureName,
            dateCompleted: dailyEntry.date,
            caseIdNumber: validated.patientName || 'N/A', // Use patient name as case ID fallback
            role: mapParticipationToRole(validated.participation),
            hours: 1.0, // Default 1 hour - can be edited later on full page
            residencyYear,
            patientName: validated.patientName,
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

// DELETE - Remove surgery by ID
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

    await prisma.surgery.delete({
      where: { id },
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
