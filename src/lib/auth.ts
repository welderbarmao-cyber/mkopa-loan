import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

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

        const rows = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
        const user = rows[0];
        if (!user) return null;

        // Allow both admin and customer login
        // Customers registered via /signup have proper bcrypt hashes
        // Legacy customers with 'customer-no-login' cannot use password auth
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || undefined,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      // Persist role and phone in the JWT on sign in
      if (user) {
        token.role = (user as { role?: string }).role;
        token.phone = (user as { phone?: string }).phone;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role and phone to the client session
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { phone?: string }).phone = token.phone as string;
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
};
