const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVHhPfXR9SWugxdubgTBA0CH1LIlt6gK4A5e4LwfueL8RSoSG89FAVjWjGbDXh1FGZg/exec";

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

let products = [];
const cart = {};

const IN_STOCK_CATEGORY = "Товари в наявності";

const money = n =>
  Number(n || 0).toLocaleString("uk-UA") + " Ft";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

function getTelegramId() {
  const user = getTelegramUser();

  return user?.id
    ? String(user.id)
    : "";
}

/* =========================================================
   PRODUCT TYPE
========================================================= */

function isInStockProduct(product) {
  return (
    String(product?.category || "").trim() ===
    IN_STOCK_CATEGORY
  );
}

/* =========================================================
   CUSTOMER DATA
========================================================= */

async function loadCustomerData() {
  const nameInput =
    document.getElementById("name");

  const phoneInput =
    document.getElementById("phone");

  if (!nameInput || !phoneInput) {
    return;
  }

  /*
   * Сначала берём данные,
   * сохранённые на устройстве.
   */

  try {
    const savedName =
      localStorage.getItem(
        "parasolka_customer_name"
      );

    const savedPhone =
      localStorage.getItem(
        "parasolka_customer_phone"
      );

    if (
      savedName &&
      !nameInput.value
    ) {
      nameInput.value =
        savedName;
    }

    if (
      savedPhone &&
      !phoneInput.value
    ) {
      phoneInput.value =
        savedPhone;
    }

  } catch (error) {
    console.log(
      "localStorage недоступен",
      error
    );
  }

  /*
   * Затем получаем последние
   * данные клиента из Google Sheets.
   */

  const telegramId =
    getTelegramId();

  if (!telegramId) {
    return;
  }

  try {
    const url =
      APPS_SCRIPT_URL +
      "?action=customer&telegramId=" +
      encodeURIComponent(
        telegramId
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    if (
      data &&
      data.found
    ) {
      if (
        data.name &&
        !nameInput.value
      ) {
        nameInput.value =
          data.name;
      }

      if (
        data.phone &&
        !phoneInput.value
      ) {
        phoneInput.value =
          data.phone;
      }
    }

  } catch (error) {
    console.error(
      "Ошибка загрузки данных клиента:",
      error
    );
  }
}

/* =========================================================
   CATALOG
========================================================= */

function render() {
  const catalog =
    document.getElementById(
      "catalog"
    );

  /*
   * Запоминаем открытые категории.
   */

  const openCategories =
    new Set(
      [
        ...catalog.querySelectorAll(
          "details.category[open]"
        )
      ].map(
        d => d.dataset.category
      )
    );

  catalog.innerHTML = "";

  if (!products.length) {
    catalog.innerHTML =
      '<div class="loading">Завантажуємо товари…</div>';

    renderCart();

    return;
  }

  /*
   * Группировка товаров по категориям.
   */

  const groups =
    [
      ...new Set(
        products.map(
          p =>
            p.category ||
            "Інше"
        )
      )
    ];

  /*
   * Сначала показываем товары
   * в наличии.
   */

  groups.sort((a, b) => {
    if (a === IN_STOCK_CATEGORY) return -1;
    if (b === IN_STOCK_CATEGORY) return 1;
    return 0;
  });

  groups.forEach(
    (cat, index) => {
      const details =
        document.createElement(
          "details"
        );

      details.className =
        "category";

      details.dataset.category =
        cat;

      details.open =
        openCategories.has(cat) ||
        (
          openCategories.size === 0 &&
          index === 0
        );

      const summary =
        document.createElement(
          "summary"
        );

      if (cat === IN_STOCK_CATEGORY) {
        summary.textContent =
          "🟢 Товари в наявності — можна забрати зараз";
      } else {
        summary.textContent =
          "📦 " + cat;
      }

      details.appendChild(
        summary
      );

      const productsWrap =
        document.createElement(
          "div"
        );

      productsWrap.className =
        "category-products";

      products
        .filter(
          p =>
            (
              p.category ||
              "Інше"
            ) === cat
        )
        .forEach(
          p => {
            const d =
              document.createElement(
                "div"
              );

            d.className =
              "product";

            const q =
              cart[p.id] || 0;

            const photo =
              p.photo
                ? `
                  <img
                    src="${escapeHtml(
                      p.photo
                    )}"
                    alt=""
                    class="product-photo"
                  >
                `
                : "";

            const description =
              p.description
                ? `
                  <div class="description">
                    ${escapeHtml(
                      p.description
                    )}
                  </div>
                `
                : "";

            const productType =
              isInStockProduct(p)
                ? `
                  <div
                    style="
                      margin:6px 0;
                      color:#16803c;
                      font-size:13px;
                      font-weight:600;
                    "
                  >
                    🟢 Можна забрати зараз
                  </div>
                `
                : `
                  <div
                    style="
                      margin:6px 0;
                      color:#8a6500;
                      font-size:13px;
                      font-weight:600;
                    "
                  >
                    📦 Попереднє замовлення · знижка 10%
                  </div>
                `;

            d.innerHTML = `
              ${photo}

              <h3>
                ${escapeHtml(
                  p.name
                )}
              </h3>

              ${description}

              ${productType}

              <div class="price">
                ${money(
                  p.price
                )}

                ${
                  !p.available
                    ? " — немає в наявності"
                    : ""
                }
              </div>

              <div class="controls">

                <button
                  ${
                    !p.available
                      ? "disabled"
                      : ""
                  }

                  onclick="change(
                    ${JSON.stringify(
                      p.id
                    )},
                    -1
                  )"
                >
                  −
                </button>

                <span class="qty">
                  ${q}
                </span>

                <button
                  ${
                    !p.available
                      ? "disabled"
                      : ""
                  }

                  onclick="change(
                    ${JSON.stringify(
                      p.id
                    )},
                    1
                  )"
                >
                  +
                </button>

              </div>
            `;

            productsWrap.appendChild(
              d
            );
          }
        );

      details.appendChild(
        productsWrap
      );

      catalog.appendChild(
        details
      );
    }
  );

  renderCart();
}

/* =========================================================
   CART
========================================================= */

function change(id, delta) {
  const product =
    products.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (
    !product ||
    !product.available
  ) {
    return;
  }

  cart[id] =
    Math.max(
      0,
      (cart[id] || 0) + delta
    );

  if (cart[id] === 0) {
    delete cart[id];
  }

  render();
}

/* =========================================================
   CART CALCULATION
========================================================= */

function getCartCalculation() {
  const selected =
    products.filter(
      p =>
        cart[p.id]
    );

  const inStockItems =
    selected.filter(
      p =>
        isInStockProduct(p)
    );

  const preorderItems =
    selected.filter(
      p =>
        !isInStockProduct(p)
    );

  const inStockSubtotal =
    inStockItems.reduce(
      (sum, p) =>
        sum +
        p.price *
          cart[p.id],
      0
    );

  const preorderSubtotal =
    preorderItems.reduce(
      (sum, p) =>
        sum +
        p.price *
          cart[p.id],
      0
    );

  const onlineDiscount =
    preorderSubtotal * 0.10;

  const total =
    inStockSubtotal +
    preorderSubtotal -
    onlineDiscount;

  const parasolkaAmount =
    total * 0.20;

  return {
    selected,
    inStockItems,
    preorderItems,
    inStockSubtotal,
    preorderSubtotal,
    onlineDiscount,
    total,
    parasolkaAmount
  };
}

/* =========================================================
   CART DISPLAY
========================================================= */

function renderCart() {
  const el =
    document.getElementById(
      "cartItems"
    );

  const calculation =
    getCartCalculation();

  const {
    inStockItems,
    preorderItems,
    inStockSubtotal,
    preorderSubtotal,
    onlineDiscount,
    total,
    parasolkaAmount
  } = calculation;

  if (
    !inStockItems.length &&
    !preorderItems.length
  ) {
    el.innerHTML =
      "Кошик поки порожній";
  } else {
    let html = "";

    /*
     * Товари в наявності
     */

    if (inStockItems.length) {
      html += `
        <div
          style="
            margin-bottom:16px;
            padding:12px;
            border:2px solid #b7e4c7;
            background:#f2fff6;
            border-radius:12px;
          "
        >
          <div
            style="
              font-weight:700;
              color:#16803c;
              margin-bottom:8px;
            "
          >
            🟢 Товари в наявності
          </div>

          <div
            style="
              font-size:13px;
              color:#555;
              margin-bottom:8px;
            "
          >
            Можна забрати зараз · без знижки
          </div>
      `;

      inStockItems.forEach(
        p => {
          html += `
            <div class="cartrow">
              <span>
                ${escapeHtml(
                  p.name
                )}
                ×
                ${cart[p.id]}
              </span>

              <span>
                ${money(
                  p.price *
                    cart[p.id]
                )}
              </span>
            </div>
          `;
        }
      );

      html += `
          <div
            style="
              margin-top:10px;
              padding-top:8px;
              border-top:1px solid #cfe8d7;
              text-align:right;
              font-weight:700;
            "
          >
            Разом:
            ${money(
              inStockSubtotal
            )}
          </div>
        </div>
      `;
    }

    /*
     * Предварительный заказ
     */

    if (preorderItems.length) {
      html += `
        <div
          style="
            margin-bottom:16px;
            padding:12px;
            border:2px solid #f0df9c;
            background:#fffdf2;
            border-radius:12px;
          "
        >
          <div
            style="
              font-weight:700;
              color:#806000;
              margin-bottom:8px;
            "
          >
            📦 Попереднє замовлення
          </div>

          <div
            style="
              font-size:13px;
              color:#555;
              margin-bottom:8px;
            "
          >
            Потрібно замовляти заздалегідь · знижка 10%
          </div>
      `;

      preorderItems.forEach(
        p => {
          html += `
            <div class="cartrow">
              <span>
                ${escapeHtml(
                  p.name
                )}
                ×
                ${cart[p.id]}
              </span>

              <span>
                ${money(
                  p.price *
                    cart[p.id]
                )}
              </span>
            </div>
          `;
        }
      );

      html += `
          <div
            style="
              margin-top:10px;
              padding-top:8px;
              border-top:1px solid #eee0a8;
            "
          >
            <div
              style="
                display:flex;
                justify-content:space-between;
              "
            >
              <span>
                Сума:
              </span>

              <strong>
                ${money(
                  preorderSubtotal
                )}
              </strong>
            </div>

            <div
              style="
                display:flex;
                justify-content:space-between;
                color:#b33;
                margin-top:4px;
              "
            >
              <span>
                Знижка 10%:
              </span>

              <strong>
                −${money(
                  onlineDiscount
                )}
              </strong>
            </div>

            <div
              style="
                display:flex;
                justify-content:space-between;
                margin-top:4px;
                font-weight:700;
              "
            >
              <span>
                Після знижки:
              </span>

              <strong>
                ${money(
                  preorderSubtotal -
                    onlineDiscount
                )}
              </strong>
            </div>
          </div>
        </div>
      `;
    }

    el.innerHTML =
      html;
  }

  /*
   * Общий итог
   */

  document.getElementById(
    "total"
  ).innerHTML = `

    ${
      inStockItems.length
        ? `
          <div class="summary-line">
            <span>
              Товари в наявності:
            </span>

            <strong>
              ${money(
                inStockSubtotal
              )}
            </strong>
          </div>
        `
        : ""
    }

    ${
      preorderItems.length
        ? `
          <div class="summary-line">
            <span>
              Попереднє замовлення:
            </span>

            <strong>
              ${money(
                preorderSubtotal
              )}
            </strong>
          </div>

          <div class="summary-line discount">
            <span>
              Знижка 10%:
            </span>

            <strong>
              −${money(
                onlineDiscount
              )}
            </strong>
          </div>
        `
        : ""
    }

    <div
      class="summary-line final"
      style="
        margin-top:8px;
        padding-top:8px;
        border-top:2px solid #ddd;
      "
    >
      <span>
        До сплати:
      </span>

      <strong>
        ${money(
          total
        )}
      </strong>
    </div>

    <div
      class="summary-line donation"
    >
      <span>
        20% на користь Парасольки:
      </span>

      <strong>
        ${money(
          parasolkaAmount
        )}
      </strong>
    </div>

  `;

  document.getElementById(
    "checkout"
  ).disabled =
    calculation.selected.length === 0;
}

/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {
  const catalog =
    document.getElementById(
      "catalog"
    );

  catalog.innerHTML =
    '<div class="loading">Завантажуємо товари…</div>';

  try {
    const response =
      await fetch(
        APPS_SCRIPT_URL,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status
      );
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Невірний формат каталогу"
      );
    }

    products =
      data.map(
        p => ({
          ...p,

          price:
            Number(
              p.price
            ) || 0,

          available:
            p.available === true ||
            String(
              p.available
            ).toLowerCase() ===
              "true" ||
            String(
              p.available
            ).toLowerCase() ===
              "да"
        })
      );

    render();

  } catch (error) {
    console.error(
      error
    );

    catalog.innerHTML = `
      <div class="loading">
        Не вдалося завантажити товари.

        <br><br>

        Перевірте підключення до інтернету
        та спробуйте відкрити магазин ще раз.
      </div>
    `;

    renderCart();
  }
}

