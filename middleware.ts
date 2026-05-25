import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login and home routes
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, '/supplier');
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/supplier')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/supplier/:path*', '/admin', '/admin/:path*', '/login'],
};
