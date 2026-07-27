import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/* Khoá toàn trang khi đã cấu hình OAuth; chưa cấu hình thì mở như cũ. */

const PUBLIC_PREFIXES = ['/dang-nhap', '/api/auth'];

export async function middleware(req) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.NEXTAUTH_SECRET) {
    return NextResponse.next();
  }
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/dang-nhap', req.url);
    if (pathname && pathname !== '/') url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