/* =========================================================
   MY ORDERS MODAL
========================================================= */

function createOrdersModal() {
  let modal =
    document.getElementById(
      "ordersModal"
    );

  if (modal) {
    return modal;
  }

  modal =
    document.createElement(
      "div"
    );

  modal.id =
    "ordersModal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:9999;
    background:rgba(0,0,0,.55);
    display:none;
    overflow:auto;
    padding:20px;
    box-sizing:border-box;
  `;

  modal.innerHTML = `
    <div
      style="
        max-width:700px;
        margin:20px auto;
        background:white;
        border-radius:16px;
        padding:20px;
        box-sizing:border-box;
        color:#222;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-bottom:15px;
        "
      >

        <h2 style="margin:0;">
          📋 Мої замовлення
        </h2>

        <button
          id="closeOrders"
          type="button"
          style="
            border:0;
            background:#eee;
            border-radius:10px;
            width:40px;
            height:40px;
            font-size:22px;
          "
        >
          ×
        </button>

      </div>

      <div id="ordersContent">
        Завантажуємо замовлення…
      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  document.getElementById(
    "closeOrders"
  ).onclick =
    () => {
      modal.style.display =
        "none";
    };

  modal.addEventListener(
    "click",
    event => {
      if (
        event.target === modal
      ) {
        modal.style.display =
          "none";
      }
    }
  );

  return modal;
}

