const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
let db;

async function getDB() {
  if (!db) {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('amlog');
  }
  return db;
}


exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const db = await getDB();

    const method = event.httpMethod;
    const adminPwd = event.headers['x-admin-password'];

    // ─── GET: rjj3 tous les produits ───────────────────────────────
    if (method === 'GET') {
      const products = await db
        .collection('products')
        .find({}, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      return { statusCode: 200, headers, body: JSON.stringify(products) };
    }

    // ─── Routes li khassoum admin password ────────────────────────
    if (adminPwd !== 'amlog2026') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Non autorisé' })
      };
    }

    const body = JSON.parse(event.body || '{}');

    // ─── POST: zid produit jdid ────────────────────────────────────
    if (method === 'POST') {
      const last = await db
        .collection('products')
        .find({})
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      const newId = last.length > 0 ? last[0].id + 1 : 1;

      const product = {
        id: newId,
        name: body.name || 'Nouveau produit',
        cat: body.cat || 'epicerie',
        emoji: body.emoji || '📦',
        img: body.img || ''
      };

      await db.collection('products').insertOne(product);
      return { statusCode: 201, headers, body: JSON.stringify(product) };
    }

    // ─── PUT / DELETE: get id mn l'URL ─────────────────────────────
    const pathParts = event.path.split('/').filter(Boolean);
    const id = parseInt(pathParts[pathParts.length - 1]);

    if (isNaN(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID invalide' })
      };
    }

    // ─── PUT: bdl produit ──────────────────────────────────────────
    if (method === 'PUT') {
      const updated = await db.collection('products').findOneAndUpdate(
        { id },
        { $set: { ...body, id } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      if (!updated) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Produit non trouvé' })
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    // ─── DELETE: mh produit ────────────────────────────────────────
    if (method === 'DELETE') {
      await db.collection('products').deleteOne({ id });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  } catch (err) {
    console.error('Products function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur', details: err.message })
    };
  }
};
