import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/reference/medications/[id]
 * Update a reference medication
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const medication = await prisma.referenceMedication.update({
      where: { id },
      data: {
        name: body.name,
        dose: body.dose,
        notes: body.notes,
        sortOrder: body.sortOrder,
      },
    });

    return NextResponse.json(medication);
  } catch (error: any) {
    console.error('[API] Error updating reference medication:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A medication with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update reference medication' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reference/medications/[id]
 * Delete a reference medication
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.referenceMedication.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error deleting reference medication:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete reference medication' },
      { status: 500 }
    );
  }
}
