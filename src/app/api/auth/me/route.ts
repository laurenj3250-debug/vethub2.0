import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/me
 *
 * Returns current user information based on the Authorization header.
 * Since this is a simple auth implementation without a User model,
 * we decode the token and return mock user data.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Decode the token (format: base64(email:timestamp))
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const email = decoded.split(':')[0];

      return NextResponse.json({
        user: {
          email,
          name: email.split('@')[0],
          id: 'default-user',
        },
      });
    } catch (decodeError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[API] Error in get current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
