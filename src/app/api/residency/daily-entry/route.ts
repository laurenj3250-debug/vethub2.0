import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating/updating daily entry
const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  mriCount: z.number().int().min(0).default(0),
  recheckCount: z.number().int().min(0).default(0),
  newCount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// GET - Fetch daily entries (optionally filtered by date range)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Single date lookup
    if (date) {
      const entry = await prisma.dailyEntry.findUnique({
        where: { date },
        include: {
          surgeries: true,
          lmriEntries: true,
        },
      });
      return NextResponse.json(entry);
    }

    // Date range lookup
    const where: { date?: { gte?: string; lte?: string } } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const entries = await prisma.dailyEntry.findMany({
      where,
      include: {
        surgeries: true,
        lmriEntries: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching daily entries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch daily entries', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create or update daily entry (upsert by date)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = dailyEntrySchema.parse(body);

    const totalCases = validated.mriCount + validated.recheckCount + validated.newCount;

    const entry = await prisma.dailyEntry.upsert({
      where: { date: validated.date },
      create: {
        ...validated,
        totalCases,
      },
      update: {
        ...validated,
        totalCases,
      },
      include: {
        surgeries: true,
        lmriEntries: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error saving daily entry:', error);
    return NextResponse.json(
      { error: 'Failed to save daily entry' },
      { status: 500 }
    );
  }
}
