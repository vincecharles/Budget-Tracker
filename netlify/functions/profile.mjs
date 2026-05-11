import sql from './db.mjs';

export const handler = async (event) => {
  const method = event.httpMethod;
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const tokenMatch = authHeader.match(/Bearer session_([a-zA-Z0-9_]+)_/);
  const userId = tokenMatch ? tokenMatch[1] : 'usr_erika1';

  try {
    if (method === 'GET') {
      const user = await sql`SELECT id, username, total_income, monthly_total FROM users WHERE id = ${userId}`;
      return { statusCode: 200, body: JSON.stringify(user[0]) };
    }

    if (method === 'PUT') {
      const { total_income, monthly_total } = JSON.parse(event.body);
      const result = await sql`
        UPDATE users 
        SET total_income = ${total_income}, monthly_total = ${monthly_total}
        WHERE id = ${userId}
        RETURNING id, username, total_income, monthly_total
      `;
      return { statusCode: 200, body: JSON.stringify(result[0]) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
