import sql from './db.mjs';

export const handler = async (event) => {
  const method = event.httpMethod;
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const tokenMatch = authHeader.match(/Bearer session_([a-zA-Z0-9_]+)_/);
  const userId = tokenMatch ? tokenMatch[1] : 'usr_erika1';

  try {
    if (method === 'GET') {
      const categories = await sql`
        SELECT * FROM categories WHERE user_id = ${userId} ORDER BY created_at ASC
      `;
      return { statusCode: 200, body: JSON.stringify(categories) };
    }

    if (method === 'POST') {
      const { id, name, icon, color, budgeted } = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO categories (id, user_id, name, icon, color, budgeted)
        VALUES (${id}, ${userId}, ${name}, ${icon}, ${color}, ${budgeted})
        RETURNING *
      `;
      return { statusCode: 201, body: JSON.stringify(result[0]) };
    }

    if (method === 'PUT') {
      const { id, name, budgeted } = JSON.parse(event.body);
      const result = await sql`
        UPDATE categories 
        SET name = ${name}, budgeted = ${budgeted}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return { statusCode: 200, body: JSON.stringify(result[0]) };
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body);
      await sql`DELETE FROM categories WHERE id = ${id} AND user_id = ${userId}`;
      return { statusCode: 204 };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
