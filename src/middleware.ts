import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow login page, API routes, Next.js internals, and static assets
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // If no API key configured, skip auth entirely
  if (!process.env.RESIDENCY_API_KEY) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const apiKey = request.cookies.get('residency-api-key')?.value;

  if (!apiKey || apiKey !== process.env.RESIDENCY_API_KEY) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
