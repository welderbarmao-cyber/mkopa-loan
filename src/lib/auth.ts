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
        if (!credentials?.email || !credentials?.password) {
          console.log('[auth] Missing email or password');
          return null;
        }

        try {
          const user = await findUserByEmail(credentials.email);
          if (!user) {
            console.log(
              '[auth] User not found for:',
              credentials.email
            );
            return null;
          }

          // Validate the hash format before comparing
          if (
            !user.passwordHash ||
            !user.passwordHash.startsWith('$2b$') ||
            user.passwordHash.length < 50
          ) {
            console.log(
              '[auth] Invalid hash format for',
              credentials.email,
              '- hash starts with:',
              user.passwordHash
                ? user.passwordHash.substring(0, 20)
                : 'EMPTY'
            );
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.log('[auth] Password mismatch for:', credentials.email);
            return null;
          }

          console.log('[auth] Login success for:', credentials.email);
          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone || undefined,
          };
        } catch (e) {
          console.log(
            '[auth] Error for',
            credentials.email,
            ':',
            e instanceof Error ? e.message : 'unknown'
          );
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