/* =========================================================
   FIND EXISTING MY ORDERS BUTTON
========================================================= */

function setupMyOrdersButton() {
  let button =
    document.getElementById(
      "myOrders"
    );

  if (!button) {
    button =
      [
        ...document.querySelectorAll(
          "button"
        )
      ].find(
        button =>
          button.textContent
            .includes(
              "Мої замовлення"
            )
      );
  }

  if (button) {
    button.id =
      "myOrders";

    button.onclick =
      loadMyOrders;
  }

  /*
   * ВАЖНО:
   * Мы НЕ создаём новую кнопку.
   */
}

/* =========================================================
   DATE
========================================================= */

function formatOrderDate(date) {
  if (!date) {
    return "";
  }

  try {
    const d =
      new Date(date);

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return String(
        date
      );
    }

    return d.toLocaleString(
      "uk-UA",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  } catch {
    return String(
      date
    );
  }
}

/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders(
  orders
) {
  const content =
    document.getElementById(
      "ordersContent"
    );

  if (!orders.length) {
    content.innerHTML = `
      <div
        style="
          text-align:center;
          padding:30px 10px;
          color:#666;
        "
      >
        У вас ще немає замовлень.
      </div>
    `;

    return;
  }

  content.innerHTML =
    orders
      .map(
        order => {

          const inStockItems =
            order.items.filter(
              item =>
                String(
                  item.category ||
                  ""
                ).trim() ===
                IN_STOCK_CATEGORY
            );

          const preorderItems =
            order.items.filter(
              item =>
                String(
                  item.category ||
                  ""
                ).trim() !==
                IN_STOCK_CATEGORY
            );

          const renderOrderItems =
            items =>
              items
                .map(
                  item => `
                    <div
                      style="
                        padding:8px 0;
                        border-bottom:1px solid #eee;
                      "
                    >

                      <div
                        style="
                          font-weight:600;
                        "
                      >
                        ${escapeHtml(
                          item.name
                        )}
                      </div>

                      <div
                        style="
                          margin-top:3px;
                          font-size:14px;
                        "
                      >
                        ${item.quantity}
                        ×
                        ${money(
                          item.price
                        )}
                        =
                        <b>
                          ${money(
                            item.sum
                          )}
                        </b>
                      </div>

                    </div>
                  `
                )
                .join("");

          let itemsHtml = "";

          if (
            inStockItems.length
          ) {
            itemsHtml += `
              <div
                style="
                  margin-top:12px;
                  padding:12px;
                  background:#f2fff6;
                  border:1px solid #b7e4c7;
                  border-radius:12px;
                "
              >

                <div
                  style="
                    font-weight:700;
                    color:#16803c;
                    margin-bottom:5px;
                  "
                >
                  🟢 Товари в наявності
                </div>

                <div
                  style="
                    color:#555;
                    font-size:13px;
                    margin-bottom:5px;
                  "
                >
                  Можна забрати зараз
                </div>

                ${renderOrderItems(
                  inStockItems
                )}

              </div>
            `;
          }

          if (
            preorderItems.length
          ) {
            itemsHtml += `
              <div
                style="
                  margin-top:12px;
                  padding:12px;
                  background:#fffdf2;
                  border:1px solid #f0df9c;
                  border-radius:12px;
                "
              >

                <div
                  style="
                    font-weight:700;
                    color:#806000;
                    margin-bottom:5px;
                  "
                >
                  📦 Попереднє замовлення
                </div>

                <div
                  style="
                    color:#555;
                    font-size:13px;
                    margin-bottom:5px;
                  "
                >
                  Потрібно замовляти заздалегідь
                </div>

                ${renderOrderItems(
                  preorderItems
                )}

              </div>
            `;
          }

          return `
            <div
              style="
                border:1px solid #ddd;
                border-radius:14px;
                padding:15px;
                margin-bottom:15px;
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  margin-bottom:10px;
                "
              >

                <strong>
                  Замовлення №
                  ${escapeHtml(
                    order.orderNumber
                  )}
                </strong>

                <span
                  style="
                    color:#777;
                    font-size:13px;
                  "
                >
                  ${formatOrderDate(
                    order.date
                  )}
                </span>

              </div>

              <div
                style="
                  margin-bottom:10px;
                  color:#555;
                "
              >
                Статус:

                <b>
                  ${escapeHtml(
                    order.status ||
                    "—"
                  )}
                </b>
              </div>

              ${itemsHtml}

              <div
                style="
                  margin-top:12px;
                  line-height:1.6;
                "
              >

                <div>
                  Сума до знижки:

                  <b>
                    ${money(
                      order.subtotal
                    )}
                  </b>
                </div>

                <div
                  style="
                    color:#a33;
                  "
                >
                  Знижка 10%:

                  −${money(
                    order.onlineDiscount
                  )}
                </div>

                <div
                  style="
                    font-size:18px;
                    margin-top:4px;
                  "
                >
                  До сплати:

                  <b>
                    ${money(
                      order.total
                    )}
                  </b>
                </div>

                <div
                  style="
                    color:#555;
                    font-size:14px;
                  "
                >
                  20% на користь Парасольки:

                  ${money(
                    order.parasolkaAmount
                  )}
                </div>

              </div>

              ${
                order.comment
                  ? `
                    <div
                      style="
                        margin-top:10px;
                        padding-top:10px;
                        border-top:1px solid #eee;
                      "
                    >

                      <b>
                        Коментар:
                      </b>

                      <br>

                      ${escapeHtml(
                        order.comment
                      )}

                    </div>
                  `
                  : ""
              }

            </div>
          `;
        }
      )
      .join("");
}

