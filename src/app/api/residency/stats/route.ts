import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayET } from '@/lib/timezone';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // 1. Aggregate totals in the database instead of loading all entries
    const totalsAgg = await prisma.dailyEntry.aggregate({
      _sum: {
        mriCount: true,
        recheckCount: true,
        newConsultCount: true,
        emergencyCount: true,
        commsCount: true,
        newCount: true,
        totalCases: true,
      },
      _count: { id: true },
    });

    const s = totalsAgg._sum;
    const totals = {
      mriCount: s.mriCount ?? 0,
      recheckCount: s.recheckCount ?? 0,
      newConsultCount: s.newConsultCount ?? s.newCount ?? 0,
      emergencyCount: s.emergencyCount ?? 0,
      commsCount: s.commsCount ?? 0,
      newCount: s.newCount ?? 0,
      totalCases: s.totalCases ?? 0,
      totalAppointments: (s.recheckCount ?? 0) +
        (s.newConsultCount ?? s.newCount ?? 0) +
        (s.emergencyCount ?? 0),
    };

    const daysLogged = totalsAgg._count.id;

    // 2. Surgery role breakdown via groupBy instead of loading all surgeries
    const surgeryGroups = await prisma.surgery.groupBy({
      by: ['role', 'participation'],
      _count: { id: true },
    });

    const surgeryBreakdown: Record<string, number> = { Primary: 0, Assistant: 0, total: 0 };
    for (const group of surgeryGroups) {
      // Use new `role` field, fall back to legacy `participation` mapping
      const role = group.role || (group.participation === 'S' ? 'Primary' : 'Assistant');
      surgeryBreakdown[role] = (surgeryBreakdown[role] || 0) + group._count.id;
      surgeryBreakdown.total += group._count.id;
    }

    // 3. MRI type breakdown from patient data (select only mriData field)
    const mriPatients = await prisma.patient.findMany({
      where: { type: 'MRI' },
      select: { mriData: true },
    });
    const mriTypeBreakdown: Record<string, number> = {};
    for (const p of mriPatients) {
      const scanType = (p.mriData as any)?.scanType || '';
      // Handle comma-separated multi-select values (e.g., "Brain, C-Spine")
      const types = scanType ? scanType.split(',').map((s: string) => s.trim()).filter(Boolean) : ['Unknown'];
      for (const t of types) {
        mriTypeBreakdown[t] = (mriTypeBreakdown[t] || 0) + 1;
      }
    }

    // 4. LMRI+ accuracy stats via count queries instead of loading all entries
    const lmriTotal = await prisma.lMRIEntry.count();
    const localizationCorrect = await prisma.lMRIEntry.count({
      where: { localizationCorrect: true },
    });
    const lateralityCorrect = await prisma.lMRIEntry.count({
      where: { lateralityCorrect: true },
    });
    const bonusFinds = await prisma.lMRIEntry.count({
      where: { bonusFind: true },
    });

    const lmriStats = {
      total: lmriTotal,
      localizationCorrect,
      lateralityCorrect,
      bonusFinds,
      accuracy: lmriTotal > 0
        ? Math.round((localizationCorrect / lmriTotal) * 100)
        : 0,
    };

    // 5. Weekly data for charts — filter in database to last 12 weeks
    const todayStr = getTodayET();
    const twelveWeeksAgo = new Date(todayStr + 'T00:00:00');
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().slice(0, 10);

    const weeklyData = await prisma.dailyEntry.findMany({
      where: {
        date: { gte: twelveWeeksAgoStr },
      },
      include: {
        surgeries: true,
        lmriEntries: true,
      },
      orderBy: { date: 'asc' },
    });

    // 6. Milestones and badges with limit
    const milestones = await prisma.milestone.findMany({
      orderBy: { achievedAt: 'desc' },
      take: 50,
    });

    const badges = await prisma.badge.findMany({
      orderBy: { earnedAt: 'desc' },
      take: 50,
    });

    // 7. Resident profile for program dates
    const profile = await prisma.aCVIMProfile.findFirst();
    const programStartDate = profile?.programStartDate;
    const programEndDate = profile?.programEndDate;

    // Calculate days until freedom
    // Use explicit end date if set, otherwise calculate 3 years from start
    let daysUntilFreedom = null;
    const todayDate = new Date(todayStr + 'T00:00:00');
    if (programEndDate) {
      // Use explicit end date
      const endDate = new Date(programEndDate);
      daysUntilFreedom = Math.max(0, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (programStartDate) {
      // Fall back to 3-year calculation
      const endDate = new Date(programStartDate);
      endDate.setFullYear(endDate.getFullYear() + 3);
      daysUntilFreedom = Math.max(0, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      totals,
      surgeryBreakdown,
      mriTypeBreakdown,
      lmriStats,
      weeklyData,
      milestones,
      badges,
      daysUntilFreedom,
      daysLogged,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: errorMessage },
      { status: 500 }
    );
  }
}
