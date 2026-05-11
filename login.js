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

  const db = await getDB();
  const user = await db.collection('users').findOne({
    email: email.toLowerCase().trim(),
    password: crypto.createHash('sha256').update(password).digest('hex')
  });

  if (!user)
    return { statusCode: 401, body: JSON.stringify({ error: 'Email ou mot de passe incorrect' }) };

  return { statusCode: 200, body: JSON.stringify({ success: true, email: user.email, id: user.id }) };
};
