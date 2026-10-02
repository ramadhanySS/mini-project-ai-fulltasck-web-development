const API_BASE_URL = document.querySelector('meta[name="product-api-url"]').content.replace(/\/$/, "");
const quantityOutput = document.querySelector("#quantity");
const toast = document.querySelector("#toast");
const heroImage = document.querySelector("#hero-image");
const quantityMinus = document.querySelector("#quantity-minus");
const quantityPlus = document.querySelector("#quantity-plus");
const zoomDialog = document.querySelector("#image-zoom");
const zoomImage = document.querySelector("#zoom-image");
const gallery = document.querySelector(".gallery");
const thumbnailList = document.querySelector(".thumbnail-list");
const zoomThumbnailList = document.querySelector("#zoom-thumbnails");
const productStatus = document.querySelector("#product-status");
const productGrid = document.querySelector("#product-grid");
const selectedProductName = document.querySelector('meta[name="product-name"]')?.content || "";
let thumbnails = [...document.querySelectorAll(".thumbnail")];
let zoomThumbnails = [...document.querySelectorAll(".zoom-thumbnail")];
let quantity = 1;
let activeImageIndex = 0;
let productName = selectedProductName || "Molecule 01 + Champaca";
let currentProduct = {
  id: 1,
  name: productName,
  price: 135,
  size_ml: 100,
};
let toastTimer;

function formatPrice(price) {
  const value = Number(price);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function updateQuantity(nextQuantity) {
  quantity = Math.min(10, Math.max(1, nextQuantity));
  quantityOutput.textContent = quantity;
  quantityMinus.disabled = quantity === 1;
  quantityPlus.disabled = quantity === 10;
}

quantityMinus.addEventListener("click", () => updateQuantity(quantity - 1));
quantityPlus.addEventListener("click", () => updateQuantity(quantity + 1));
updateQuantity(quantity);

function updateImageControls() {
  thumbnails = [...document.querySelectorAll(".thumbnail")];
  zoomThumbnails = [...document.querySelectorAll(".zoom-thumbnail")];
}

function selectProductImage(index) {
  if (!thumbnails.length) return;

  const thumbnail = thumbnails[index];
  activeImageIndex = index;
  thumbnails.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === index);
    item.setAttribute("aria-pressed", String(itemIndex === index));
  });
  zoomThumbnails.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === index);
    item.setAttribute("aria-pressed", String(itemIndex === index));
  });
  heroImage.src = thumbnail.dataset.image;
  heroImage.alt = thumbnail.querySelector("img").alt;
  zoomImage.src = heroImage.src;
  zoomImage.alt = heroImage.alt;
  const position = `${String(index + 1).padStart(2, "0")} / ${String(thumbnails.length).padStart(2, "0")}`;
  document.querySelector("#image-index").textContent = position;
  document.querySelector("#zoom-position").textContent = position;
}

function renderImages(images) {
  thumbnailList.replaceChildren();
  zoomThumbnailList.replaceChildren();
  activeImageIndex = 0;

  images.forEach((image, index) => {
    const alt = `${productName}, gambar ${index + 1}`;
    const thumbnail = document.createElement("button");
    thumbnail.className = `thumbnail${index === 0 ? " is-active" : ""}`;
    thumbnail.type = "button";
    thumbnail.setAttribute("aria-label", `Tampilkan gambar ${index + 1}`);
    thumbnail.setAttribute("aria-pressed", String(index === 0));
    thumbnail.dataset.image = image;
    const thumbnailImage = document.createElement("img");
    thumbnailImage.src = image;
    thumbnailImage.alt = alt;
    thumbnail.append(thumbnailImage);
    thumbnail.addEventListener("click", () => selectProductImage(index));
    thumbnailList.append(thumbnail);

    const zoomThumbnail = document.createElement("button");
    zoomThumbnail.className = `zoom-thumbnail${index === 0 ? " is-active" : ""}`;
    zoomThumbnail.type = "button";
    zoomThumbnail.setAttribute("aria-label", `Tampilkan gambar ${index + 1}`);
    zoomThumbnail.setAttribute("aria-pressed", String(index === 0));
    const zoomThumbnailImage = document.createElement("img");
    zoomThumbnailImage.src = image;
    zoomThumbnailImage.alt = "";
    zoomThumbnail.append(zoomThumbnailImage);
    zoomThumbnail.addEventListener("click", () => selectProductImage(index));
    zoomThumbnailList.append(zoomThumbnail);
  });

  updateImageControls();
  gallery.hidden = images.length === 0;
  if (images.length) selectProductImage(0);
}

function renderProduct(product) {
  const accordsAreValid = Array.isArray(product.accords) && product.accords.every((item) => typeof item === "string");
  const imagesAreValid = Array.isArray(product.images) && product.images.every((item) => typeof item === "string");
  if (
    typeof product.name !== "string" ||
    !Number.isFinite(Number(product.price)) ||
    !Number.isFinite(Number(product.size_ml)) ||
    typeof product.description !== "string" ||
    !accordsAreValid ||
    !imagesAreValid
  ) {
    throw new Error("Format data produk dari API tidak sesuai.");
  }

  currentProduct = product;
  productName = product.name;
  document.querySelector("#product-title").textContent = productName;
  document.querySelector("#breadcrumb-product-name").textContent = productName;
  document.title = `${productName} | Escentric Molecules`;
  document.querySelector("#product-price").textContent = formatPrice(product.price);
  document.querySelector("#product-size").textContent = `${product.size_ml} ml`;
  document.querySelector("#product-intro").textContent = product.description;
  document.querySelector("#product-description").textContent = product.description;
  document.querySelector("#product-accords").replaceChildren(
    ...product.accords.map((accord) => {
      const tag = document.createElement("span");
      tag.textContent = accord;
      return tag;
    }),
  );
  document.querySelector("#product-accords-description").textContent = product.accords.join(" · ");
  renderImages(product.images.filter((image) => image.trim()));
}

