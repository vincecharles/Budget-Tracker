import sql from './db.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    // Direct match for Erika project
    const users = await sql`
      SELECT id, username, total_income, monthly_total 
      FROM users 
      WHERE LOWER(username) = LOWER(${username}) AND password = ${password}
    `;

    if (users.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: users[0],
        token: `session_${users[0].id}_${Date.now()}` // Basic token for session
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
