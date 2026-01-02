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

// POST - Create new surgery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = surgerySchema.parse(body);

    const surgery = await prisma.surgery.create({
      data: validated,
      include: {
        dailyEntry: true,
      },
    });

    return NextResponse.json(surgery);
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
