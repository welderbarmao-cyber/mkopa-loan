const { neon } = require('@neondatabase/serverless');
const { hash, compare } = require('bcryptjs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_Pr1jEkHof6Bz@ep-withered-union-aitxi1i2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const sql = neon(DATABASE_URL);
  const users = await sql`SELECT id, email, name, role, phone, password_hash FROM users WHERE email = 'admin@mkopa.com'`;
  console.log('Admin user in DB:', JSON.stringify(users, null, 2));
  
  // Test password compare
  if (users.length > 0) {
    const valid = await compare('Admin@123', users[0].password_hash);
    console.log('Password "Admin@123" matches hash:', valid);
  }
}
main().catch(console.error);
