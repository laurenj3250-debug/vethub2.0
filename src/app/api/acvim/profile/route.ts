import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - fetch profile (or create default)
export async function GET() {
  try {
    let profile = await prisma.aCVIMProfile.findFirst();

    if (!profile) {
      // Create default profile with July 14, 2025 start date
      profile = await prisma.aCVIMProfile.create({
        data: {
          residentName: '',
          programStartDate: '2025-07-14',
          supervisingDiplomateNames: [],
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching ACVIM profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT - update profile
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    let profile = await prisma.aCVIMProfile.findFirst();

    if (!profile) {
      // Create new profile
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
