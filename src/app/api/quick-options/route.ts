import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/quick-options
 * Fetch all quick insert options with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const field = searchParams.get('field');

    const where: {
      category?: string;
      field?: string;
    } = {};

    if (category) where.category = category;
    if (field) where.field = field;

    const options = await prisma.quickInsertOption.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [
        { category: 'asc' },
        { field: 'asc' },
        { label: 'asc' },
      ],
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('[API] Error fetching quick options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick options' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quick-options
 * Create a new quick insert option
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.label || !body.text || !body.category || !body.field) {
      return NextResponse.json(
        { error: 'Missing required fields: label, text, category, field' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['surgery', 'seizures', 'other'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate field
    const validFields = ['therapeutics', 'diagnostics', 'concerns', 'problems'];
    if (!validFields.includes(body.field)) {
      return NextResponse.json(
        { error: `Invalid field. Must be one of: ${validFields.join(', ')}` },
        { status: 400 }
      );
    }

    const option = await prisma.quickInsertOption.create({
      data: {
        trigger: body.trigger || null,
        label: body.label,
        text: body.text,
        category: body.category,
        field: body.field,
        isDefault: body.isDefault ?? false,
      },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating quick option:', error);
    return NextResponse.json(
      { error: 'Failed to create quick option' },
      { status: 500 }
    );
  }
}
