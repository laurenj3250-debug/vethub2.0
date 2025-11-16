import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/common/comments
 * Fetch all common comments for auto-complete
 */
export async function GET() {
  try {
    const comments = await prisma.commonComment.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('[API] Error fetching common comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch common comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/common/comments
 * Create a new common comment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Comment name is required' },
        { status: 400 }
      );
    }

    const comment = await prisma.commonComment.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating common comment:', error);

    // Handle unique constraint violation
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Comment already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create common comment' },
      { status: 500 }
    );
  }
}
