import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/appointments
 * Fetch all appointments for today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const appointments = await prisma.appointment.findMany({
      where: {
        date: date,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { appointmentTime: 'asc' },
      ],
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('[API] Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * Create a new appointment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const date = body.date || new Date().toISOString().split('T')[0];

    // Get the highest sortOrder for this date
    const maxSortOrder = await prisma.appointment.findFirst({
      where: { date },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const appointment = await prisma.appointment.create({
      data: {
        date,
        sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1,
        patientName: body.patientName || '',
        appointmentTime: body.appointmentTime || null,
        age: body.age || null,
        status: body.status || 'recheck',
        whyHereToday: body.whyHereToday || null,
        lastVisit: body.lastVisit || null,
        mri: body.mri || null,
        bloodwork: body.bloodwork || null,
        medications: body.medications || null,
        changesSinceLastVisit: body.changesSinceLastVisit || null,
        otherNotes: body.otherNotes || null,
        rawText: body.rawText || null,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/appointments
 * Bulk update appointments (for reordering)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointments } = body;

    if (!Array.isArray(appointments)) {
      return NextResponse.json(
        { error: 'appointments array is required' },
        { status: 400 }
      );
    }

    // Update each appointment's sortOrder
    await Promise.all(
      appointments.map((apt: any) =>
        prisma.appointment.update({
          where: { id: apt.id },
          data: { sortOrder: apt.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating appointments:', error);
    return NextResponse.json(
      { error: 'Failed to update appointments' },
      { status: 500 }
    );
  }
}
