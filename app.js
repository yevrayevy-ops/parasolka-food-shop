const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVHhPfXR9SWugxdubgTBA0CH1LIlt6gK4A5e4L9wfueL8RSoSG89FAVjWjGbDXh1FGZg/exec";


const tg =
  window.Telegram?.WebApp;


if (tg) {

  tg.ready();

  tg.expand();

}


let products = [];

const cart = {};


const money = n =>
  Number(n || 0)
    .toLocaleString("uk-UA") +
  " Ft";


function escapeHtml(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


/* =========================================================
   РЕНДЕР КАТАЛОГУ
========================================================= */

function render() {

  const catalog =
    document.getElementById(
      "catalog"
    );


  const openCategories =
    new Set(

      [
        ...catalog.querySelectorAll(
          "details.category[open]"
        )
      ]

      .map(
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


  const groups = [

    ...new Set(

      products.map(
        p => p.category || "Інше"
      )

    )

  ];


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


      summary.textContent =
        cat;


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
            (p.category || "Інше") === cat
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

                    loading="lazy"

                    decoding="async"

                    width="600"

                    height="600"

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


            d.innerHTML = `

              ${photo}


              <h3>

                ${escapeHtml(
                  p.name
                )}

              </h3>


              ${description}


              <div class="price">

                ${money(
                  p.price
                )}

                ${
                  !p.available
                    ? "— немає в наявності"
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
   КІЛЬКІСТЬ ТОВАРУ
========================================================= */

function change(
  id,
  delta
) {

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

      (cart[id] || 0) +
      delta

    );


  if (
    cart[id] === 0
  ) {

    delete cart[id];

  }


  render();

}


/* =========================================================
   КОШИК
========================================================= */

function renderCart() {

  const el =
    document.getElementById(
      "cartItems"
    );


  const selected =
    products.filter(
      p => cart[p.id]
    );


  el.innerHTML =

    selected.length

      ? selected

          .map(

            p => `

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

            `

          )

          .join("")


      : "Кошик поки порожній";


  const subtotal =
    selected.reduce(

      (s, p) =>

        s +
        p.price *
        cart[p.id],

      0

    );


  const onlineDiscount =
    subtotal * 0.10;


  const finalTotal =
    subtotal -
    onlineDiscount;


  const parasolkaAmount =
    finalTotal * 0.20;


  document.getElementById(
    "total"
  ).innerHTML = `

    <div class="summary-line">

      <span>

        Сума:

      </span>


      <strong>

        ${money(
          subtotal
        )}

      </strong>

    </div>


    <div class="summary-line discount">

      <span>

        Знижка за онлайн-замовлення (10%):

      </span>


      <strong>

        −${money(
          onlineDiscount
        )}

      </strong>

    </div>


    <div class="summary-line final">

      <span>

        До сплати після знижки:

      </span>


      <strong>

        ${money(
          finalTotal
        )}

      </strong>

    </div>


    <div class="summary-line donation">

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
    subtotal === 0;

}


/* =========================================================
   ЗАВАНТАЖЕННЯ ТОВАРІВ
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


    if (
      !Array.isArray(data)
    ) {

      throw new Error(
        "Неправильний формат каталогу"
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

        Перевірте підключення
        до інтернету та спробуйте
        відкрити магазин ще раз.

      </div>

    `;


    renderCart();

  }

}


/* =========================================================
   МОДАЛЬНЕ ВІКНО
========================================================= */

document.getElementById(
  "checkout"
).onclick = () => {

  document.getElementById(
    "modal"
  ).classList.remove(
    "hidden"
  );

};


document.getElementById(
  "close"
).onclick = () => {

  document.getElementById(
    "modal"
  ).classList.add(
    "hidden"
  );

};


/* =========================================================
   НАДСИЛАННЯ ЗАМОВЛЕННЯ
========================================================= */

document.getElementById(
  "send"
).onclick = async () => {


  const name =
    document.getElementById(
      "name"
    ).value.trim();


  const phone =
    document.getElementById(
      "phone"
    ).value.trim();


  const comment =
    document.getElementById(
      "comment"
    ).value.trim();


  if (
    !name ||
    !phone
  ) {

    alert(
      "Вкажіть ім’я та номер телефону"
    );

    return;

  }


  const items =
    products

      .filter(
        p => cart[p.id]
      )

      .map(
        p => ({

          id:
            p.id,

          name:
            p.name,

          quantity:
            cart[p.id],

          price:
            p.price

        })
      );


  if (
    !items.length
  ) {

    alert(
      "Кошик порожній"
    );

    return;

  }


  const subtotal =
    items.reduce(

      (s, p) =>

        s +
        p.price *
        p.quantity,

      0

    );


  const onlineDiscount =
    subtotal * 0.10;


  const total =
    subtotal * 0.90;


  const parasolkaAmount =
    total * 0.20;


  const order = {

    name,

    phone,

    comment,

    items,

    subtotal,

    onlineDiscount,

    total,

    parasolkaAmount,


    telegramUser:

      tg?.initDataUnsafe?.user ||
      null

  };


  const sendButton =
    document.getElementById(
      "send"
    );


  sendButton.disabled =
    true;


  sendButton.textContent =
    "Надсилаємо…";


  try {


    /*
     * Надсилаємо замовлення.
     *
     * no-cors потрібен для Google Apps Script.
     */

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


    /*
     * Даємо Apps Script трохи часу
     * записати замовлення в таблицю.
     */

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1000
        )
    );


    /*
     * Закриваємо форму.
     */

    document.getElementById(
      "modal"
    ).classList.add(
      "hidden"
    );


    /*
     * Показуємо клієнту,
     * що замовлення прийнято.
     */

    showSuccess();


    /*
     * Очищаємо кошик.
     */

    Object.keys(cart)
      .forEach(
        key =>
          delete cart[key]
      );


    render();


    /*
     * Оновлюємо історію замовлень.
     */

    loadCustomerOrders();


  } catch (error) {

    console.error(
      error
    );


    alert(
      "Не вдалося надіслати замовлення. Спробуйте ще раз."
    );


  } finally {

    sendButton.disabled =
      false;


    sendButton.textContent =
      "Підтвердити замовлення";

  }

};


/* =========================================================
   ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ
========================================================= */

function showSuccess() {

  const selected =
    products.filter(
      p => cart[p.id]
    );


  /*
   * Після очищення cart нам потрібна
   * информация о заказе.
   *
   * Поэтому функция использует
   * сохранённые данные ниже.
   */

  const content =
    document.getElementById(
      "successContent"
    );


  content.innerHTML = `

    <p>

      Ваше замовлення
      успішно прийнято.

    </p>


    <p>

      Ми зв’яжемося з вами
      для підтвердження.

    </p>

  `;


  document.getElementById(
    "successModal"
  ).classList.remove(
    "hidden"
  );

}


/* =========================================================
   ЗАКРИТТЯ ПІДТВЕРДЖЕННЯ
========================================================= */

document.getElementById(
  "continueShopping"
).onclick = () => {

  document.getElementById(
    "successModal"
  ).classList.add(
    "hidden"
  );

};


/* =========================================================
   МОЇ ЗАМОВЛЕННЯ
========================================================= */

document.getElementById(
  "ordersButton"
).onclick = async () => {

  const list =
    document.getElementById(
      "ordersList"
    );


  if (
    list.classList.contains(
      "hidden"
    )
  ) {

    list.classList.remove(
      "hidden"
    );


    await loadCustomerOrders();

  } else {

    list.classList.add(
      "hidden"
    );

  }

};


/* =========================================================
   КНОПКА «МОЇ ЗАМОВЛЕННЯ»
   ПІСЛЯ ОФОРМЛЕННЯ
========================================================= */

document.getElementById(
  "showOrders"
).onclick = async () => {

  document.getElementById(
    "successModal"
  ).classList.add(
    "hidden"
  );


  const list =
    document.getElementById(
      "ordersList"
    );


  list.classList.remove(
    "hidden"
  );


  await loadCustomerOrders();


  list.scrollIntoView({
    behavior:
      "smooth"
  });

};


/* =========================================================
   ЗАВАНТАЖЕННЯ ІСТОРІЇ
========================================================= */

async function loadCustomerOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );


  const telegramId =
    tg?.initDataUnsafe?.user?.id;


  if (!telegramId) {

    list.innerHTML = `

      <p>

        Історія замовлень доступна
        лише в Telegram.

      </p>

    `;

    return;

  }


  list.innerHTML = `

    <div class="loading">

      Завантажуємо замовлення…

    </div>

  `;


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


    if (
      !Array.isArray(orders) ||
      orders.length === 0
    ) {

      list.innerHTML = `

        <p>

          У вас ще немає замовлень.

        </p>

      `;

      return;

    }


    list.innerHTML =

      orders

        .map(
          order =>
            renderCustomerOrder(
              order
            )
        )

        .join("");


  } catch (error) {

    console.error(
      error
    );


    list.innerHTML = `

      <p>

        Не вдалося завантажити
        історію замовлень.

      </p>

    `;

  }

}


