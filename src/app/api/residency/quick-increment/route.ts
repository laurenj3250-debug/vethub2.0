import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for quick increment
const quickIncrementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  field: z.enum(['mriCount', 'recheckCount', 'newCount']),
  delta: z.number().int().min(-1).max(1), // Only allow +1 or -1
});

// POST - Atomically increment/decrement a field for a given date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = quickIncrementSchema.parse(body);

    // Use a transaction to ensure atomic read-modify-write
    const entry = await prisma.$transaction(async (tx) => {
      // Get or create the entry for this date
      let existing = await tx.dailyEntry.findUnique({
        where: { date: validated.date },
      });

      if (!existing) {
        // Create new entry with initial values
        existing = await tx.dailyEntry.create({
          data: {
            date: validated.date,
            mriCount: 0,
            recheckCount: 0,
            newCount: 0,
            totalCases: 0,
          },
        });
      }

      // Calculate new value (don't go below 0)
      const currentValue = existing[validated.field] as number;
      const newValue = Math.max(0, currentValue + validated.delta);

      // Calculate new total
      const newMri = validated.field === 'mriCount' ? newValue : existing.mriCount;
      const newRecheck = validated.field === 'recheckCount' ? newValue : existing.recheckCount;
      const newNew = validated.field === 'newCount' ? newValue : existing.newCount;
      const totalCases = newMri + newRecheck + newNew;

      // Update the entry
      return tx.dailyEntry.update({
        where: { date: validated.date },
        data: {
          [validated.field]: newValue,
          totalCases,
        },
        include: {
          surgeries: true,
          lmriEntries: true,
        },
      });
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error in quick increment:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}