function renderRelatedProducts(products) {
  productGrid.replaceChildren();
  products.filter((product) => product.id !== currentProduct.id).forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    const visual = document.createElement("div");
    visual.className = "product-card-visual";
    const image = product.images.find((source) => source.trim());
    if (image) {
      const imageElement = document.createElement("img");
      imageElement.src = image;
      imageElement.alt = product.name;
      visual.append(imageElement);
    } else {
      visual.classList.add("is-placeholder");
      const label = document.createElement("span");
      label.textContent = product.name;
      visual.append(label);
    }

    const details = document.createElement("div");
    details.className = "product-card-details";
    const title = document.createElement("h3");
    title.textContent = product.name;
    const size = document.createElement("span");
    size.textContent = `${product.size_ml} ml`;
    const price = document.createElement("p");
    price.textContent = formatPrice(product.price);
    const addButton = document.createElement("button");
    addButton.className = "product-card-add";
    addButton.type = "button";
    addButton.textContent = "Tambah ke tas";
    addButton.addEventListener("click", () => addProductToBag(product, 1));

    details.append(title, size, price);
    if (product.name === "Escentric 04") {
      const pageLink = document.createElement("a");
      pageLink.className = "product-card-link";
      pageLink.href = "escentric-04.html";
      pageLink.textContent = "Lihat detail produk";
      details.append(pageLink);
    }
    details.append(addButton);
    card.append(visual, details);
    productGrid.append(card);
  });

  document.querySelector(".related-products").hidden = productGrid.childElementCount === 0;
}

function addProductToBag(product, itemQuantity) {
  window.dispatchEvent(new CustomEvent("cart:add", {
    detail: {
      product: {
        id: Number(product.id),
        name: product.name,
        price: Number(product.price),
        image: product.images.find((source) => source.trim()) || "",
      },
      quantity: itemQuantity,
    },
  }));
  toast.textContent = `${itemQuantity} ${product.name} ditambahkan ke tas`;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function loadProduct() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error(`API merespons dengan status ${response.status}.`);

    const products = await response.json();
    if (!Array.isArray(products)) throw new Error("Format daftar produk dari API tidak sesuai.");
    if (products.some((product) =>
      !product ||
      !Number.isInteger(Number(product.id)) ||
      Number(product.id) < 1 ||
      typeof product.name !== "string" ||
      !Number.isFinite(Number(product.price)) ||
      !Number.isFinite(Number(product.size_ml)) ||
      typeof product.description !== "string" ||
      !Array.isArray(product.accords) ||
      !product.accords.every((item) => typeof item === "string") ||
      !Array.isArray(product.images) ||
      !product.images.every((item) => typeof item === "string")
    )) {
      throw new Error("Format data produk dari API tidak sesuai.");
    }
    if (products.length === 0) {
      productStatus.textContent = "Belum ada produk di API. Menampilkan data demo.";
      return;
    }

    const product = selectedProductName
      ? products.find((item) => item.name === selectedProductName)
      : products[0];
    if (!product) throw new Error(`Produk "${selectedProductName}" tidak ditemukan di katalog API.`);

    renderProduct(product);
    renderRelatedProducts(products);
    productStatus.hidden = true;
  } catch (error) {
    console.error("Gagal memuat produk dari API:", error);
    productStatus.textContent = "Produk tidak dapat dimuat dari API. Pastikan backend dan database berjalan. Menampilkan data demo.";
  }
}

document.querySelector("#zoom-trigger").addEventListener("click", () => {
  selectProductImage(activeImageIndex);
  zoomDialog.showModal();
});
thumbnails.forEach((thumbnail, index) => {
  thumbnail.addEventListener("click", () => selectProductImage(index));
});
zoomThumbnails.forEach((thumbnail, index) => {
  thumbnail.addEventListener("click", () => selectProductImage(index));
});
document.querySelector("#zoom-close").addEventListener("click", () => zoomDialog.close());
document.querySelector("#zoom-previous").addEventListener("click", () => {
  selectProductImage((activeImageIndex + thumbnails.length - 1) % thumbnails.length);
});
document.querySelector("#zoom-next").addEventListener("click", () => {
  selectProductImage((activeImageIndex + 1) % thumbnails.length);
});
zoomDialog.addEventListener("click", (event) => {
  if (event.target === zoomDialog) zoomDialog.close();
});
zoomDialog.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") selectProductImage((activeImageIndex + thumbnails.length - 1) % thumbnails.length);
  if (event.key === "ArrowRight") selectProductImage((activeImageIndex + 1) % thumbnails.length);
});

document.querySelector("#wishlist-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const isSaved = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(isSaved));
  document.querySelector("#wishlist-label").textContent = isSaved ? "Ditambahkan ke wishlist" : "Tambah ke wishlist";
  button.querySelector(".wishlist-icon").textContent = isSaved ? "♥" : "♡";
});

document.querySelectorAll(".product-details details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll(".product-details details").forEach((otherDetail) => {
      if (otherDetail !== detail) otherDetail.open = false;
    });
  });
});

document.querySelector("#add-to-bag").addEventListener("click", () => {
  addProductToBag(currentProduct, quantity);
});

loadProduct();