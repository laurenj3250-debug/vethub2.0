import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default problem options
const DEFAULT_PROBLEMS = [
  'Cervical myelopathy',
  'TL pain',
  'LS pain',
  'Plegic',
  'Vestibular',
  'Seizures',
  'FCE',
  'GME',
  'MUE',
  'SRMA',
];

/**
 * POST /api/problem-options/seed
 * Seed default problem options (idempotent)
 */
export async function POST() {
  try {
    const existing = await prisma.problemOption.count();

    if (existing > 0) {
      return NextResponse.json({
        message: 'Problem options already seeded',
        existingCount: existing,
        addedCount: 0,
      });
    }

    // Create all defaults
    await prisma.problemOption.createMany({
      data: DEFAULT_PROBLEMS.map(label => ({
        label,
        isDefault: true,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Seeded ${DEFAULT_PROBLEMS.length} default problem options`,
      existingCount: 0,
      addedCount: DEFAULT_PROBLEMS.length,
    });
  } catch (error) {
    console.error('[API] Error seeding problem options:', error);
    return NextResponse.json(
      { error: 'Failed to seed problem options' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/problem-options/seed
 * Clear all problem options (for reset)
 */
export async function DELETE() {
  try {
    const { count } = await prisma.problemOption.deleteMany({});

    return NextResponse.json({
      message: `Deleted ${count} problem options`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('[API] Error clearing problem options:', error);
    return NextResponse.json(
      { error: 'Failed to clear problem options' },
      { status: 500 }
    );
  }
}
