document.addEventListener("DOMContentLoaded", function() {

// ══════════════════════════════════════════════
//  cart.js — AMLOG Panier
//  Numéro WhatsApp — à changer ici :
// ══════════════════════════════════════════════
const WHATSAPP_NUMBER = "212663051820"; // ← Mettez votre vrai numéro ici

const CAT_LABELS_CART = {
  patisserie: "Pâtisserie",
  epicerie:   "Épicerie",
  biscuits:   "Biscuits & Snacking",
  boissons:   "Eau & Boissons",
  entretien:  "Entretien & Nettoyage",
  animaux:    "Animaux",
};

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("amlog_cart") || "[]");
    const clean = cart.filter(i => i && i.id && Number.isFinite(i.qty) && i.qty > 0);
    if (clean.length !== cart.length) localStorage.setItem("amlog_cart", JSON.stringify(clean));
    return clean;
  } catch(e) {
    localStorage.removeItem("amlog_cart");
    return [];
  }
}
function saveCart(cart) {
  localStorage.setItem("amlog_cart", JSON.stringify(cart));
  render();
}

function updateCartBadge() {
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartBadge");
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? "flex" : "none";
  }
}

function render() {
  const cart    = getCart();
  const empty   = document.getElementById("cartEmpty");
  const content = document.getElementById("cartContent");
  const list    = document.getElementById("cartList");
  const subEl   = document.getElementById("cartSub");
  const qtyEl   = document.getElementById("summaryQty");

  updateCartBadge();

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  if (cart.length === 0) {
    empty.style.display   = "block";
    content.style.display = "none";
    subEl.textContent     = "";
    return;
  }

  empty.style.display   = "none";
  content.style.display = "grid";
  subEl.textContent     = `${totalQty} article${totalQty > 1 ? "s" : ""} dans votre panier`;
  qtyEl.textContent     = totalQty;

  list.innerHTML = "";

  cart.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.style.animationDelay = `${idx * 40}ms`;

    const imgHTML = item.img
      ? `<img class="cart-item-img" src="${item.img}" alt="${item.name}">`
      : `<div class="cart-item-emoji">${item.emoji || "📦"}</div>`;

    div.innerHTML = `
      ${imgHTML}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <span class="cart-item-cat">${CAT_LABELS_CART[item.cat] || item.cat}</span>
      </div>
      <div class="cart-item-controls">
        <button class="ctrl-btn" data-action="minus" data-id="${item.id}">−</button>
        <span class="ctrl-qty">${item.qty}</span>
        <button class="ctrl-btn" data-action="plus" data-id="${item.id}">+</button>
        <button class="ctrl-remove" data-action="remove" data-id="${item.id}" title="Supprimer">✕</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Events
  list.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id     = parseInt(btn.dataset.id);
      const action = btn.dataset.action;
      const cart2  = getCart();
      const idx2   = cart2.findIndex(i => i.id === id);
      if (idx2 === -1) return;

      if (action === "plus")   cart2[idx2].qty++;
      if (action === "minus") {
        cart2[idx2].qty--;
        if (cart2[idx2].qty <= 0) cart2.splice(idx2, 1);
      }
      if (action === "remove") cart2.splice(idx2, 1);
      saveCart(cart2);
    });
  });
}

// WhatsApp
document.getElementById("btnWhatsapp").addEventListener("click", () => {
  const cart = getCart();
  if (cart.length === 0) return;

  let msg = "🛒 *Nouvelle commande AMLOG*\n\n";
  cart.forEach(item => {
    msg += `• ${item.qty}× ${item.name}\n`;
  });
  msg += `\n📦 Total : ${cart.reduce((s,i) => s+i.qty, 0)} article(s)`;
  msg += "\n\n🚚 Livraison Express 24-48h au Maroc";

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
});

// Vider
document.getElementById("btnClear").addEventListener("click", () => {
  if (confirm("Vider le panier ?")) {
    localStorage.removeItem("amlog_cart");
    render();
  }
});

// INIT
render();

});