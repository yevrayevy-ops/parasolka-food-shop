const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYQVdbUFT4575C8F6OeKP57lNxbeDLIZvGBTq5iOqknIYDlUynNDzx2bxniE6gFlaUzg/exec";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

let products = [];
const cart = {};

const money = n => Number(n || 0).toLocaleString("ru-RU") + " Ft";

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
  catalog.innerHTML = "";

  if (!products.length) {
    catalog.innerHTML = '<div class="loading">Загружаем товары…</div>';
    renderCart();
    return;
  }

  const groups = [...new Set(products.map(p => p.category || "Другое"))];

  groups.forEach((cat, index) => {
    const section = document.createElement("details");
    section.className = "category";
    if (index === 0) section.open = true;

    const title = document.createElement("summary");
    title.textContent = cat;
    section.appendChild(title);

    const items = document.createElement("div");
    items.className = "category-items";

    products.filter(p => (p.category || "Другое") === cat).forEach(p => {
      const d = document.createElement("div");
      d.className = "product";
      const q = cart[p.id] || 0;
      const photo = p.photo ? `<img src="${escapeHtml(p.photo)}" alt="" class="product-photo">` : "";
      const description = p.description ? `<div class="description">${escapeHtml(p.description)}</div>` : "";

      d.innerHTML = `
        ${photo}
        <h3>${escapeHtml(p.name)}</h3>
        ${description}
        <div class="price">${money(p.price)} ${!p.available ? "— нет в наличии" : ""}</div>
        <div class="controls">
          <button ${!p.available ? "disabled" : ""} onclick="change(${JSON.stringify(p.id)},-1)">−</button>
          <span class="qty">${q}</span>
          <button ${!p.available ? "disabled" : ""} onclick="change(${JSON.stringify(p.id)},1)">+</button>
        </div>`;
      items.appendChild(d);
    });

    section.appendChild(items);
    catalog.appendChild(section);
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
    : "Корзина пока пуста";

  const total = selected.reduce((s, p) => s + p.price * cart[p.id], 0);
  document.getElementById("total").textContent = money(total);
  document.getElementById("checkout").disabled = total === 0;
}

async function loadProducts() {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = '<div class="loading">Загружаем товары…</div>';

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
        Не удалось загрузить товары.<br><br>
        Проверьте подключение к интернету и попробуйте открыть магазин ещё раз.
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
    alert("Укажите имя и телефон");
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
    alert("Корзина пуста");
    return;
  }

  const order = {
    name,
    phone,
    comment: document.getElementById("comment").value.trim(),
    items,
    total: items.reduce((s, p) => s + p.price * p.quantity, 0),
    telegramUser: tg?.initDataUnsafe?.user || null
  };

  const sendButton = document.getElementById("send");
  sendButton.disabled = true;
  sendButton.textContent = "Отправляем…";

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

    alert("Заказ отправлен! Мы свяжемся с вами для подтверждения.");
  } catch (error) {
    console.error(error);
    alert("Не удалось отправить заказ. Попробуйте ещё раз.");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Подтвердить заказ";
  }
};

if (tg?.initDataUnsafe?.user) {
  document.getElementById("user").textContent = "Здравствуйте, " + (tg.initDataUnsafe.user.first_name || "");
}

loadProducts();
