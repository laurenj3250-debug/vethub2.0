import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/rounds-sheets?date=2026-03-17
// Returns the saved sheet for a given date, or the most recent one
export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date');

    if (date) {
      const sheet = await prisma.savedRoundsSheet.findUnique({ where: { date } });
      if (!sheet) return NextResponse.json(null);
      return NextResponse.json(sheet);
    }

    // No date specified — return most recent sheet (within last 48h)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const sheet = await prisma.savedRoundsSheet.findFirst({
      where: { updatedAt: { gte: cutoff } },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sheet);
  } catch (error) {
    console.error('[API] Error fetching rounds sheet:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds sheet' }, { status: 500 });
  }
}

// POST /api/rounds-sheets
// Upserts a sheet for the given date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.date || !body.patients) {
      return NextResponse.json({ error: 'Missing date or patients' }, { status: 400 });
    }

    const sheet = await prisma.savedRoundsSheet.upsert({
      where: { date: body.date },
      create: {
        date: body.date,
        patients: body.patients,
        settings: body.settings || null,
      },
      update: {
        patients: body.patients,
        settings: body.settings || null,
      },
    });

    return NextResponse.json(sheet, { status: 201 });
  } catch (error) {
    console.error('[API] Error saving rounds sheet:', error);
    return NextResponse.json({ error: 'Failed to save rounds sheet' }, { status: 500 });
  }
}

// DELETE /api/rounds-sheets?date=2026-03-17
// Deletes a saved sheet
export async function DELETE(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    await prisma.savedRoundsSheet.deleteMany({ where: { date } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting rounds sheet:', error);
    return NextResponse.json({ error: 'Failed to delete rounds sheet' }, { status: 500 });
  }
}
