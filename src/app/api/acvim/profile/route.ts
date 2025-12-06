import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - fetch profile (returns null if none exists - does NOT auto-create)
export async function GET() {
  try {
    const profile = await prisma.aCVIMProfile.findFirst();

    if (!profile) {
      // Return null instead of auto-creating - let the client handle setup
      return NextResponse.json(null);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching ACVIM profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST - create new profile (use this for initial setup)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Check if profile already exists
    const existing = await prisma.aCVIMProfile.findFirst();
    if (existing) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    const profile = await prisma.aCVIMProfile.create({
      data: {
        residentName: data.residentName || '',
        acvimCandidateId: data.acvimCandidateId,
        trainingFacility: data.trainingFacility,
        programStartDate: data.programStartDate || '2025-07-14',
        supervisingDiplomateNames: data.supervisingDiplomateNames || [],
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error creating ACVIM profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}

// PUT - update existing profile (or create if none exists - upsert behavior)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    let profile = await prisma.aCVIMProfile.findFirst();

    if (!profile) {
      // Create new profile if none exists
      profile = await prisma.aCVIMProfile.create({
        data: {
          residentName: data.residentName || '',
          acvimCandidateId: data.acvimCandidateId,
          trainingFacility: data.trainingFacility,
          programStartDate: data.programStartDate || '2025-07-14',
          supervisingDiplomateNames: data.supervisingDiplomateNames || [],
        },
      });
    } else {
      profile = await prisma.aCVIMProfile.update({
        where: { id: profile.id },
        data: {
          residentName: data.residentName,
          acvimCandidateId: data.acvimCandidateId,
          trainingFacility: data.trainingFacility,
          programStartDate: data.programStartDate,
          supervisingDiplomateNames: data.supervisingDiplomateNames || [],
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating ACVIM profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
