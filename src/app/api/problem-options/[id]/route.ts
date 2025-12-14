import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/problem-options/[id]
 * Update a problem option's label
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const optionId = resolvedParams.id;

    if (!optionId || optionId === 'undefined' || optionId === 'null') {
      return NextResponse.json(
        { error: 'Invalid option ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { label } = body;

    if (!label || typeof label !== 'string' || !label.trim()) {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      );
    }

    const updated = await prisma.problemOption.update({
      where: { id: optionId },
      data: { label: label.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Error updating problem option:', error);
    return NextResponse.json(
      { error: 'Failed to update problem option' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/problem-options/[id]
 * Delete a problem option
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const optionId = resolvedParams.id;

    if (!optionId || optionId === 'undefined' || optionId === 'null') {
      return NextResponse.json(
        { error: 'Invalid option ID' },
        { status: 400 }
      );
    }

    await prisma.problemOption.delete({
      where: { id: optionId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting problem option:', error);
    return NextResponse.json(
      { error: 'Failed to delete problem option' },
      { status: 500 }
    );
  }
}
