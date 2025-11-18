import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/appointments/[id]
 * Update a specific appointment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;
    const body = await request.json();

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        patientName: body.patientName !== undefined ? body.patientName : undefined,
        appointmentTime: body.appointmentTime !== undefined ? body.appointmentTime : undefined,
        age: body.age !== undefined ? body.age : undefined,
        status: body.status !== undefined ? body.status : undefined,
        whyHereToday: body.whyHereToday !== undefined ? body.whyHereToday : undefined,
        lastVisit: body.lastVisit !== undefined ? body.lastVisit : undefined,
        mri: body.mri !== undefined ? body.mri : undefined,
        bloodwork: body.bloodwork !== undefined ? body.bloodwork : undefined,
        medications: body.medications !== undefined ? body.medications : undefined,
        changesSinceLastVisit: body.changesSinceLastVisit !== undefined ? body.changesSinceLastVisit : undefined,
        otherNotes: body.otherNotes !== undefined ? body.otherNotes : undefined,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : undefined,
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('[API] Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]
 * Delete a specific appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;

    await prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}
