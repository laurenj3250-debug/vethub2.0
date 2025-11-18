import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/autocomplete
 * Get auto-complete suggestions for rounding sheet and SOAP fields
 * Query params: field (problems|diagnostics|therapeutics|concerns), query (search text)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');
    const query = searchParams.get('query');

    if (!field || !query) {
      return NextResponse.json(
        { error: 'field and query parameters are required' },
        { status: 400 }
      );
    }

    // Search for phrases matching the query in the specified field
    const phrases = await prisma.commonPhrase.findMany({
      where: {
        field: field,
        phrase: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: [
        { usageCount: 'desc' }, // Most used first
        { lastUsedAt: 'desc' }, // Most recent next
      ],
      take: 5, // Limit to top 5 suggestions
    });

    return NextResponse.json(phrases);
  } catch (error) {
    console.error('[API] Error fetching autocomplete suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch autocomplete suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autocomplete
 * Record usage of a phrase (upsert - create if doesn't exist, increment count if exists)
 * Body: { field, phrase }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field, phrase } = body;

    if (!field || !phrase) {
      return NextResponse.json(
        { error: 'field and phrase are required' },
        { status: 400 }
      );
    }

    // Upsert: create new or increment usage count
    const result = await prisma.commonPhrase.upsert({
      where: {
        field_phrase: {
          field,
          phrase,
        },
      },
      create: {
        field,
        phrase,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
      update: {
        usageCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error recording phrase usage:', error);
    return NextResponse.json(
      { error: 'Failed to record phrase usage' },
      { status: 500 }
    );
  }
}
