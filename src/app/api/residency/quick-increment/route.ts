import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for quick increment - date is now server-determined
const quickIncrementSchema = z.object({
  field: z.enum(['mriCount', 'recheckCount', 'newCount']),
  delta: z.number().int().min(-1).max(1), // Only allow +1 or -1
});

// Get today's date in UTC (server-side, avoids timezone mismatch)
function getServerToday(): string {
  return new Date().toISOString().split('T')[0];
}

// POST - Atomically increment/decrement a field for today
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = quickIncrementSchema.parse(body);

    // Server determines "today" to avoid client timezone issues
    const today = getServerToday();

    // Use a transaction to ensure atomic read-modify-write
    const entry = await prisma.$transaction(async (tx) => {
      // Get or create the entry for today
      let existing = await tx.dailyEntry.findUnique({
        where: { date: today },
      });

      if (!existing) {
        // Create new entry with initial values
        existing = await tx.dailyEntry.create({
          data: {
            date: today,
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

      // Update the entry (without unnecessary includes for performance)
      return tx.dailyEntry.update({
        where: { date: today },
        data: {
          [validated.field]: newValue,
          totalCases,
        },
      });
    });

    // Return entry with date for client cache update
    return NextResponse.json({
      ...entry,
      surgeries: [],
      lmriEntries: [],
    });
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
