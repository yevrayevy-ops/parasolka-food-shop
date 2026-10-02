const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVHhPfXR9SWugxdubgTBA0CH1LIlt6gK4A5e4L9wfueL8RSoSG89FAVjWjGbDXh1FGZg/exec";


const tg = window.Telegram?.WebApp;


if (tg) {
  tg.ready();
  tg.expand();
}


let products = [];

const cart = {};


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


/**
 * Telegram ID текущего пользователя.
 */
function getTelegramId() {

  return tg?.initDataUnsafe?.user?.id
    ? String(tg.initDataUnsafe.user.id)
    : "";
}


/**
 * Сохраняем имя и телефон локально.
 */
function saveCustomerLocally(name, phone) {

  try {

    localStorage.setItem(
      "parasolka_customer",
      JSON.stringify({
        name: name || "",
        phone: phone || ""
      })
    );

  } catch (error) {

    console.warn(
      "Не удалось сохранить данные клиента локально",
      error
    );

  }
}


/**
 * Загружаем локально сохранённые данные.
 */
function loadCustomerLocally() {

  try {

    const raw =
      localStorage.getItem(
        "parasolka_customer"
      );


    if (!raw) {
      return null;
    }


    return JSON.parse(raw);

  } catch (error) {

    return null;
  }
}


/**
 * Загружаем имя и телефон клиента
 * из Google Sheets по Telegram ID.
 */
async function loadCustomerData() {

  const telegramId =
    getTelegramId();


  const nameInput =
    document.getElementById(
      "name"
    );


  const phoneInput =
    document.getElementById(
      "phone"
    );


  if (
    !nameInput ||
    !phoneInput
  ) {

    return;
  }


  /*
   * Сначала мгновенно подставляем
   * локально сохранённые данные.
   */
  const localCustomer =
    loadCustomerLocally();


  if (localCustomer) {

    if (
      !nameInput.value &&
      localCustomer.name
    ) {

      nameInput.value =
        localCustomer.name;
    }


    if (
      !phoneInput.value &&
      localCustomer.phone
    ) {

      phoneInput.value =
        localCustomer.phone;
    }
  }


  /*
   * Если приложение открыто внутри Telegram,
   * ищем последние данные пользователя
   * в Google Sheets.
   */
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

      throw new Error(
        "HTTP " +
        response.status
      );
    }


    const data =
      await response.json();


    if (
      data &&
      data.found
    ) {

      if (data.name) {

        nameInput.value =
          data.name;
      }


      if (data.phone) {

        phoneInput.value =
          data.phone;
      }


      saveCustomerLocally(
        data.name || "",
        data.phone || ""
      );
    }


  } catch (error) {

    /*
     * Если Google Sheets временно недоступен,
     * форма всё равно может использовать
     * локально сохранённые данные.
     */
    console.warn(
      "Не удалось загрузить данные клиента",
      error
    );
  }
}


/**
 * Отрисовка каталога.
 */
function render() {

  const catalog =
    document.getElementById(
      "catalog"
    );


  if (!catalog) {
    return;
  }


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
        d =>
          d.dataset.category
      )
    );


  catalog.innerHTML = "";


  if (!products.length) {

    catalog.innerHTML =
      '<div class="loading">Завантажуємо товари…</div>';

    renderCart();

    return;
  }


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
                    src="${escapeHtml(p.photo)}"
                    alt=""
                    class="product-photo"
                    loading="lazy"
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

                ${money(p.price)}

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
                    ${JSON.stringify(p.id)},
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
                    ${JSON.stringify(p.id)},
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


/**
 * Изменение количества товара.
 */
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
      (cart[id] || 0) +
        delta
    );


  if (cart[id] === 0) {

    delete cart[id];
  }


  render();
}


/**
 * Отрисовка корзины.
 */
