const checkoutApiUrl = document.querySelector('meta[name="product-api-url"]').content.replace(/\/$/, "");
const checkoutPanel = document.querySelector("#checkout-panel");
const checkoutItems = document.querySelector("#checkout-items");
const checkoutEmpty = document.querySelector("#checkout-empty");
const checkoutTotal = document.querySelector("#checkout-total");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutStatus = document.querySelector("#checkout-status");
const checkoutSubmit = document.querySelector("#checkout-submit");
const bagButton = document.querySelector(".bag-button");
const bagCount = document.querySelector("#bag-count");
const cart = new Map();
const cartStorageKey = "escentric-demo-cart";

function restoreCart() {
  const savedCart = window.localStorage.getItem(cartStorageKey);
  if (!savedCart) return;

  try {
    const savedItems = JSON.parse(savedCart);
    if (
      !Array.isArray(savedItems) ||
      !savedItems.every((item) =>
        item &&
        Number.isInteger(item.id) &&
        item.id > 0 &&
        typeof item.name === "string" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        typeof item.image === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 10
      )
    ) {
      throw new Error("Format tas tersimpan tidak valid.");
    }
    savedItems.forEach((item) => cart.set(item.id, item));
  } catch (error) {
    console.error("Gagal memulihkan tas belanja:", error);
    checkoutStatus.textContent = "Tas sebelumnya tidak dapat dipulihkan. Tambahkan kembali produk untuk melanjutkan.";
  }
}

function checkoutFormatPrice(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderCart() {
  checkoutItems.replaceChildren();
  let itemCount = 0;
  let totalInPence = 0;

  cart.forEach((item) => {
    itemCount += item.quantity;
    totalInPence += Math.round(item.price * 100) * item.quantity;

    const row = document.createElement("article");
    row.className = "checkout-item";
    if (item.image) {
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = "";
      row.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "checkout-item-placeholder";
      placeholder.textContent = item.name;
      row.append(placeholder);
    }

    const details = document.createElement("div");
    details.className = "checkout-item-details";
    const name = document.createElement("h3");
    name.textContent = item.name;
    const price = document.createElement("p");
    price.textContent = checkoutFormatPrice(item.price);
    const controls = document.createElement("div");
    controls.className = "checkout-quantity";

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.setAttribute("aria-label", `Kurangi ${item.name}`);
    decrease.textContent = "−";
    decrease.addEventListener("click", () => {
      if (item.quantity === 1) cart.delete(item.id);
      else item.quantity -= 1;
      renderCart();
    });
    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;
    const increase = document.createElement("button");
    increase.type = "button";
    increase.setAttribute("aria-label", `Tambah ${item.name}`);
    increase.textContent = "+";
    increase.disabled = item.quantity >= 10;
    increase.addEventListener("click", () => {
      if (item.quantity < 10) item.quantity += 1;
      renderCart();
    });
    controls.append(decrease, quantity, increase);

    const remove = document.createElement("button");
    remove.className = "checkout-remove";
    remove.type = "button";
    remove.textContent = "Hapus";
    remove.addEventListener("click", () => {
      cart.delete(item.id);
      renderCart();
    });

    details.append(name, price, controls);
    row.append(details, remove);
    checkoutItems.append(row);
  });

  bagCount.textContent = itemCount;
  bagButton.setAttribute("aria-label", `Tas belanja, ${itemCount} item`);
  checkoutTotal.textContent = checkoutFormatPrice(totalInPence / 100);
  checkoutEmpty.hidden = itemCount > 0;
  checkoutForm.hidden = itemCount === 0;
  checkoutSubmit.disabled = itemCount === 0;
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify([...cart.values()]));
  } catch (error) {
    console.error("Gagal menyimpan tas belanja pada browser:", error);
    checkoutStatus.textContent = "Tas aktif, tetapi browser tidak dapat menyimpannya untuk halaman lain.";
  }
}

window.addEventListener("cart:add", (event) => {
  const { product, quantity } = event.detail;
  if (
    !product ||
    !Number.isInteger(product.id) ||
    product.id < 1 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10
  ) {
    console.error("Data produk untuk keranjang tidak valid.", event.detail);
    checkoutStatus.textContent = "Produk tidak dapat ditambahkan ke tas karena datanya tidak valid.";
    return;
  }

  const existingItem = cart.get(product.id);
  const nextQuantity = (existingItem?.quantity || 0) + quantity;
  if (nextQuantity > 10) {
    checkoutStatus.textContent = `Maksimum 10 ${product.name} untuk satu pesanan.`;
    if (!checkoutPanel.open) checkoutPanel.showModal();
    return;
  }
  cart.set(product.id, { ...product, quantity: nextQuantity });
  checkoutStatus.textContent = "";
  restoreCart();
  renderCart();
  if (!checkoutPanel.open) checkoutPanel.showModal();
});

bagButton.addEventListener("click", () => {
  if (!checkoutPanel.open) checkoutPanel.showModal();
});

document.querySelector("#checkout-close").addEventListener("click", () => checkoutPanel.close());
checkoutPanel.addEventListener("click", (event) => {
  if (event.target === checkoutPanel) checkoutPanel.close();
});

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (cart.size === 0) return;

  const formData = new FormData(checkoutForm);
  const requestBody = {
    customer_name: formData.get("customer_name"),
    email: formData.get("email"),
    shipping_address: formData.get("shipping_address"),
    items: [...cart.values()].map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
  };

  checkoutSubmit.disabled = true;
  checkoutStatus.textContent = "Menyimpan pesanan…";
  try {
    const response = await fetch(`${checkoutApiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result.errors?.join(". ") || result.error || `Server merespons dengan status ${response.status}.`;
      throw new Error(message);
    }

    cart.clear();
    checkoutForm.reset();
    renderCart();
    checkoutStatus.textContent = `Pesanan #${result.id} berhasil dicatat. Ini demo transaksi; pembayaran tidak diproses.`;
  } catch (error) {
    console.error("Gagal menyimpan transaksi checkout:", error);
    checkoutStatus.textContent = `Pesanan gagal disimpan: ${error.message}`;
  } finally {
    checkoutSubmit.disabled = cart.size === 0;
  }
});

renderCart();
