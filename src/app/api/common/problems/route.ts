import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/common/problems
 * Fetch all common problems for auto-complete
 */
export async function GET() {
  try {
    const problems = await prisma.commonProblem.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(problems);
  } catch (error) {
    console.error('[API] Error fetching common problems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch common problems' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/common/problems
 * Create a new common problem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Problem name is required' },
        { status: 400 }
      );
    }

    const problem = await prisma.commonProblem.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(problem, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating common problem:', error);

    // Handle unique constraint violation
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Problem already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create common problem' },
      { status: 500 }
    );
  }
}
