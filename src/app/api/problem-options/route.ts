import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/problem-options
 * Fetch all problem options
 */
export async function GET() {
  try {
    const options = await prisma.problemOption.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { label: 'asc' },
      ],
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('[API] Error fetching problem options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problem options' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/problem-options
 * Create a new problem option
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.label?.trim()) {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      );
    }

    const option = await prisma.problemOption.create({
      data: {
        label: body.label.trim(),
        isDefault: body.isDefault ?? false,
      },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Problem option already exists' },
        { status: 409 }
      );
    }
    console.error('[API] Error creating problem option:', error);
    return NextResponse.json(
      { error: 'Failed to create problem option' },
      { status: 500 }
    );
  }
}
