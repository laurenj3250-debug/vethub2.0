import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getTodayET } from '@/lib/timezone';
import { requireAuth } from '@/lib/api-auth';

const surgerySchema = z.object({
  dailyEntryId: z.string().optional(), // Optional now — auto-creates if missing
  date: z.string().optional(), // ISO date — used when dailyEntryId not provided
  procedureName: z.string().min(1, 'Procedure name is required'),
  role: z.enum(['Primary', 'Assistant']),
  patientOrigin: z.enum(['new', 'hospitalized']).optional(),
  patientName: z.string().optional(),
  patientId: z.number().optional(),
  notes: z.string().optional(),
  skipAcvim: z.boolean().optional(),
  certificateCategories: z.array(z.string()).optional(), // Certificate tags
});

// GET - Fetch surgeries (optionally filtered)
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const dailyEntryId = searchParams.get('dailyEntryId');

    const where: { dailyEntryId?: string } = {};
    if (dailyEntryId) where.dailyEntryId = dailyEntryId;

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

// POST - Create new surgery (also creates ACVIM case log entry with proper FK)
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validated = surgerySchema.parse(body);
    const skipAcvim = validated.skipAcvim === true;

    // Determine the target date and daily entry
    const targetDate = validated.date || getTodayET();
    let dailyEntryId = validated.dailyEntryId;

    // Auto-create DailyEntry if not provided (removes the "log a case first" blocker)
    let dailyEntry;
    if (!dailyEntryId) {
      dailyEntry = await prisma.dailyEntry.upsert({
        where: { date: targetDate },
        create: {
          date: targetDate,
          mriCount: 0,
          recheckCount: 0,
          newConsultCount: 0,
          newCount: 0,
          emergencyCount: 0,
          commsCount: 0,
          totalCases: 0,
        },
        update: {},
      });
      dailyEntryId = dailyEntry.id;
    } else {
      // Verify the provided daily entry exists
      dailyEntry = await prisma.dailyEntry.findUnique({
        where: { id: dailyEntryId },
      });

      if (!dailyEntry) {
        return NextResponse.json(
          { error: 'Daily entry not found' },
          { status: 404 }
        );
      }
    }

    // Look up patient if patientId provided
    let patientName = validated.patientName;
    let caseIdNumber = 'N/A';
    let patientInfo: string | undefined;

    if (validated.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found. They may have been discharged or deleted.' },
          { status: 404 }
        );
      }
      const demographics = patient.demographics as { name?: string; species?: string; breed?: string; patientId?: string; clientId?: string } | null;
      patientName = demographics?.name || patientName;
      caseIdNumber = demographics?.patientId || demographics?.clientId || `VH-${validated.patientId}`;
      patientInfo = [demographics?.species, demographics?.breed].filter(Boolean).join(' ');
    }

    // Get residency year upfront
    const residencyYear = skipAcvim ? 1 : await getResidencyYear();

    // Create both in a transaction with proper FK linking
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create ACVIM case first (if not skipped) to get its ID for the FK
      let acvimCase = null;
      if (!skipAcvim) {
        acvimCase = await tx.aCVIMNeurosurgeryCase.create({
          data: {
            procedureName: validated.procedureName,
            dateCompleted: dailyEntry.date,
            caseIdNumber,
            role: validated.role,
            hours: 1.0,
            residencyYear,
            patientId: validated.patientId,
            patientName,
            patientInfo,
            notes: validated.notes,
            certificateCategories: validated.certificateCategories || [],
          },
        });
      }

      // 2. Create the surgery with FK to ACVIM case
      const surgery = await tx.surgery.create({
        data: {
          dailyEntryId,
          procedureName: validated.procedureName,
          role: validated.role,
          patientOrigin: validated.patientOrigin,
          patientName,
          patientId: validated.patientId,
          notes: validated.notes,
          acvimCaseId: acvimCase?.id || null,
        },
        include: {
          dailyEntry: true,
          patient: true,
        },
      });

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

// PATCH - Edit surgery (and linked ACVIM case) by ID
const surgeryPatchSchema = z.object({
  id: z.string().min(1, 'Surgery ID is required'),
  procedureName: z.string().min(1).optional(),
  role: z.enum(['Primary', 'Assistant']).optional(),
  patientOrigin: z.enum(['new', 'hospitalized']).optional(),
  patientName: z.string().optional(),
  notes: z.string().optional(),
  certificateCategories: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validated = surgeryPatchSchema.parse(body);
    const { id, ...updates } = validated;

    // Remove undefined values so we only update provided fields
    const surgeryUpdates: Record<string, unknown> = {};
    if (updates.procedureName !== undefined) surgeryUpdates.procedureName = updates.procedureName;
    if (updates.role !== undefined) surgeryUpdates.role = updates.role;
    if (updates.patientOrigin !== undefined) surgeryUpdates.patientOrigin = updates.patientOrigin;
    if (updates.patientName !== undefined) surgeryUpdates.patientName = updates.patientName;
    if (updates.notes !== undefined) surgeryUpdates.notes = updates.notes;

    if (Object.keys(surgeryUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Look up surgery to check for linked ACVIM case
    const existing = await prisma.surgery.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Surgery not found' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the surgery
      const surgery = await tx.surgery.update({
        where: { id },
        data: surgeryUpdates,
        include: { dailyEntry: true, patient: true },
      });

      // If linked ACVIM case exists, mirror matching fields
      if (existing.acvimCaseId) {
        const acvimUpdates: Record<string, unknown> = {};
        if (updates.procedureName !== undefined) acvimUpdates.procedureName = updates.procedureName;
        if (updates.role !== undefined) acvimUpdates.role = updates.role;
        if (updates.patientName !== undefined) acvimUpdates.patientName = updates.patientName;
        if (updates.notes !== undefined) acvimUpdates.notes = updates.notes;
        if (updates.certificateCategories !== undefined) acvimUpdates.certificateCategories = updates.certificateCategories;

        if (Object.keys(acvimUpdates).length > 0) {
          await tx.aCVIMNeurosurgeryCase.update({
            where: { id: existing.acvimCaseId },
            data: acvimUpdates,
          }).catch(() => {
            // ACVIM case may have been manually deleted — that's fine
          });
        }
      }

      return surgery;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating surgery:', error);
    return NextResponse.json(
      { error: 'Failed to update surgery' },
      { status: 500 }
    );
  }
}

// DELETE - Remove surgery by ID (also removes linked ACVIM case via FK)
export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }

    const surgery = await prisma.surgery.findUnique({
      where: { id },
    });

    if (!surgery) {
      return NextResponse.json(
        { error: 'Surgery not found' },
        { status: 404 }
      );
    }

    // Delete both in a transaction using the FK link
    await prisma.$transaction(async (tx) => {
      // Delete linked ACVIM case first (if exists)
      if (surgery.acvimCaseId) {
        await tx.aCVIMNeurosurgeryCase.delete({
          where: { id: surgery.acvimCaseId },
        }).catch(() => {
          // ACVIM case may have been manually deleted — that's fine
        });
      }

      // Delete the surgery
      await tx.surgery.delete({
        where: { id },
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
