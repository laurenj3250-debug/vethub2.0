import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notes
 * Fetch all learning notes
 */
export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('[API] Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Create a new learning note
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        content: body.content.trim(),
        completed: false,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes
 * Update a note (toggle completed)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const existingNote = await prisma.note.findUnique({
      where: { id: body.id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const updatedNote = await prisma.note.update({
      where: { id: body.id },
      data: {
        content: body.content !== undefined ? body.content.trim() : undefined,
        completed: body.completed !== undefined ? body.completed : undefined,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('[API] Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes
 * Delete a note or clear all completed notes
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // If clearCompleted flag is set, delete all completed notes
    if (body.clearCompleted) {
      const result = await prisma.note.deleteMany({
        where: { completed: true },
      });

      return NextResponse.json({ success: true, deleted: result.count });
    }

    // Otherwise delete a single note by ID
    if (!body.id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const existingNote = await prisma.note.findUnique({
      where: { id: body.id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    await prisma.note.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
