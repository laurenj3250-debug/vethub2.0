import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/rounds-sessions — list all saved sessions
export async function GET() {
  try {
    const sessions = await prisma.roundsSession.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true,
        // Include patient count from the JSON array
        patients: true,
      },
    });

    // Add patient count for display
    const result = sessions.map(s => ({
      id: s.id,
      name: s.name,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
      patientCount: Array.isArray(s.patients) ? (s.patients as unknown[]).length : 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch rounds sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/rounds-sessions — create or update a session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, patients, settings } = body;

    if (!patients || !Array.isArray(patients)) {
      return NextResponse.json({ error: 'patients must be an array' }, { status: 400 });
    }

    if (id) {
      // Update existing session
      const updated = await prisma.roundsSession.update({
        where: { id },
        data: {
          name: name || 'Neurology Rounds',
          patients,
          settings: settings || {},
        },
      });
      return NextResponse.json(updated);
    } else {
      // Create new session
      const created = await prisma.roundsSession.create({
        data: {
          name: name || 'Neurology Rounds',
          patients,
          settings: settings || {},
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to save rounds session:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
