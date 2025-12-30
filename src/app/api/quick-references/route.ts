import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/quick-references
 * Fetch all quick references with optional type filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    const where: { type?: string } = {};
    if (type) where.type = type;

    const references = await prisma.quickReference.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(references);
  } catch (error) {
    console.error('[API] Error fetching quick references:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick references' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quick-references
 * Create a new quick reference
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.name || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, content' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['medication', 'protocol'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const reference = await prisma.quickReference.create({
      data: {
        type: body.type,
        name: body.name,
        content: body.content,
        notes: body.notes || null,
        isDefault: body.isDefault ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(reference, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating quick reference:', error);
    return NextResponse.json(
      { error: 'Failed to create quick reference' },
      { status: 500 }
    );
  }
}
