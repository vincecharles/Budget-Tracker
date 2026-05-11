export const handler = async (event) => {
  // Mock Database of common Philippine Grocery Prices (Estimated averages in PHP)
  const groceryPrices = {
    'rice': 55.00,
    'well-milled rice': 55.00,
    'egg': 8.50,
    'eggs': 100.00, // tray
    'milk': 95.00, // 1L
    'bread': 75.00, // loaf
    'tasty': 75.00,
    'onion': 120.00, // per kg
    'red onion': 120.00,
    'garlic': 140.00, // per kg
    'chicken': 220.00, // whole per kg
    'pork': 320.00, // per kg
    'beef': 450.00, // per kg
    'cooking oil': 90.00, // 1L
    'sugar': 85.00, // 1kg
    'salt': 25.00, // 1kg
    'soy sauce': 20.00,
    'vinegar': 20.00,
    'fish sauce': 25.00, // patis
    'coffee': 150.00, // instant
    'canned tuna': 45.00,
    'corned beef': 55.00,
    'sardines': 25.00,
    'noodles': 15.00, // instant
    'pancit canton': 18.00,
    'tomato paste': 35.00,
    'banana': 60.00, // per kg
    'apple': 25.00, // per piece
    'orange': 30.00, // per piece
    'potato': 110.00, // per kg
    'carrot': 100.00, // per kg
    'cabbage': 80.00, // per kg
    'tomato': 90.00, // per kg
    'bottled water': 20.00,
    'soda': 65.00, // 1.5L
    'beer': 55.00, // can
    'shampoo': 120.00,
    'soap': 45.00,
    'toothpaste': 95.00,
    'laundry detergent': 150.00, // powder
    'dishwashing liquid': 65.00,
    'tissue': 80.00 // 3-ply pack
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const query = event.queryStringParameters.q;
    if (!query) {
      return {
        statusCode: 200,
        body: JSON.stringify(groceryPrices)
      };
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Find matching items (exact or partial match)
    let bestMatch = null;
    let matchPrice = 0;

    for (const [item, price] of Object.entries(groceryPrices)) {
      if (item.includes(searchTerm) || searchTerm.includes(item)) {
        bestMatch = item;
        matchPrice = price;
        break; // take first match for simplicity
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        query: searchTerm,
        found: !!bestMatch,
        item: bestMatch,
        estimated_price: matchPrice
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
