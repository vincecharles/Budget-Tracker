import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.split('DATABASE_URL="')[1].split('"')[0].trim();
const sql = neon(url);

async function check() {
  console.log('--- USERS ---');
  console.log(await sql`SELECT id, username, total_income, monthly_total FROM users`);
  console.log('--- CATEGORIES ---');
  console.log(await sql`SELECT * FROM categories`);
  console.log('--- TRANSACTIONS ---');
  console.log(await sql`SELECT * FROM transactions`);
}
check();
