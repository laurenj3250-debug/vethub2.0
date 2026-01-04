import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all daily entries for aggregation
    const entries = await prisma.dailyEntry.findMany({
      include: {
        surgeries: true,
        lmriEntries: true,
      },
    });

    // Get all surgeries for participation breakdown
    const allSurgeries = await prisma.surgery.findMany();

    // Calculate totals
    const totals = entries.reduce(
      (acc, entry) => ({
        mriCount: acc.mriCount + entry.mriCount,
        recheckCount: acc.recheckCount + entry.recheckCount,
        newConsultCount: acc.newConsultCount + (entry.newConsultCount ?? entry.newCount ?? 0),
        emergencyCount: acc.emergencyCount + (entry.emergencyCount ?? 0),
        commsCount: acc.commsCount + (entry.commsCount ?? 0),
        newCount: acc.newCount + entry.newCount, // Legacy field
        totalCases: acc.totalCases + entry.totalCases,
        totalAppointments: acc.totalAppointments + entry.recheckCount +
          (entry.newConsultCount ?? entry.newCount ?? 0) + (entry.emergencyCount ?? 0),
      }),
      {
        mriCount: 0,
        recheckCount: 0,
        newConsultCount: 0,
        emergencyCount: 0,
        commsCount: 0,
        newCount: 0,
        totalCases: 0,
        totalAppointments: 0
      }
    );

    // Surgery participation breakdown
    const surgeryBreakdown = allSurgeries.reduce(
      (acc, surgery) => {
        acc[surgery.participation] = (acc[surgery.participation] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { S: 0, O: 0, C: 0, D: 0, K: 0, total: 0 } as Record<string, number>
    );

    // LMRI+ accuracy stats
    const allLmri = entries.flatMap((e) => e.lmriEntries);
    const lmriStats = {
      total: allLmri.length,
      localizationCorrect: allLmri.filter((l) => l.localizationCorrect).length,
      lateralityCorrect: allLmri.filter((l) => l.lateralityCorrect).length,
      bonusFinds: allLmri.filter((l) => l.bonusFind).length,
      accuracy: allLmri.length > 0
        ? Math.round((allLmri.filter((l) => l.localizationCorrect).length / allLmri.length) * 100)
        : 0,
    };

    // Weekly data for charts (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const weeklyData = entries
      .filter((e) => new Date(e.date) >= twelveWeeksAgo)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get achieved milestones
    const milestones = await prisma.milestone.findMany({
      orderBy: { achievedAt: 'desc' },
    });

    // Get earned badges
    const badges = await prisma.badge.findMany({
      orderBy: { earnedAt: 'desc' },
    });

    // Get resident profile for program dates
    const profile = await prisma.aCVIMProfile.findFirst();
    const programStartDate = profile?.programStartDate;

    // Calculate days until freedom (assuming 3-year residency)
    let daysUntilFreedom = null;
    if (programStartDate) {
      const endDate = new Date(programStartDate);
      endDate.setFullYear(endDate.getFullYear() + 3);
      const today = new Date();
      daysUntilFreedom = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      totals,
      surgeryBreakdown,
      lmriStats,
      weeklyData,
      milestones,
      badges,
      daysUntilFreedom,
      daysLogged: entries.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
