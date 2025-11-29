import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/quick-options/[id]
 * Update a specific quick insert option
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const optionId = resolvedParams.id;

    // Guard against undefined/invalid IDs
    if (!optionId || optionId === 'undefined' || optionId === 'null') {
      return NextResponse.json(
        { error: 'Invalid option ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate category if provided
    if (body.category) {
      const validCategories = ['surgery', 'seizures', 'other'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate field if provided
    if (body.field) {
      const validFields = ['therapeutics', 'diagnostics', 'concerns', 'problems'];
      if (!validFields.includes(body.field)) {
        return NextResponse.json(
          { error: `Invalid field. Must be one of: ${validFields.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const option = await prisma.quickInsertOption.update({
      where: { id: optionId },
      data: {
        label: body.label !== undefined ? body.label : undefined,
        text: body.text !== undefined ? body.text : undefined,
        category: body.category !== undefined ? body.category : undefined,
        field: body.field !== undefined ? body.field : undefined,
      },
    });

    return NextResponse.json(option);
  } catch (error) {
    console.error('[API] Error updating quick option:', error);
    return NextResponse.json(
      { error: 'Failed to update quick option' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quick-options/[id]
 * Delete a specific quick insert option
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const optionId = resolvedParams.id;

    // Guard against undefined/invalid IDs
    if (!optionId || optionId === 'undefined' || optionId === 'null') {
      return NextResponse.json(
        { error: 'Invalid option ID' },
        { status: 400 }
      );
    }

    await prisma.quickInsertOption.delete({
      where: { id: optionId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting quick option:', error);
    return NextResponse.json(
      { error: 'Failed to delete quick option' },
      { status: 500 }
    );
  }
}
