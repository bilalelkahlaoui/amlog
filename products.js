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
  const db = await getDB();
  const method = event.httpMethod;
  const adminPwd = event.headers['x-admin-password'];

  if (method === 'GET') {
    const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray();
    return { statusCode: 200, body: JSON.stringify(products) };
  }

  if (adminPwd !== 'amlog2026') {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  const body = JSON.parse(event.body || '{}');

  if (method === 'POST') {
    const last = await db.collection('products').find({}).sort({ id: -1 }).limit(1).toArray();
    const newId = last.length > 0 ? last[0].id + 1 : 1;
    const product = {
      id: newId,
      name: body.name || 'Nouveau produit',
      cat: body.cat || 'epicerie',
      emoji: body.emoji || '📦',
      img: body.img || ''
    };
    await db.collection('products').insertOne(product);
    return { statusCode: 201, body: JSON.stringify(product) };
  }

  const id = parseInt(event.path.split('/').pop());

  if (method === 'PUT') {
    const updated = await db.collection('products').findOneAndUpdate(
      { id },
      { $set: { ...body, id } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return { statusCode: 200, body: JSON.stringify(updated) };
  }

  if (method === 'DELETE') {
    await db.collection('products').deleteOne({ id });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
