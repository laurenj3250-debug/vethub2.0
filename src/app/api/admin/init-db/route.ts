import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/admin/init-db
 * Manually initialize database tables
 * This endpoint runs `prisma db push` to create/update database schema
 */
export async function POST() {
  try {
    console.log('[Admin] Starting database initialization...');

    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate');

    console.log('[Admin] Prisma db push stdout:', stdout);
    if (stderr) {
      console.log('[Admin] Prisma db push stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      output: stdout,
      warnings: stderr || null,
    });
  } catch (error: any) {
    console.error('[Admin] Database initialization failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize database',
        details: error.message,
        stdout: error.stdout || null,
        stderr: error.stderr || null,
      },
      { status: 500 }
    );
  }
}
