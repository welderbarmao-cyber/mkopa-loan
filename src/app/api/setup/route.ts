import { NextResponse } from 'next/server';
import { initializeDatabase, findUserByEmail, createUser, updateUserPassword } from '@/lib/edge-db';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    // Initialize the database (creates empty arrays if needed)
    await initializeDatabase();

    // Check if admin exists, create or reset password
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
      await updateUserPassword('admin@mkopa.com', adminHash);
    }

    // Verify admin
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
