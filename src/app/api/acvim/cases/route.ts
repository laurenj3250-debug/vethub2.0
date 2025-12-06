import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - fetch all cases (optionally filtered by year)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const where = year ? { residencyYear: parseInt(year) } : {};

    const cases = await prisma.aCVIMNeurosurgeryCase.findMany({
      where,
      orderBy: { dateCompleted: 'desc' },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }
}

// POST - create new case
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.procedureName || !data.dateCompleted || !data.caseIdNumber || !data.role || !data.hours) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!['Primary', 'Assistant'].includes(data.role)) {
      return NextResponse.json({ error: 'Role must be "Primary" or "Assistant"' }, { status: 400 });
    }

    // Validate hours (0.25 increments)
    if (data.hours <= 0 || (data.hours * 4) % 1 !== 0) {
      return NextResponse.json({ error: 'Hours must be in 0.25 increments' }, { status: 400 });
    }

    const newCase = await prisma.aCVIMNeurosurgeryCase.create({
      data: {
        procedureName: data.procedureName,
        dateCompleted: data.dateCompleted,
        caseIdNumber: data.caseIdNumber,
        role: data.role,
        hours: data.hours,
        residencyYear: data.residencyYear || 1,
        notes: data.notes,
        patientId: data.patientId,
        patientName: data.patientName,
        patientInfo: data.patientInfo,
      },
    });

    return NextResponse.json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }
}

// PUT - update case
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: 'Case ID required' }, { status: 400 });
    }

    const updated = await prisma.aCVIMNeurosurgeryCase.update({
      where: { id: data.id },
      data: {
        procedureName: data.procedureName,
        dateCompleted: data.dateCompleted,
        caseIdNumber: data.caseIdNumber,
        role: data.role,
        hours: data.hours,
        residencyYear: data.residencyYear,
        notes: data.notes,
        patientId: data.patientId,
        patientName: data.patientName,
        patientInfo: data.patientInfo,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
  }
}

// DELETE - delete case
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Case ID required' }, { status: 400 });
    }

    await prisma.aCVIMNeurosurgeryCase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
  }
}