/* =========================================================
   LOAD MY ORDERS
========================================================= */

async function loadMyOrders() {
  const modal =
    createOrdersModal();

  const content =
    document.getElementById(
      "ordersContent"
    );

  modal.style.display =
    "block";

  content.innerHTML = `
    <div
      style="
        text-align:center;
        padding:30px;
        color:#666;
      "
    >
      Завантажуємо замовлення…
    </div>
  `;

  const telegramId =
    getTelegramId();

  if (!telegramId) {
    content.innerHTML = `
      <div
        style="
          text-align:center;
          padding:30px 10px;
          color:#b00;
        "
      >
        Не вдалося визначити Telegram ID.

        <br><br>

        Відкрийте магазин через Telegram.
      </div>
    `;

    return;
  }

  try {
    const url =
      APPS_SCRIPT_URL +
      "?action=orders&telegramId=" +
      encodeURIComponent(
        telegramId
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " +
        response.status
      );
    }

    const orders =
      await response.json();

    if (!Array.isArray(orders)) {
      throw new Error(
        "Невірний формат замовлень"
      );
    }

    renderOrders(
      orders
    );

  } catch (error) {
    console.error(
      "Помилка завантаження замовлень:",
      error
    );

    content.innerHTML = `
      <div
        style="
          text-align:center;
          padding:30px 10px;
          color:#b00;
        "
      >
        Не вдалося завантажити
        замовлення.

        <br><br>

        Спробуйте ще раз.
      </div>
    `;
  }
}

