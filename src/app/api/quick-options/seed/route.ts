import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { quickInsertLibrary } from '@/data/quick-insert-library';

/**
 * POST /api/quick-options/seed
 * Seed the database with default quick insert options from the library.
 * Only adds options that don't already exist (by label + category + field).
 */
export async function POST() {
  try {
    // Check current count
    const existingCount = await prisma.quickInsertOption.count();

    if (existingCount > 0) {
      // Get existing options to check for duplicates
      const existing = await prisma.quickInsertOption.findMany({
        select: { label: true, category: true, field: true },
      });

      // Create a Set of existing keys for fast lookup
      const existingKeys = new Set(
        existing.map((e: { label: string; category: string; field: string }) => `${e.label}|${e.category}|${e.field}`)
      );

      // Filter to only new options
      const newOptions = quickInsertLibrary.filter(
        (item) => !existingKeys.has(`${item.label}|${item.category}|${item.field}`)
      );

      if (newOptions.length === 0) {
        return NextResponse.json({
          message: 'All options already exist',
          existingCount,
          addedCount: 0,
        });
      }

      // Add only new options
      const created = await prisma.quickInsertOption.createMany({
        data: newOptions.map((item) => ({
          trigger: item.trigger || null,
          label: item.label,
          text: item.text,
          category: item.category,
          field: item.field,
          isDefault: true,
        })),
      });

      return NextResponse.json({
        message: `Added ${created.count} new options`,
        existingCount,
        addedCount: created.count,
      });
    }

    // First time seeding - add all default options
    const created = await prisma.quickInsertOption.createMany({
      data: quickInsertLibrary.map((item) => ({
        trigger: item.trigger || null,
        label: item.label,
        text: item.text,
        category: item.category,
        field: item.field,
        isDefault: true,
      })),
    });

    return NextResponse.json({
      message: `Seeded ${created.count} default options`,
      existingCount: 0,
      addedCount: created.count,
    });
  } catch (error) {
    console.error('[API] Error seeding quick options:', error);
    return NextResponse.json(
      { error: 'Failed to seed quick options' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quick-options/seed
 * Reset to defaults by deleting all user-added options (keeps isDefault=true)
 * Or pass ?all=true to delete everything
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const deleteAll = url.searchParams.get('all') === 'true';

    if (deleteAll) {
      // Delete everything
      const deleted = await prisma.quickInsertOption.deleteMany({});
      return NextResponse.json({
        message: `Deleted all ${deleted.count} options`,
        deletedCount: deleted.count,
      });
    }

    // Delete only user-added options
    const deleted = await prisma.quickInsertOption.deleteMany({
      where: { isDefault: false },
    });

    return NextResponse.json({
      message: `Deleted ${deleted.count} user-added options`,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error('[API] Error resetting quick options:', error);
    return NextResponse.json(
      { error: 'Failed to reset quick options' },
      { status: 500 }
    );
  }
}
