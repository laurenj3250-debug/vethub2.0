import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/resiliency/entries/[entryId]
 * Update a specific resiliency entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const resolvedParams = await params;
    const entryId = resolvedParams.entryId;

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verify entry exists
    const existingEntry = await prisma.resiliencyEntry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const updatedEntry = await prisma.resiliencyEntry.update({
      where: { id: entryId },
      data: {
        entryText: body.entryText !== undefined ? body.entryText.trim() : undefined,
        category: body.category !== undefined ? body.category : undefined,
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('[API] Error updating resiliency entry:', error);
    return NextResponse.json(
      { error: 'Failed to update resiliency entry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resiliency/entries/[entryId]
 * Delete a specific resiliency entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const resolvedParams = await params;
    const entryId = resolvedParams.entryId;

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    // Verify entry exists
    const existingEntry = await prisma.resiliencyEntry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    await prisma.resiliencyEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting resiliency entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete resiliency entry' },
      { status: 500 }
    );
  }
}
