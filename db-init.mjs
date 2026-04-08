import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const envFile = readFileSync('.env', 'utf-8');
    connectionString = envFile.split('DATABASE_URL="')[1].split('"')[0].trim();
  } catch(e) {
    console.error("Missing .env file.");
    process.exit(1);
  }
}

const sql = neon(connectionString);

async function migrate() {
  console.log("Setting up Neon Database Tables...");
  
  try {
    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        total_income NUMERIC(10, 2) DEFAULT 0,
        monthly_total NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Users table ready");

    // 2. Categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(255) NOT NULL,
        color VARCHAR(255) NOT NULL,
        budgeted NUMERIC(10, 2) DEFAULT 0,
        parent_group VARCHAR(255) DEFAULT 'Monthly Expenses',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Categories table ready");

    // 3. Transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Transactions table ready");

    // Pre-create Erika setup if it does not exist
    const userExist = await sql`SELECT id FROM users WHERE username = 'Erika'`;
    if (userExist.length === 0) {
      await sql`
        INSERT INTO users (id, username, password, total_income, monthly_total) 
        VALUES ('usr_erika1', 'Erika', 'Faye', 0, 0)
      `;
      console.log("✅ Pre-created Erika account");
    }

    console.log("Migration Complete! 🎉");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
