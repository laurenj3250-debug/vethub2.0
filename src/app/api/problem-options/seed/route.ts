import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default problem options - FULL clinical text (what you actually want inserted)
const DEFAULT_PROBLEMS = [
  'C1-C5 myelopathy, ambulatory',
  'C1-C5 myelopathy, non-ambulatory',
  'T3-L3 myelopathy, ambulatory',
  'T3-L3 myelopathy, non-ambulatory, DP+',
  'T3-L3 myelopathy, non-ambulatory, DP-, +/- MRI tomorrow',
  'L4-S3 myelopathy',
  'Peripheral vestibular disease',
  'Central vestibular disease',
  'Seizure disorder, AED loading',
  'Seizure disorder, cluster seizures',
  'FCE, non-ambulatory',
  'GME/MUE, +/- MRI',
  'SRMA, CSF pending',
  'MRI tomorrow',
  'Hemilaminectomy tomorrow',
  'Ventral slot tomorrow',
  'Boarding',
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
