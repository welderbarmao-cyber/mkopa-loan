export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/dashboard', '/kyc/:path*', '/kyc', '/apply/:path*', '/apply', '/payment/:path*', '/payment'],
};
