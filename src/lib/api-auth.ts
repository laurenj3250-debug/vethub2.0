import { NextRequest, NextResponse } from 'next/server';

// Simple API key auth for single-user app
// Set RESIDENCY_API_KEY in environment variables
export function requireAuth(request: NextRequest): NextResponse | null {
  // Skip auth in development
  if (process.env.NODE_ENV === 'development') return null;

  // Check for API key in cookie or Authorization header
  const apiKey = request.cookies.get('residency-api-key')?.value ||
                 request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey || apiKey !== process.env.RESIDENCY_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth passed
}
