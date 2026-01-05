import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Common feeding frequencies with default times
const FEEDING_FREQUENCIES = {
  q4h: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
  q6h: ['06:00', '12:00', '18:00', '00:00'],
  q8h: ['06:00', '14:00', '22:00'],
  q12h: ['06:00', '18:00'],
  tid: ['08:00', '14:00', '20:00'],
  bid: ['08:00', '20:00'],
};

// Validation schema for creating feeding schedule
const feedingScheduleSchema = z.object({
  patientId: z.number(),
  foodType: z.string().min(1, 'Food type is required'),
  amountGrams: z.number().int().positive('Amount must be positive'),
  kcalPerDay: z.number().optional(),
  frequency: z.enum(['q4h', 'q6h', 'q8h', 'q12h', 'tid', 'bid']),
  feedingTimes: z.array(z.string()).optional(), // Override default times
  notes: z.string().optional(),
  waterOnly: z.boolean().optional(),
});

// Validation schema for logging a feeding
const feedingRecordSchema = z.object({
  scheduleId: z.string(),
  scheduledTime: z.string(),
  scheduledDate: z.string(),
  amountGiven: z.number().int().optional(),
  percentEaten: z.number().int().min(0).max(100).optional(),
  vomited: z.boolean().optional(),
  refused: z.boolean().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Fetch feeding schedules (optionally filtered by patient)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const includeRecords = searchParams.get('includeRecords') === 'true';
    const dueOnly = searchParams.get('dueOnly') === 'true';
    const today = new Date().toISOString().split('T')[0];

    // If dueOnly, get all schedules with pending feedings for today
    if (dueOnly) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const schedules = await prisma.feedingSchedule.findMany({
        where: {
          isActive: true,
          patient: { status: 'Active' },
        },
        include: {
          patient: {
            select: {
              id: true,
              demographics: true,
            },
          },
          feedingRecords: {
            where: {
              scheduledDate: today,
            },
          },
        },
      });

      // Filter to schedules with upcoming/due feedings
      const dueFeeedings = schedules.flatMap((schedule) => {
        return schedule.feedingTimes
          .map((time) => {
            const [h, m] = time.split(':').map(Number);
            const scheduledMinutes = h * 60 + m;

            // Check if this feeding has been completed
            const record = schedule.feedingRecords.find(
              (r) => r.scheduledTime === time && r.scheduledDate === today
            );

            // Show feedings that are:
            // - Due now (within 30 min window) and not completed
            // - Upcoming (within next 2 hours)
            const isOverdue = scheduledMinutes < currentTimeMinutes - 30;
            const isDueNow = Math.abs(scheduledMinutes - currentTimeMinutes) <= 30;
            const isUpcoming = scheduledMinutes > currentTimeMinutes && scheduledMinutes <= currentTimeMinutes + 120;

            if ((isDueNow || isUpcoming || isOverdue) && !record?.completedAt) {
              const demographics = schedule.patient.demographics as { name?: string; weight?: string | number };
              return {
                scheduleId: schedule.id,
                patientId: schedule.patientId,
                patientName: demographics?.name || `Patient ${schedule.patientId}`,
                weight: demographics?.weight,
                foodType: schedule.foodType,
                amountGrams: schedule.amountGrams,
                scheduledTime: time,
                scheduledDate: today,
                status: isOverdue ? 'overdue' : isDueNow ? 'due' : 'upcoming',
                notes: schedule.notes,
              };
            }
            return null;
          })
          .filter(Boolean);
      });

      return NextResponse.json(dueFeeedings);
    }

    // Standard query with optional patient filter
    const where: { patientId?: number; isActive?: boolean } = { isActive: true };
    if (patientId) where.patientId = parseInt(patientId);

    const schedules = await prisma.feedingSchedule.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
        feedingRecords: includeRecords
          ? {
              where: { scheduledDate: today },
              orderBy: { scheduledTime: 'asc' },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching feeding schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch feeding schedules', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create new feeding schedule OR log a feeding record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a feeding record (has scheduleId)
    if (body.scheduleId) {
      const validated = feedingRecordSchema.parse(body);

      const record = await prisma.feedingRecord.upsert({
        where: {
          scheduleId_scheduledDate_scheduledTime: {
            scheduleId: validated.scheduleId,
            scheduledDate: validated.scheduledDate,
            scheduledTime: validated.scheduledTime,
          },
        },
        create: {
          ...validated,
          completedAt: new Date(),
        },
        update: {
          ...validated,
          completedAt: new Date(),
        },
      });

      return NextResponse.json(record);
    }

    // Otherwise create a new feeding schedule
    const validated = feedingScheduleSchema.parse(body);

    // Use default feeding times for the frequency if not provided
    const feedingTimes = validated.feedingTimes || FEEDING_FREQUENCIES[validated.frequency];

    const schedule = await prisma.feedingSchedule.create({
      data: {
        patientId: validated.patientId,
        foodType: validated.foodType,
        amountGrams: validated.amountGrams,
        kcalPerDay: validated.kcalPerDay,
        frequency: validated.frequency,
        feedingTimes,
        notes: validated.notes,
        waterOnly: validated.waterOnly ?? false,
      },
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating feeding schedule/record:', error);
    return NextResponse.json(
      { error: 'Failed to create feeding schedule' },
      { status: 500 }
    );
  }
}

// PUT - Update feeding schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const schedule = await prisma.feedingSchedule.update({
      where: { id },
      data: {
        foodType: data.foodType,
        amountGrams: data.amountGrams,
        kcalPerDay: data.kcalPerDay,
        frequency: data.frequency,
        feedingTimes: data.feedingTimes,
        notes: data.notes,
        waterOnly: data.waterOnly,
        isActive: data.isActive,
      },
      include: {
        patient: {
          select: {
            id: true,
            demographics: true,
          },
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update feeding schedule' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate feeding schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // Soft delete - just deactivate
    await prisma.feedingSchedule.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete feeding schedule' },
      { status: 500 }
    );
  }
}
