import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      phone: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    phone?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    phone?: string;
    userId?: string;
  }
}
