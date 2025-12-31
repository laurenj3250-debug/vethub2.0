import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reference/protocols
 * Fetch all reference protocols
 */
export async function GET() {
  try {
    const protocols = await prisma.referenceProtocol.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(protocols);
  } catch (error) {
    console.error('[API] Error fetching reference protocols:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reference protocols' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reference/protocols
 * Create a new reference protocol
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: name, content' },
        { status: 400 }
      );
    }

    // Get max sortOrder for new item
    const maxSort = await prisma.referenceProtocol.aggregate({
      _max: { sortOrder: true },
    });

    const protocol = await prisma.referenceProtocol.create({
      data: {
        name: body.name,
        content: body.content,
        isDefault: body.isDefault ?? false,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(protocol, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating reference protocol:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A protocol with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reference protocol' },
      { status: 500 }
    );
  }
}
