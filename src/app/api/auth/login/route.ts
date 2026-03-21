import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Simple API key authentication for single-user app.
 * Accepts a password, checks it against RESIDENCY_API_KEY,
 * and sets an httpOnly cookie for browser-based auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESIDENCY_API_KEY;

    // If no API key is configured, skip auth (dev/unconfigured)
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        message: 'No API key configured — auth disabled',
      });
    }

    if (password !== apiKey) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Set httpOnly cookie with the API key
    const response = NextResponse.json({
      success: true,
      message: 'Authenticated',
    });

    response.cookies.set('residency-api-key', apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error('[API] Error in login:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
