import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';

const DATABASE_URL = 'postgresql://neondb_owner:npg_Pr1jEkHof6Bz@ep-withered-union-aitxi1i2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const sql = neon(DATABASE_URL);

  // Drop existing tables if they conflict (careful in production!)
  console.log('Dropping old tables...');
  await sql`DROP TABLE IF EXISTS "kyc_uploads" CASCADE`;
  await sql`DROP TABLE IF EXISTS "loans" CASCADE`;
  await sql`DROP TABLE IF EXISTS "users" CASCADE`;
  
  // Drop old Prisma tables too
  await sql`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE`;
  await sql`DROP TABLE IF EXISTS "RolePermission" CASCADE`;
  await sql`DROP TABLE IF EXISTS "UserRole" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Permission" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Role" CASCADE`;
  await sql`DROP TABLE IF EXISTS "RepaymentSchedule" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Payment" CASCADE`;
  await sql`DROP TABLE IF EXISTS "LoanApplication" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Loan" CASCADE`;
  await sql`DROP TABLE IF EXISTS "KycDocument" CASCADE`;
  await sql`DROP TABLE IF EXISTS "CreditScore" CASCADE`;
  await sql`DROP TABLE IF EXISTS "AuditLog" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Notification" CASCADE`;
  await sql`DROP TABLE IF EXISTS "LoanProduct" CASCADE`;
  await sql`DROP TABLE IF EXISTS "User" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Account" CASCADE`;
  await sql`DROP TABLE IF EXISTS "Session" CASCADE`;
  await sql`DROP TABLE IF EXISTS "VerificationToken" CASCADE`;

  console.log('Creating users table...');
  await sql`
    CREATE TABLE "users" (
      "id" SERIAL PRIMARY KEY,
      "email" VARCHAR(255) UNIQUE NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "password_hash" TEXT NOT NULL,
      "role" VARCHAR(20) NOT NULL DEFAULT 'customer',
      "phone" VARCHAR(20),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Creating loans table...');
  await sql`
    CREATE TABLE "loans" (
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

  console.log('Creating kyc_uploads table...');
  await sql`
    CREATE TABLE "kyc_uploads" (
      "id" SERIAL PRIMARY KEY,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "document_type" VARCHAR(30) NOT NULL,
      "r2_key" TEXT NOT NULL,
      "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
      "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "reviewed_at" TIMESTAMP
    )
  `;

  // Seed admin user
  console.log('Creating admin user...');
  const adminHash = await hash('Admin@123', 8);
  await sql`
    INSERT INTO "users" ("email", "name", "password_hash", "role", "phone")
    VALUES ('admin@mkopa.com', 'Super Admin', ${adminHash}, 'admin', '+254700000001')
  `;

  // Also seed a test customer
  const customerHash = await hash('Customer@123', 8);
  await sql`
    INSERT INTO "users" ("email", "name", "password_hash", "role", "phone")
    VALUES ('customer1@example.com', 'Amina Wanjiku', ${customerHash}, 'customer', '+2547100000001')
  `;

  console.log('✅ Database schema created and seeded!');
  console.log('Admin: admin@mkopa.com / Admin@123');
  console.log('Customer: customer1@example.com / Customer@123');
}

main().catch(e => { console.error(e); process.exit(1); });
