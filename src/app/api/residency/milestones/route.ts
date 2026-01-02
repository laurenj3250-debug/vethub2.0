import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Milestone thresholds
const MILESTONES = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
  case: [100, 250, 500, 750, 1000, 1500, 2000],
};

// GET - Check for new milestones and return uncelebrated ones
export async function GET() {
  try {
    // Get current totals
    const entries = await prisma.dailyEntry.findMany();
    const surgeries = await prisma.surgery.findMany();

    const totals = entries.reduce(
      (acc, entry) => ({
        mri: acc.mri + entry.mriCount,
        appointment: acc.appointment + entry.recheckCount + entry.newCount,
        case: acc.case + entry.totalCases,
      }),
      { mri: 0, appointment: 0, case: 0 }
    );
    totals.case += surgeries.length; // Surgeries also count as cases

    const surgeryTotal = surgeries.length;

    // Check each milestone type
    const newMilestones: Array<{ type: string; count: number }> = [];

    for (const [type, thresholds] of Object.entries(MILESTONES)) {
      const currentCount = type === 'surgery' ? surgeryTotal : totals[type as keyof typeof totals];

      for (const threshold of thresholds) {
        if (currentCount >= threshold) {
          // Check if already achieved
          const existing = await prisma.milestone.findUnique({
            where: { type_count: { type, count: threshold } },
          });

          if (!existing) {
            // Award new milestone
            await prisma.milestone.create({
              data: { type, count: threshold },
            });
            newMilestones.push({ type, count: threshold });
          }
        }
      }
    }

    // Get uncelebrated milestones
    const uncelebrated = await prisma.milestone.findMany({
      where: { celebrated: false },
      orderBy: { achievedAt: 'desc' },
    });

    return NextResponse.json({
      newMilestones,
      uncelebrated,
      currentTotals: { ...totals, surgery: surgeryTotal },
    });
  } catch (error) {
    console.error('Error checking milestones:', error);
    return NextResponse.json(
      { error: 'Failed to check milestones' },
      { status: 500 }
    );
  }
}

// POST - Mark milestone as celebrated
export async function POST(request: NextRequest) {
  try {
    const { milestoneId } = await request.json();

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      );
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { celebrated: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking milestone celebrated:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}
