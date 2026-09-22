const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXBCsirH7pbFo-bLF0c-OzPb0SNS7BTNaexePNlFf8-sbayo_eWPiOyjPS-CvwJoXUPA/exec";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

let products = [];
const cart = {};

const money = n => Number(n || 0).toLocaleString("uk-UA") + " Ft";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const catalog = document.getElementById("catalog");

  // Remember which categories are open before rebuilding the catalog.
  const openCategories = new Set(
    [...catalog.querySelectorAll("details.category[open]")].map(d => d.dataset.category)
  );

  catalog.innerHTML = "";

  if (!products.length) {
    catalog.innerHTML = '<div class="loading">Завантажуємо товари…</div>';
    renderCart();
    return;
  }

  const groups = [...new Set(products.map(p => p.category || "Інше"))];

  groups.forEach((cat, index) => {
    const details = document.createElement("details");
    details.className = "category";
    details.dataset.category = cat;
    details.open = openCategories.has(cat) || (openCategories.size === 0 && index === 0);

    const summary = document.createElement("summary");
    summary.textContent = cat;
    details.appendChild(summary);

    const productsWrap = document.createElement("div");
    productsWrap.className = "category-products";

    products.filter(p => (p.category || "Інше") === cat).forEach(p => {
      const d = document.createElement("div");
      d.className = "product";
      const q = cart[p.id] || 0;
      const photo = p.photo ? `<img src="${escapeHtml(p.photo)}" alt="" class="product-photo">` : "";
      const description = p.description ? `<div class="description">${escapeHtml(p.description)}</div>` : "";

      d.innerHTML = `
        ${photo}
        <h3>${escapeHtml(p.name)}</h3>
        ${description}
        <div class="price">${money(p.price)} ${!p.available ? "— немає в наявності" : ""}</div>
        <div class="controls">
          <button ${!p.available ? "disabled" : ""} onclick="change(${JSON.stringify(p.id)},-1)">−</button>
          <span class="qty">${q}</span>
          <button ${!p.available ? "disabled" : ""} onclick="change(${JSON.stringify(p.id)},1)">+</button>
        </div>`;
      productsWrap.appendChild(d);
    });

    details.appendChild(productsWrap);
    catalog.appendChild(details);
  });

  renderCart();
}

function change(id, delta) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product || !product.available) return;
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (cart[id] === 0) delete cart[id];
  render();
}

function renderCart() {
  const el = document.getElementById("cartItems");
  const selected = products.filter(p => cart[p.id]);

  el.innerHTML = selected.length
    ? selected.map(p => `<div class="cartrow"><span>${escapeHtml(p.name)} × ${cart[p.id]}</span><span>${money(p.price * cart[p.id])}</span></div>`).join("")
    : "Кошик порожній";

  const subtotal = selected.reduce((s, p) => s + p.price * cart[p.id], 0);
  const onlineDiscount = subtotal * 0.10;
  const finalTotal = subtotal - onlineDiscount;
  const parasolkaAmount = finalTotal * 0.20;

  document.getElementById("total").innerHTML = `
    <div class="summary-line"><span>Сума:</span><strong>${money(subtotal)}</strong></div>
    <div class="summary-line discount"><span>Онлайн-знижка (10%):</span><strong>−${money(onlineDiscount)}</strong></div>
    <div class="summary-line final"><span>До сплати після знижки:</span><strong>${money(finalTotal)}</strong></div>
    <div class="summary-line donation"><span>20% на користь Парасольки:</span><strong>${money(parasolkaAmount)}</strong></div>
  `;
  document.getElementById("checkout").disabled = subtotal === 0;
}

async function loadProducts() {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = '<div class="loading">Завантажуємо товари…</div>';

  try {
    const response = await fetch(APPS_SCRIPT_URL, { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Неверный формат каталога");

    products = data.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      available: p.available === true || String(p.available).toLowerCase() === "true" || String(p.available).toLowerCase() === "да"
    }));

    render();
  } catch (error) {
    console.error(error);
    catalog.innerHTML = `
      <div class="loading">
        Не вдалося завантажити товари.<br><br>
        Перевірте підключення до Інтернету та спробуйте відкрити магазин ще раз.
      </div>`;
    renderCart();
  }
}

document.getElementById("checkout").onclick = () => {
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("close").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("send").onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !phone) {
    alert("Вкажіть ім’я та телефон");
    return;
  }

  const items = products
    .filter(p => cart[p.id])
    .map(p => ({
      id: p.id,
      name: p.name,
      quantity: cart[p.id],
      price: p.price
    }));

  if (!items.length) {
    alert("Кошик порожній");
    return;
  }

  const order = {
    name,
    phone,
    comment: document.getElementById("comment").value.trim(),
    items,
    subtotal: items.reduce((s, p) => s + p.price * p.quantity, 0),
    onlineDiscount: items.reduce((s, p) => s + p.price * p.quantity, 0) * 0.10,
    total: items.reduce((s, p) => s + p.price * p.quantity, 0) * 0.90,
    parasolkaAmount: items.reduce((s, p) => s + p.price * p.quantity, 0) * 0.90 * 0.20,
    telegramUser: tg?.initDataUnsafe?.user || null
  };

  const sendButton = document.getElementById("send");
  sendButton.disabled = true;
  sendButton.textContent = "Надсилаємо…";

  try {
    // text/plain avoids a browser CORS preflight. Apps Script reads the raw body.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(order),
      mode: "no-cors"
    });

    document.getElementById("modal").classList.add("hidden");
    Object.keys(cart).forEach(k => delete cart[k]);
    render();

    alert("Замовлення надіслано! Ми зв’яжемося з вами для підтвердження.");
  } catch (error) {
    console.error(error);
    alert("Не вдалося надіслати замовлення. Спробуйте ще раз.");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Підтвердити замовлення";
  }
};

if (tg?.initDataUnsafe?.user) {
  document.getElementById("user").textContent = "Вітаємо, " + (tg.initDataUnsafe.user.first_name || "");
}

loadProducts();
