import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function dbQuery(strings, ...values) {
  try {
    return await sql(strings, ...values);
  } catch (err) {
    console.error('Database Error:', err);
    throw err;
  }
}

export default sql;
