import sql from './db.mjs';

export const handler = async (event) => {
  const method = event.httpMethod;
  const userId = 'usr_erika1';

  try {
    if (method === 'GET') {
      const transactions = await sql`
        SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY date DESC
      `;
      return { statusCode: 200, body: JSON.stringify(transactions) };
    }

    if (method === 'POST') {
      const { id, type, amount, description, category_id, date } = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO transactions (id, user_id, type, amount, description, category_id, date)
        VALUES (${id}, ${userId}, ${type}, ${amount}, ${description}, ${category_id}, ${date})
        RETURNING *
      `;
      return { statusCode: 201, body: JSON.stringify(result[0]) };
    }

    if (method === 'PUT') {
      const { id, type, amount, description, category_id, date } = JSON.parse(event.body);
      const result = await sql`
        UPDATE transactions 
        SET type = ${type}, amount = ${amount}, description = ${description}, 
            category_id = ${category_id}, date = ${date}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return { statusCode: 200, body: JSON.stringify(result[0]) };
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body);
      await sql`DELETE FROM transactions WHERE id = ${id} AND user_id = ${userId}`;
      return { statusCode: 204 };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
