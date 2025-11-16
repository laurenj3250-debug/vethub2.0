import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/register
 *
 * Simple registration endpoint for VetHub.
 * Since this is a single-practice veterinary app without a User model in the schema,
 * we provide a simple auth flow that accepts any credentials.
 *
 * In a production environment, this would be replaced with proper authentication
 * using NextAuth.js or similar, with a User model in the database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For now, accept any credentials and return a mock token
    // This allows the app to function without a full auth system
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      token,
      user: {
        email,
        name: email.split('@')[0],
        id: 'default-user',
      },
    });
  } catch (error) {
    console.error('[API] Error in registration:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
