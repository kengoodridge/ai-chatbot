import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';

// Create a modified config that explicitly trusts all hosts for Docker compatibility
const configWithTrustedHost = {
  ...authConfig,
  trustHost: true,
};

export default NextAuth(configWithTrustedHost).auth;

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};
