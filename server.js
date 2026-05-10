const express = require('express');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');
const { MongoClient } = require('mongodb');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI    = process.env.MONGODB_URI;
const ADMIN_PASSWORD = 'amlog2026';

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('amlog');
  console.log('✅ MongoDB connected');
}

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}
function adminCheck(req, res) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Non autorisé' });
    return false;
  }
  return true;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

  const users = db.collection('users');
  const exists = await users.findOne({ email: email.toLowerCase().trim() });
  if (exists)
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  const user = {
    id:        Date.now(),
    email:     email.toLowerCase().trim(),
    password:  hashPassword(password),
    createdAt: new Date().toISOString()
  };
  await users.insertOne(user);
  res.status(201).json({ success: true, email: user.email });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  const users = db.collection('users');
  const user  = await users.findOne({
    email:    email.toLowerCase().trim(),
    password: hashPassword(password)
  });

  if (!user)
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  res.json({ success: true, email: user.email, id: user.id });
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray();
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const products = db.collection('products');
  const last     = await products.find({}).sort({ id: -1 }).limit(1).toArray();
  const newId    = last.length > 0 ? last[0].id + 1 : 1;
  const product  = {
    id:    newId,
    name:  req.body.name  || 'Nouveau produit',
    cat:   req.body.cat   || 'epicerie',
    emoji: req.body.emoji || '📦',
    img:   req.body.img   || ''
  };
  await products.insertOne(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const products = db.collection('products');
  const id       = parseInt(req.params.id);
  const updated  = await products.findOneAndUpdate(
    { id },
    { $set: { ...req.body, id } },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  if (!updated)
    return res.status(404).json({ error: 'Produit introuvable' });
  res.json(updated);
});

app.delete('/api/products/:id', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const result = await db.collection('products').deleteOne({ id: parseInt(req.params.id) });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: 'Produit introuvable' });
  res.json({ success: true });
});

// ─── START ────────────────────────────────────────────────────────────────────

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ AMLOG server  → http://localhost:${PORT}`);
    console.log(`🔐 Admin panel   → http://localhost:${PORT}/admin.html`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});
