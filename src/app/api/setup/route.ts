import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "password_hash" TEXT NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'customer',
        "phone" VARCHAR(20),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create loans table
    await sql`
      CREATE TABLE IF NOT EXISTS "loans" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "amount" INTEGER NOT NULL,
        "term_months" INTEGER NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "product_type" VARCHAR(50) NOT NULL,
        "purpose" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create kyc_uploads table
    await sql`
      CREATE TABLE IF NOT EXISTS "kyc_uploads" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "document_type" VARCHAR(30) NOT NULL,
        "r2_key" TEXT NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "reviewed_at" TIMESTAMP
      )
    `;

    // Check if admin exists
    const existing = await sql`SELECT id FROM users WHERE email = 'admin@mkopa.com'`;
    if (existing.length === 0) {
      const adminHash = await hash('Admin@123', 12);
      await sql`
        INSERT INTO "users" ("email", "name", "password_hash", "role", "phone")
        VALUES ('admin@mkopa.com', 'Super Admin', ${adminHash}, 'admin', '+254700000001')
      `;
    } else {
      // Reset admin password to known value
      const adminHash = await hash('Admin@123', 12);
      await sql`UPDATE users SET password_hash = ${adminHash} WHERE email = 'admin@mkopa.com'`;
    }

    // Verify admin
    const admin = await sql`SELECT id, email, name, role, phone FROM users WHERE email = 'admin@mkopa.com'`;

    return NextResponse.json({
      success: true,
      message: 'Database setup complete',
      admin: admin[0],
      credentials: {
        email: 'admin@mkopa.com',
        password: 'Admin@123',
        loginUrl: '/login'
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