/* =========================================================
   CHECKOUT
========================================================= */

document.getElementById(
  "checkout"
).onclick =
  async () => {

    document.getElementById(
      "modal"
    ).classList.remove(
      "hidden"
    );

    await loadCustomerData();
  };

document.getElementById(
  "close"
).onclick =
  () => {

    document.getElementById(
      "modal"
    ).classList.add(
      "hidden"
    );
  };

/* =========================================================
   SEND ORDER
========================================================= */

document.getElementById(
  "send"
).onclick =
  async () => {

    const name =
      document.getElementById(
        "name"
      ).value.trim();

    const phone =
      document.getElementById(
        "phone"
      ).value.trim();

    if (
      !name ||
      !phone
    ) {
      alert(
        "Вкажіть ім’я та телефон"
      );

      return;
    }

    const calculation =
      getCartCalculation();

    const {
      selected,
      inStockSubtotal,
      preorderSubtotal,
      onlineDiscount,
      total,
      parasolkaAmount
    } = calculation;

    const items =
      selected.map(
        p => ({
          id:
            p.id,

          name:
            p.name,

          category:
            p.category || "Інше",

          quantity:
            cart[p.id],

          price:
            p.price
        })
      );

    if (!items.length) {
      alert(
        "Кошик порожній"
      );

      return;
    }

    /*
     * ВАЖНО:
     * Эти значения теперь разделены
     * по типу товара.
     */

    const order = {
      name,

      phone,

      comment:
        document.getElementById(
          "comment"
        ).value.trim(),

      items,

      subtotal:
        inStockSubtotal +
        preorderSubtotal,

      inStockSubtotal,

      preorderSubtotal,

      onlineDiscount,

      total,

      parasolkaAmount,

      telegramUser:
        getTelegramUser()
    };

    /*
     * Сохраняем имя и телефон
     * для следующих заказов.
     */

    try {
      localStorage.setItem(
        "parasolka_customer_name",
        name
      );

      localStorage.setItem(
        "parasolka_customer_phone",
        phone
      );

    } catch (error) {
      console.log(
        "Не удалось сохранить данные",
        error
      );
    }

    const sendButton =
      document.getElementById(
        "send"
      );

    sendButton.disabled =
      true;

    sendButton.textContent =
      "Відправляємо…";

    try {

      await fetch(
        APPS_SCRIPT_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              order
            ),

          mode:
            "no-cors"
        }
      );

      document.getElementById(
        "modal"
      ).classList.add(
        "hidden"
      );

      Object.keys(
        cart
      ).forEach(
        k =>
          delete cart[k]
      );

      render();

      alert(
        "Замовлення відправлено! Ми зв’яжемося з вами для підтвердження."
      );

    } catch (error) {

      console.error(
        error
      );

      alert(
        "Не вдалося відправити замовлення. Спробуйте ще раз."
      );

    } finally {

      sendButton.disabled =
        false;

      sendButton.textContent =
        "Підтвердити замовлення";
    }
  };

/* =========================================================
   USER GREETING
========================================================= */

if (
  tg?.initDataUnsafe?.user
) {
  document.getElementById(
    "user"
  ).textContent =
    "Вітаємо, " +
    (
      tg.initDataUnsafe.user
        .first_name ||
      ""
    );
}

/* =========================================================
   START
========================================================= */

createOrdersModal();

setupMyOrdersButton();

loadProducts();
