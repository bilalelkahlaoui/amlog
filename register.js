const { MongoClient } = require('mongodb');
const crypto = require('crypto');

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password } = JSON.parse(event.body || '{}');

  if (!email || !password)
    return { statusCode: 400, body: JSON.stringify({ error: 'Email et mot de passe requis' }) };
  if (password.length < 6)
    return { statusCode: 400, body: JSON.stringify({ error: 'Mot de passe trop court (min 6 caractères)' }) };

  const db = await getDB();
  const exists = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (exists)
    return { statusCode: 409, body: JSON.stringify({ error: 'Cet email est déjà utilisé' }) };

  const user = {
    id: Date.now(),
    email: email.toLowerCase().trim(),
    password: crypto.createHash('sha256').update(password).digest('hex'),
    createdAt: new Date().toISOString()
  };

  await db.collection('users').insertOne(user);
  return { statusCode: 201, body: JSON.stringify({ success: true, email: user.email }) };
};
