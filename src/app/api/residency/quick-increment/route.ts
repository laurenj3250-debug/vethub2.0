import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getTodayET, getCurrentTimeET } from '@/lib/timezone';

// All trackable fields
const COUNTER_FIELDS = [
  'mriCount',
  'recheckCount',
  'newConsultCount',
  'emergencyCount',
  'commsCount',
] as const;

type CounterField = typeof COUNTER_FIELDS[number];

// Validation schema for quick increment
const quickIncrementSchema = z.object({
  field: z.enum(COUNTER_FIELDS),
  delta: z.number().int().min(-1).max(1), // Only allow +1 or -1
});

// Validation schema for clock in/out
const clockSchema = z.object({
  action: z.enum(['clockIn', 'clockOut']),
  time: z.string().optional(), // If not provided, use current time in ET
});

// POST - Atomically increment/decrement a field for today
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a clock action
    if (body.action) {
      const validated = clockSchema.parse(body);
      const today = getTodayET();
      const time = validated.time || getCurrentTimeET();

      const entry = await prisma.dailyEntry.upsert({
        where: { date: today },
        create: {
          date: today,
          mriCount: 0,
          recheckCount: 0,
          newConsultCount: 0,
          newCount: 0,
          emergencyCount: 0,
          commsCount: 0,
          totalCases: 0,
          shiftStartTime: validated.action === 'clockIn' ? time : null,
          shiftEndTime: validated.action === 'clockOut' ? time : null,
        },
        update: {
          [validated.action === 'clockIn' ? 'shiftStartTime' : 'shiftEndTime']: time,
        },
      });

      return NextResponse.json(entry);
    }

    // Counter increment
    const validated = quickIncrementSchema.parse(body);
    const today = getTodayET();

    // Use a transaction to ensure atomic read-modify-write
    const entry = await prisma.$transaction(async (tx) => {
      // Get or create the entry for today
      let existing = await tx.dailyEntry.findUnique({
        where: { date: today },
      });

      if (!existing) {
        existing = await tx.dailyEntry.create({
          data: {
            date: today,
            mriCount: 0,
            recheckCount: 0,
            newConsultCount: 0,
            newCount: 0,
            emergencyCount: 0,
            commsCount: 0,
            totalCases: 0,
          },
        });
      }

      // Calculate new value (don't go below 0)
      const currentValue = (existing[validated.field] as number) || 0;
      const newValue = Math.max(0, currentValue + validated.delta);

      // Calculate new totals
      const updates: Record<string, number> = {
        [validated.field]: newValue,
      };

      // Keep newCount in sync with newConsultCount for backward compatibility
      if (validated.field === 'newConsultCount') {
        updates.newCount = newValue;
      }

      // Calculate total cases (MRI + all appointment types)
      const newMri = validated.field === 'mriCount' ? newValue : existing.mriCount;
      const newRecheck = validated.field === 'recheckCount' ? newValue : existing.recheckCount;
      const newConsult = validated.field === 'newConsultCount' ? newValue : existing.newConsultCount;
      const newEmergency = validated.field === 'emergencyCount' ? newValue : existing.emergencyCount;
      updates.totalCases = newMri + newRecheck + newConsult + newEmergency;

      // Update the entry
      return tx.dailyEntry.update({
        where: { date: today },
        data: updates,
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
