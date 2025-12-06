import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateJournalClubHours } from '@/lib/acvim-validation';

// GET - fetch all journal club entries (optionally filtered by year)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const where = year ? { residencyYear: parseInt(year) } : {};

    const entries = await prisma.aCVIMJournalClub.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal club entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST - create new entry
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.date || !data.hours) {
      return NextResponse.json({ error: 'Missing required fields (date, hours)' }, { status: 400 });
    }

    // Validate hours (0.5 increments)
    const hoursValidation = validateJournalClubHours(data.hours);
    if (!hoursValidation.valid) {
      return NextResponse.json({ error: hoursValidation.errors.join(', ') }, { status: 400 });
    }

    const entry = await prisma.aCVIMJournalClub.create({
      data: {
        date: data.date,
        articleTitles: data.articleTitles || [],
        supervisingNeurologists: data.supervisingNeurologists || [],
        hours: data.hours,
        residencyYear: data.residencyYear || 1,
        notes: data.notes,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating journal club entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

// PUT - update existing entry
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    // Validate hours if provided (0.5 increments)
    if (data.hours !== undefined) {
      const hoursValidation = validateJournalClubHours(data.hours);
      if (!hoursValidation.valid) {
        return NextResponse.json({ error: hoursValidation.errors.join(', ') }, { status: 400 });
      }
    }

    const updated = await prisma.aCVIMJournalClub.update({
      where: { id: data.id },
      data: {
        date: data.date,
        articleTitles: data.articleTitles || [],
        supervisingNeurologists: data.supervisingNeurologists || [],
        hours: data.hours,
        residencyYear: data.residencyYear,
        notes: data.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating journal club entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE - delete entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await prisma.aCVIMJournalClub.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting journal club entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
