import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { findUserByEmail } from './edge-db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await findUserByEmail(credentials.email);
          if (!user) {
            console.log('Login failed: user not found for', credentials.email);
            return null;
          }

          // Check if passwordHash is valid
          if (!user.passwordHash || !user.passwordHash.startsWith('$2b$')) {
            console.log('Login failed: invalid hash for', credentials.email, '- hash:', user.passwordHash?.substring(0, 20));
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.log('Login failed: password mismatch for', credentials.email);
            return null;
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone || undefined,
          };
        } catch (e) {
          console.log('Login error for', credentials.email, ':', e instanceof Error ? e.message : 'unknown');
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.phone = (user as { phone?: string }).phone;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { phone?: string }).phone = token.phone as string;
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
};
