import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/reference/protocols/[id]
 * Update a reference protocol
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const protocol = await prisma.referenceProtocol.update({
      where: { id },
      data: {
        name: body.name,
        content: body.content,
        sortOrder: body.sortOrder,
      },
    });

    return NextResponse.json(protocol);
  } catch (error: any) {
    console.error('[API] Error updating reference protocol:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A protocol with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update reference protocol' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reference/protocols/[id]
 * Delete a reference protocol
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.referenceProtocol.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error deleting reference protocol:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete reference protocol' },
      { status: 500 }
    );
  }
}
