import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWeeklyScheduleFields } from '@/lib/acvim-validation';

// Helper to generate all weeks for a residency year using actual calendar months
function generateWeeksForYear(year: number, startDate: Date): Array<{
  residencyYear: number;
  monthNumber: number;
  weekNumber: number;
  weekDateRange: string;
  weekStartDate: string;
}> {
  const weeks: Array<{
    residencyYear: number;
    monthNumber: number;
    weekNumber: number;
    weekDateRange: string;
    weekStartDate: string;
  }> = [];

  // Calculate year start date (year 1 = startDate, year 2 = startDate + 1 year, etc.)
  const yearStartDate = new Date(startDate);
  yearStartDate.setFullYear(yearStartDate.getFullYear() + (year - 1));

  // Find the Monday of or before the start date
  let currentDate = new Date(yearStartDate);
  const dayOfWeek = currentDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentDate.setDate(currentDate.getDate() - daysToMonday);

  // Track week counts per month
  const weekCountPerMonth: Record<number, number> = {};

  // Generate 52 weeks
  for (let weekIndex = 0; weekIndex < 52; weekIndex++) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday (work week)

    // Calculate months elapsed from residency start (using midpoint of week for accuracy)
    const weekMidpoint = new Date(weekStart);
    weekMidpoint.setDate(weekMidpoint.getDate() + 3);

    // Calculate month number based on actual calendar months from start
    const monthsElapsed =
      (weekMidpoint.getFullYear() - yearStartDate.getFullYear()) * 12 +
      (weekMidpoint.getMonth() - yearStartDate.getMonth());

    // Month number is 1-12, wrapping around
    const monthNumber = (monthsElapsed % 12) + 1;

    // Track week number within each month
    if (!weekCountPerMonth[monthNumber]) {
      weekCountPerMonth[monthNumber] = 0;
    }
    weekCountPerMonth[monthNumber]++;
    const weekNumber = weekCountPerMonth[monthNumber];

    // Format date range: "7/14-7/18"
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    const weekDateRange = `${formatDate(weekStart)}-${formatDate(weekEnd)}`;

    weeks.push({
      residencyYear: year,
      monthNumber,
      weekNumber: Math.min(weekNumber, 5), // Cap at 5 weeks per month
      weekDateRange,
      weekStartDate: weekStart.toISOString().split('T')[0],
    });

    // Move to next Monday
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return weeks;
}

// GET - fetch weekly schedule entries (optionally filtered by year)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const generateIfEmpty = searchParams.get('generate') === 'true';

    const whereYear = year ? parseInt(year) : 1;
    const where = { residencyYear: whereYear };

    let entries = await prisma.aCVIMWeeklySchedule.findMany({
      where,
      orderBy: [{ monthNumber: 'asc' }, { weekNumber: 'asc' }],
    });

    // If no entries exist and generation requested, create them
    if (entries.length === 0 && generateIfEmpty) {
      // Get profile for start date
      const profile = await prisma.aCVIMProfile.findFirst();
      const startDate = profile?.programStartDate
        ? new Date(profile.programStartDate)
        : new Date('2025-07-14');

      const weeksToCreate = generateWeeksForYear(whereYear, startDate);

      // Create all weeks
      await prisma.aCVIMWeeklySchedule.createMany({
        data: weeksToCreate,
        skipDuplicates: true,
      });

      // Fetch the created entries
      entries = await prisma.aCVIMWeeklySchedule.findMany({
        where,
        orderBy: [{ monthNumber: 'asc' }, { weekNumber: 'asc' }],
      });
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching weekly schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

// POST - generate weeks for a year OR update a single entry
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // If action is "generate", create all weeks for a year
    if (data.action === 'generate') {
      const year = data.residencyYear || 1;
      const profile = await prisma.aCVIMProfile.findFirst();
      const startDate = profile?.programStartDate
        ? new Date(profile.programStartDate)
        : new Date('2025-07-14');

      const weeksToCreate = generateWeeksForYear(year, startDate);

      await prisma.aCVIMWeeklySchedule.createMany({
        data: weeksToCreate,
        skipDuplicates: true,
      });

      const entries = await prisma.aCVIMWeeklySchedule.findMany({
        where: { residencyYear: year },
        orderBy: [{ monthNumber: 'asc' }, { weekNumber: 'asc' }],
      });

      return NextResponse.json(entries);
    }

    // Validate hour fields
    const validation = validateWeeklyScheduleFields({
      clinicalNeurologyDirect: data.clinicalNeurologyDirect,
      clinicalNeurologyIndirect: data.clinicalNeurologyIndirect,
      neurosurgeryHours: data.neurosurgeryHours,
      radiologyHours: data.radiologyHours,
      neuropathologyHours: data.neuropathologyHours,
      clinicalPathologyHours: data.clinicalPathologyHours,
      electrodiagnosticsHours: data.electrodiagnosticsHours,
      journalClubHours: data.journalClubHours,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Upsert a single entry
    const entry = await prisma.aCVIMWeeklySchedule.upsert({
      where: {
        residencyYear_monthNumber_weekNumber: {
          residencyYear: data.residencyYear,
          monthNumber: data.monthNumber,
          weekNumber: data.weekNumber,
        },
      },
      update: {
        weekDateRange: data.weekDateRange,
        weekStartDate: data.weekStartDate,
        clinicalNeurologyDirect: data.clinicalNeurologyDirect,
        clinicalNeurologyIndirect: data.clinicalNeurologyIndirect,
        neurosurgeryHours: data.neurosurgeryHours,
        radiologyHours: data.radiologyHours,
        neuropathologyHours: data.neuropathologyHours,
        clinicalPathologyHours: data.clinicalPathologyHours,
        electrodiagnosticsHours: data.electrodiagnosticsHours,
        journalClubHours: data.journalClubHours,
        otherTime: data.otherTime,
        otherTimeDescription: data.otherTimeDescription,
        supervisingDiplomateName: data.supervisingDiplomateName,
      },
      create: {
        residencyYear: data.residencyYear,
        monthNumber: data.monthNumber,
        weekNumber: data.weekNumber,
        weekDateRange: data.weekDateRange || '',
        weekStartDate: data.weekStartDate || '',
        clinicalNeurologyDirect: data.clinicalNeurologyDirect,
        clinicalNeurologyIndirect: data.clinicalNeurologyIndirect,
        neurosurgeryHours: data.neurosurgeryHours,
        radiologyHours: data.radiologyHours,
        neuropathologyHours: data.neuropathologyHours,
        clinicalPathologyHours: data.clinicalPathologyHours,
        electrodiagnosticsHours: data.electrodiagnosticsHours,
        journalClubHours: data.journalClubHours,
        otherTime: data.otherTime,
        otherTimeDescription: data.otherTimeDescription,
        supervisingDiplomateName: data.supervisingDiplomateName,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving weekly schedule entry:', error);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

// DELETE - delete entry or clear year
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const year = searchParams.get('year');

    if (year) {
      // Delete all entries for a year
      await prisma.aCVIMWeeklySchedule.deleteMany({
        where: { residencyYear: parseInt(year) },
      });
      return NextResponse.json({ success: true, message: `Cleared year ${year}` });
    }

    if (id) {
      await prisma.aCVIMWeeklySchedule.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ID or year required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting weekly schedule entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
