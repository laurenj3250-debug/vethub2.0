import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/quick-references/[id]
 * Fetch a single quick reference by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reference = await prisma.quickReference.findUnique({
      where: { id },
    });

    if (!reference) {
      return NextResponse.json(
        { error: 'Quick reference not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reference);
  } catch (error) {
    console.error('[API] Error fetching quick reference:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick reference' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quick-references/[id]
 * Update a quick reference
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if reference exists
    const existing = await prisma.quickReference.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quick reference not found' },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (body.type) {
      const validTypes = ['medication', 'protocol'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const reference = await prisma.quickReference.update({
      where: { id },
      data: {
        ...(body.type && { type: body.type }),
        ...(body.name && { name: body.name }),
        ...(body.content && { content: body.content }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json(reference);
  } catch (error) {
    console.error('[API] Error updating quick reference:', error);
    return NextResponse.json(
      { error: 'Failed to update quick reference' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quick-references/[id]
 * Delete a quick reference
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if reference exists
    const existing = await prisma.quickReference.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quick reference not found' },
        { status: 404 }
      );
    }

    await prisma.quickReference.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting quick reference:', error);
    return NextResponse.json(
      { error: 'Failed to delete quick reference' },
      { status: 500 }
    );
  }
}
