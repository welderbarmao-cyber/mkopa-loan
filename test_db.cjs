const { neon } = require('@neondatabase/serverless');

async function main() {
  // Try multiple URL variations
  const urls = [
    'postgresql://neondb_owner:npg_Pr1jEkHof6Bz@ep-withered-union-aitxi1i2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_Pr1jEkHof6Bz@ep-withered-union-aitxi1i2.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ];
  
  for (const url of urls) {
    console.log('\nTrying URL pattern...');
    try {
      const sql = neon(url);
      const result = await sql`SELECT current_database(), current_user, NOW()`;
      console.log('SUCCESS:', JSON.stringify(result));
      
      // List tables
      const tables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      console.log('Tables:', JSON.stringify(tables));
      
      // Try counting users
      try {
        const count = await sql`SELECT COUNT(*) FROM users`;
        console.log('User count:', count);
      } catch (e) {
        console.log('Users table error:', e.message);
      }
      break;
    } catch (e) {
      console.log('Failed:', e.message);
    }
  }
}
main().catch(console.error);
