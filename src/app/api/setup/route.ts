import { NextResponse } from 'next/server';
import { initializeDatabase, findUserByEmail, createUser, updateUser } from '@/lib/edge-db';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    await initializeDatabase();

    const admin = await findUserByEmail('admin@mkopa.com');
    if (!admin) {
      const adminHash = await hash('Admin@123', 12);
      await createUser({
        email: 'admin@mkopa.com',
        name: 'Super Admin',
        phone: '+254700000001',
        passwordHash: adminHash,
        role: 'admin',
      });
    } else {
      // Reset admin password to known value
      const adminHash = await hash('Admin@123', 12);
      await updateUser('admin@mkopa.com', { passwordHash: adminHash });
    }

    const verifiedAdmin = await findUserByEmail('admin@mkopa.com');

    return NextResponse.json({
      success: true,
      message: 'Database setup complete',
      admin: verifiedAdmin ? {
        id: verifiedAdmin.id,
        email: verifiedAdmin.email,
        name: verifiedAdmin.name,
        role: verifiedAdmin.role,
        phone: verifiedAdmin.phone,
      } : null,
      credentials: {
        email: 'admin@mkopa.com',
        password: 'Admin@123',
        loginUrl: '/login',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
