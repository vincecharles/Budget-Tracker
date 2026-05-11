import fs from 'fs';

async function testAPI() {
  const token = 'Bearer session_usr_erika1_12345'; // The backend doesn't check the token timestamp, just the ID
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token
  };

  console.log("1. Creating Category...");
  const catRes = await fetch('https://erikatracker.netlify.app/api/categories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'cat_test_1',
      name: 'Test Category',
      icon: 'star',
      color: '#f472b6',
      budgeted: 5000
    })
  });
  console.log('Category Create:', catRes.status, await catRes.text());

  console.log("2. Creating Transaction...");
  const txnRes = await fetch('https://erikatracker.netlify.app/api/transactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'txn_test_1',
      type: 'expense',
      amount: 150,
      description: 'Test Expense',
      category_id: 'cat_test_1',
      date: new Date().toISOString()
    })
  });
  console.log('Transaction Create:', txnRes.status, await txnRes.text());

  console.log("3. Fetching Transactions...");
  const getRes = await fetch('https://erikatracker.netlify.app/api/transactions', { headers });
  console.log('Transactions:', await getRes.json());
}
testAPI();
