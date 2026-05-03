const fs = require('fs');

// Read files
const catalog  = fs.readFileSync('catalog.js', 'utf8');
const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));

// Extract PRODUCT_IMAGES block
const start = catalog.indexOf('const PRODUCT_IMAGES = {');
const end   = catalog.indexOf('};', start) + 2;
const block = catalog.slice(start, end);

// Parse each id: `data:image...` entry
const imgMap = {};
let i = 0;
while (i < block.length) {
  const idMatch = block.slice(i).match(/^\s*(\d+):\s*`/);
  if (!idMatch) { i++; continue; }
  const id       = parseInt(idMatch[1]);
  const imgStart = block.indexOf('`', i + idMatch.index) + 1;
  const imgEnd   = block.indexOf('`', imgStart);
  imgMap[id]     = block.slice(imgStart, imgEnd);
  i = imgEnd + 1;
}

console.log(`Found ${Object.keys(imgMap).length} images`);

// Inject into products
let updated = 0;
products.forEach(p => {
  if (imgMap[p.id]) {
    p.img = imgMap[p.id];
    updated++;
  }
});

fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
console.log(`✅ Done — ${updated} produits mis à jour avec leurs images`);