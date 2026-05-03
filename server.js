const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_DB = path.join(__dirname, 'products.json');
const USERS_DB    = path.join(__dirname, 'users.json');

// ── Mot de passe admin
const ADMIN_PASSWORD = 'amlog2026';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function readProducts() {
  try { return JSON.parse(fs.readFileSync(PRODUCTS_DB, 'utf8')); }
  catch { return []; }
}
function writeProducts(data) {
  fs.writeFileSync(PRODUCTS_DB, JSON.stringify(data, null, 2), 'utf8');
}
function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_DB, 'utf8')); }
  catch { return []; }
}
function writeUsers(data) {
  fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 2), 'utf8');
}
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

// ══════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════

// POST /api/register — inscription
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

  const users = readUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  const user = {
    id:        Date.now(),
    email:     email.toLowerCase().trim(),
    password:  hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);

  res.status(201).json({ success: true, email: user.email });
});

// POST /api/login — connexion
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  const users = readUsers();
  const user  = users.find(u =>
    u.email === email.toLowerCase().trim() &&
    u.password === hashPassword(password)
  );

  if (!user)
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  res.json({ success: true, email: user.email, id: user.id });
});

// ══════════════════════════════════════════════
//  PRODUCTS ROUTES
// ══════════════════════════════════════════════

app.get('/api/products', (req, res) => {
  res.json(readProducts());
});

app.post('/api/products', (req, res) => {
  if (!adminCheck(req, res)) return;
  const products = readProducts();
  const newId    = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const product  = {
    id:    newId,
    name:  req.body.name  || 'Nouveau produit',
    cat:   req.body.cat   || 'epicerie',
    emoji: req.body.emoji || '📦',
    img:   req.body.img   || ''
  };
  products.push(product);
  writeProducts(products);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  const products = readProducts();
  const idx      = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Produit introuvable' });
  products[idx]  = { ...products[idx], ...req.body, id: products[idx].id };
  writeProducts(products);
  res.json(products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  if (!adminCheck(req, res)) return;
  let products   = readProducts();
  const before   = products.length;
  products       = products.filter(p => p.id !== parseInt(req.params.id));
  if (products.length === before) return res.status(404).json({ error: 'Produit introuvable' });
  writeProducts(products);
  res.json({ success: true });
});

// ── Start
app.listen(PORT, () => {
  console.log(`✅ AMLOG server      → http://localhost:${PORT}`);
  console.log(`🔐 Admin panel       → http://localhost:${PORT}/admin.html`);
});