import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as fs from 'fs';
import * as path from 'path';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  // Ensure DATABASE_URL is used for the database location
  const dbUrl = process.env.DATABASE_URL || 'file:./local.db';
  console.log(`Using database URL: ${dbUrl}`);
  
  const client = createClient({
    url: dbUrl,
  });
  const db = drizzle(client);

  console.log('⏳ Running migrations...');
  const start = Date.now();

  try {
    // Get all SQL files in migrations-sqlite directory
    const migrationsDir = path.join(process.cwd(), 'lib/db/migrations-sqlite');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`Found migration files: ${migrationFiles.join(', ')}`);
    
    // Process each migration file
    for (const migrationFile of migrationFiles) {
      console.log(`Processing migration file: ${migrationFile}`);
      const sqlFile = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      // Split statements at statement-breakpoint
      const statements = sql.split('--> statement-breakpoint').map(stmt => stmt.trim()).filter(Boolean);
      
      // Execute each statement
      for (const statement of statements) {
        await client.execute(statement);
        console.log(`✓ Executed statement from ${migrationFile}`);
      }
    }

    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  }
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