function renderCart() {

  const el =
    document.getElementById(
      "cartItems"
    );


  const checkout =
    document.getElementById(
      "checkout"
    );


  const totalEl =
    document.getElementById(
      "total"
    );


  if (
    !el ||
    !checkout ||
    !totalEl
  ) {

    return;
  }


  const selected =
    products.filter(
      p =>
        cart[p.id]
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
                  × ${cart[p.id]}
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


  totalEl.innerHTML = `

    <div class="summary-line">

      <span>
        Сума:
      </span>

      <strong>
        ${money(subtotal)}
      </strong>

    </div>


    <div class="summary-line discount">

      <span>
        Знижка за онлайн-замовлення (10%):
      </span>

      <strong>
        −${money(onlineDiscount)}
      </strong>

    </div>


    <div class="summary-line final">

      <span>
        До сплати після знижки:
      </span>

      <strong>
        ${money(finalTotal)}
      </strong>

    </div>


    <div class="summary-line donation">

      <span>
        20% на користь Парасольки:
      </span>

      <strong>
        ${money(parasolkaAmount)}
      </strong>

    </div>

  `;


  checkout.disabled =
    subtotal === 0;
}


/**
 * Загрузка каталога.
 */
async function loadProducts() {

  const catalog =
    document.getElementById(
      "catalog"
    );


  if (!catalog) {
    return;
  }


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
            Number(p.price) || 0,

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


/**
 * Открытие формы заказа.
 */
const checkoutButton =
  document.getElementById(
    "checkout"
  );


if (checkoutButton) {

  checkoutButton.onclick =
    async () => {

      const modal =
        document.getElementById(
          "modal"
        );


      if (modal) {

        modal.classList.remove(
          "hidden"
        );
      }


      /*
       * Автоматически подставляем
       * имя и телефон клиента.
       */
      await loadCustomerData();

    };
}


/**
 * Закрытие формы.
 */
const closeButton =
  document.getElementById(
    "close"
  );


if (closeButton) {

  closeButton.onclick =
    () => {

      const modal =
        document.getElementById(
          "modal"
        );


      if (modal) {

        modal.classList.add(
          "hidden"
        );
      }

    };
}


/**
 * Отправка заказа.
 */
const sendButton =
  document.getElementById(
    "send"
  );


if (sendButton) {

  sendButton.onclick =
    async () => {

      const nameInput =
        document.getElementById(
          "name"
        );


      const phoneInput =
        document.getElementById(
          "phone"
        );


      const commentInput =
        document.getElementById(
          "comment"
        );


      const name =
        nameInput
          ? nameInput.value.trim()
          : "";


      const phone =
        phoneInput
          ? phoneInput.value.trim()
          : "";


      if (
        !name ||
        !phone
      ) {

        alert(
          "Будь ласка, вкажіть ім’я та телефон."
        );

        return;
      }


      const items =
        products
          .filter(
            p =>
              cart[p.id]
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


      if (!items.length) {

        alert(
          "Кошик порожній."
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

        comment:
          commentInput
            ? commentInput.value.trim()
            : "",

        items,

        subtotal,

        onlineDiscount,

        total,

        parasolkaAmount,

        telegramUser:
          tg?.initDataUnsafe?.user ||
          null

      };


      sendButton.disabled =
        true;


      sendButton.textContent =
        "Відправляємо…";


      try {

        /*
         * Сохраняем локально.
         */
        saveCustomerLocally(
          name,
          phone
        );


        /*
         * Отправляем заказ.
         */
        await fetch(
          APPS_SCRIPT_URL,
          {

            method: "POST",

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


        const modal =
          document.getElementById(
            "modal"
          );


        if (modal) {

          modal.classList.add(
            "hidden"
          );
        }


        Object.keys(cart)
          .forEach(
            k =>
              delete cart[k]
          );


        render();


        alert(
          "Замовлення успішно відправлено! Ми зв’яжемося з вами для підтвердження."
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
}


/**
 * Приветствие пользователя Telegram.
 */
if (
  tg?.initDataUnsafe?.user
) {

  const userElement =
    document.getElementById(
      "user"
    );


  if (userElement) {

    userElement.textContent =
      "Вітаємо, " +
      (
        tg
          .initDataUnsafe
          .user
          .first_name ||
        ""
      );

  }
}


/**
 * Старт приложения.
 */
loadProducts();