/* =========================================================
   ВІДОБРАЖЕННЯ ОДНОГО ЗАМОВЛЕННЯ
========================================================= */

function renderCustomerOrder(
  order
) {

  const date =
    order.date

      ? new Date(
          order.date
        ).toLocaleString(
          "uk-UA"
        )

      : "";


  const status =
    order.status === "Новый"
      ? "Новий"
      : (
          order.status ||
          "Новий"
        );


  const items =
    (order.items || [])

      .map(

        item => `

          <div class="cartrow">

            <span>

              ${escapeHtml(
                item.name
              )}

              ×

              ${item.quantity}

            </span>


            <span>

              ${money(
                item.sum
              )}

            </span>

          </div>

        `

      )

      .join("");


  return `

    <div
      class="customer-order"
      style="
        margin-top:15px;
        padding:15px;
        border-radius:12px;
        background:rgba(0,0,0,0.04);
      "
    >


      <h3>

        🧾 Замовлення №
        ${escapeHtml(
          order.orderNumber
        )}

      </h3>


      <p>

        <b>Дата:</b>
        ${escapeHtml(
          date
        )}

      </p>


      <p>

        <b>Статус:</b>
        ${escapeHtml(
          status
        )}

      </p>


      <div>

        ${items}

      </div>


      <hr>


      <div class="summary-line">

        <span>
          Сума до знижки:
        </span>

        <strong>
          ${money(
            order.subtotal
          )}
        </strong>

      </div>


      <div class="summary-line discount">

        <span>
          Знижка 10%:
        </span>

        <strong>
          −${money(
            order.onlineDiscount
          )}
        </strong>

      </div>


      <div class="summary-line final">

        <span>
          До сплати:
        </span>

        <strong>
          ${money(
            order.total
          )}
        </strong>

      </div>


      <div class="summary-line donation">

        <span>
          20% на користь Парасольки:
        </span>

        <strong>
          ${money(
            order.parasolkaAmount
          )}
        </strong>

      </div>


    </div>

  `;

}


/* =========================================================
   ІМ'Я TELEGRAM
========================================================= */

if (
  tg?.initDataUnsafe?.user
) {

  document.getElementById(
    "user"
  ).textContent =

    "Вітаємо, " +

    (
      tg
        .initDataUnsafe
        .user
        .first_name ||
      ""
    );

}


/* =========================================================
   ЗАПУСК
========================================================= */

loadProducts();
