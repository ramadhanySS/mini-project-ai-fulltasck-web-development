# Molecule Product API

REST API Express dengan PostgreSQL untuk mengelola data produk.

## Menjalankan dengan Docker

Jalankan dari root proyek:

```powershell
docker compose up --build -d
```

Compose menjalankan PostgreSQL dan API. API menunggu database siap, lalu tersedia di `http://localhost:3000`. Periksa koneksi di `http://localhost:3000/api/health`.

Untuk menghentikan container tanpa menghapus data:

```powershell
docker compose down
```

Data PostgreSQL disimpan di named volume `postgres_data`. Untuk menghapus container sekaligus datanya, jalankan `docker compose down -v`.

Password database default hanya untuk pengembangan lokal. Ubah dengan membuat variabel `POSTGRES_PASSWORD` di file `.env` pada root proyek.

## Menjalankan API tanpa Docker

1. Pastikan PostgreSQL aktif dan database `molecule_store` sudah dibuat.
2. Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL` dengan kredensial PostgreSQL lokal.
3. Jalankan `npm install` dan `npm start` dari folder `backend`.

Saat server pertama kali berjalan, tabel `products` dibuat otomatis dan diisi dua produk demo: Molecule 01 + Champaca dan Escentric 04. Data Escentric 04 (deskripsi, harga £130 untuk 100 ml, serta gambar) mengacu pada halaman [produk Escentric 04](https://www.escentric.com/products/escentric-04-100ml). Tabel pesanan juga dibuat otomatis; pesanan checkout demo menyimpan data pelanggan, total, dan snapshot item di PostgreSQL, tanpa memproses pembayaran.

## Menghubungkan frontend

Frontend statis berada di root proyek. Jalankan API seperti di atas, lalu buka `index.html` melalui server statis lokal (misalnya Live Server di VS Code). Frontend mengambil katalog dari `GET http://localhost:3000/api/products`; Molecule 01 + Champaca ditampilkan di `index.html` dan Escentric 04 di [`escentric-04.html`](../escentric-04.html). Keduanya menyediakan tautan ke halaman produk lain dan sidebar checkout. URL API dapat diubah lewat meta `product-api-url` di masing-masing halaman.

## Endpoint

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Memeriksa server dan koneksi database |
| GET | `/api/products` | Mengambil semua produk |
| GET | `/api/products/:id` | Mengambil satu produk |
| POST | `/api/products` | Membuat produk |
| PUT | `/api/products/:id` | Mengganti data produk |
| DELETE | `/api/products/:id` | Menghapus produk |
| POST | `/api/orders` | Membuat pesanan demo dan menyimpan item transaksi |

Body `POST` dan `PUT` menggunakan JSON dengan field `name`, `price`, `size_ml`, `description`, `accords` (array teks), dan `images` (array URL atau teks gambar).

Contoh:

```json
{
  "name": "Molecule 01 + Champaca",
  "price": 135,
  "size_ml": 100,
  "description": "Woody floral aromatic.",
  "accords": ["Woody", "Floral", "Aromatic"],
  "images": ["https://example.com/product.jpg"]
}
```

`POST /api/orders` menerima `customer_name`, `email`, `shipping_address`, dan `items` berupa array `{ "product_id": 1, "quantity": 1 }`. Harga dan total dihitung dari data produk di database, bukan dari total yang dikirim browser.