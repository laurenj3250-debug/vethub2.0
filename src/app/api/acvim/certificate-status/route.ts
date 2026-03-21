import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

const SINGLETON_ID = 'neurosurg_cert_status';

// GET - fetch certificate status (upsert singleton if not exists)
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const status = await prisma.neurosurgeryCertStatus.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching certificate status:', error);
    return NextResponse.json({ error: 'Failed to fetch certificate status' }, { status: 500 });
  }
}

// PUT - update certificate status fields
export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const data = await request.json();

    // Only allow updating known fields
    const allowedFields = [
      'boardCertified', 'boardCertDate',
      'courseCompleted', 'courseDate', 'courseType',
      'rotationWeeksCompleted', 'rotationSupervisor', 'rotationSupervisorType', 'rotationDeclarationSigned',
      'targetApplicationDate', 'applicationSubmitted', 'applicationDate',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    const status = await prisma.neurosurgeryCertStatus.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...updateData },
      update: updateData,
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error updating certificate status:', error);
    return NextResponse.json({ error: 'Failed to update certificate status' }, { status: 500 });
  }
}
