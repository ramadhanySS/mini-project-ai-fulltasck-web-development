# Mini PRD: Molecule 01 + Champaca

**Studi kasus:** halaman produk Molecule 01 + Champaca dan Escentric 04  
**Konteks:** pembelajaran Front-end Development  
**Teknologi:** HTML, CSS, JavaScript murni, Express, PostgreSQL  
**Platform:** web responsif, halaman produk dan sidebar checkout  
**Versi:** 1.0 · 1 Oktober 2026

## 1. Overview

Dokumen ini mendefinisikan mini product requirements document untuk membangun halaman produk Molecule 01 + Champaca sebagai studi kasus pembelajaran front-end. Halaman mengambil pola dari halaman produk Escentric Molecules: galeri foto, ringkasan aroma dan harga, pemilih jumlah, tombol tambah ke tas, serta informasi produk yang dapat dibuka.

Frontend mengambil katalog produk dari REST API Express dan PostgreSQL. Halaman kedua menampilkan Escentric 04 100 ml (£130), berdasarkan data pada halaman produk resminya. Sidebar checkout menyimpan transaksi demo ke database, tetapi tidak memproses pembayaran.

**Referensi:** [Molecule 01 + Champaca | Escentric Molecules](https://www.escentric.com/products/molecule-01-champaca)

## 2. Problem + Target User

### Problem

Pengunjung halaman produk perlu memahami produk dan karakter aromanya, melihat visual botol, memilih jumlah, lalu memperoleh umpan balik yang jelas saat menambahkan produk ke tas. Untuk pembelajar front-end, studi kasus ini perlu cukup nyata untuk melatih struktur semantik, layout responsif, aksesibilitas dasar, interaksi DOM, dan konsumsi REST API tanpa bergantung pada framework front-end.

### Target User

- **Calon pembeli parfum niche:** ingin memindai nama, ukuran, harga, karakter aroma, dan visual sebelum mengambil keputusan.
- **Pembelajar front-end pemula:** ingin mempelajari implementasi satu alur e-commerce kecil menggunakan HTML, CSS, dan JavaScript murni.

## 3. Goals + Non-Goals

### Goals

- Menyediakan dua halaman produk, dengan tautan navigasi antarproduk.
- Membuat galeri gambar, kontrol kuantitas, dan umpan balik tambah ke tas berfungsi tanpa reload.
- Menyimpan pesanan demo beserta item transaksi dari sidebar checkout.
- Menjaga konten dan kontrol tetap terbaca serta dapat digunakan pada desktop dan ponsel.
- Menunjukkan praktik dasar HTML semantik, label aksesibel, CSS responsif, dan manipulasi DOM.

### Non-Goals

- Pembayaran, pajak, ongkos kirim aktual, akun, wishlist tersimpan, atau integrasi e-commerce.
- Autentikasi, pencarian katalog, atau halaman produk lain.
- Pemilihan ukuran/varian selain ukuran referensi 100 ml.
- Menyalin seluruh situs, navigasi multi-halaman, promosi pop-up, atau sistem analitik.

## 4. User Flow

1. Pengunjung membuka halaman dan melihat produk utama serta produk lainnya.
2. Pengunjung memilih thumbnail untuk mengganti foto utama.
3. Pengunjung membaca deskripsi atau informasi aroma/pengiriman melalui panel detail.
4. Pengunjung memilih jumlah, lalu menambahkan produk ke tas.
5. Sidebar checkout terbuka; pengunjung memeriksa item dan total lalu mengisi informasi pengiriman.
6. Pengunjung membuat pesanan demo; API menghitung total berdasarkan harga katalog dan menyimpan transaksi tanpa memproses pembayaran.

## 5. Features + Requirements

| ID | Fitur | Requirement |
| --- | --- | --- |
| F-01 | Informasi produk | Ambil produk dari `GET /api/products` dan tampilkan nama, harga, ukuran, deskripsi, serta karakter aroma dari API. |
| F-02 | Galeri | Tampilkan satu foto utama dan minimal dua thumbnail. Memilih thumbnail memperbarui foto utama, teks alternatif, status terpilih, dan indeks gambar. |
| F-03 | Kuantitas | Sediakan kontrol tambah/kurang dengan nilai awal 1 dan batas bawah 1. Nilai selalu terlihat. |
| F-04 | Tas dan checkout | Klik tambah ke tas memperbarui sidebar checkout, jumlah, dan total; checkout menyimpan transaksi demo ke API. |
| F-05 | Informasi tambahan | Sediakan panel deskripsi, karakter aroma, serta pengiriman/pengembalian yang dapat dibuka dan ditutup. |
| F-06 | Responsif | Susun galeri dan informasi berdampingan pada layar lebar dan bertumpuk pada layar kecil tanpa scroll horizontal. |
| F-07 | Aksesibilitas dasar | Gunakan landmark dan heading semantik, tombol dengan nama aksesibel, alt gambar, focus keyboard bawaan, dan status dinamis yang diumumkan. |
| F-08 | Batas prototipe | Tampilkan keterangan bahwa halaman adalah demo dan tidak memproses pembayaran. |

## 6. User Stories

- Sebagai calon pembeli, saya ingin melihat beberapa foto produk agar dapat memahami botol dan kemasannya.
- Sebagai calon pembeli, saya ingin melihat harga, ukuran, dan karakter aroma agar dapat menilai produk tanpa mencari informasi terpisah.
- Sebagai calon pembeli, saya ingin memilih jumlah dan mendapatkan konfirmasi setelah menambahkannya ke tas agar tindakan saya terasa berhasil.
- Sebagai pengguna ponsel, saya ingin informasi dan kontrol menyesuaikan lebar layar agar halaman tetap nyaman digunakan.
- Sebagai pembelajar, saya ingin melihat alur interaktif yang dibuat dengan JavaScript murni agar dapat mempelajari event dan manipulasi DOM.

## 7. Acceptance Criteria

- **AC-01:** Saat halaman dimuat, nama produk, harga £135, ukuran 100 ml, karakter aroma, foto utama, dan kuantitas 1 terlihat.
- **AC-02:** Saat thumbnail lain dipilih, foto utama dan alt text berubah sesuai thumbnail; hanya thumbnail aktif yang ditandai terpilih.
- **AC-03:** Saat tombol kurang ditekan pada kuantitas 1, nilainya tetap 1.
- **AC-04:** Saat tombol tambah ditekan, kuantitas bertambah tepat satu dan nilai terbaru langsung terlihat.
- **AC-05:** Saat tambah ke tas ditekan, sidebar terbuka dan menampilkan item serta total terbaru.
- **AC-06:** Panel detail bisa dibuka dan ditutup menggunakan mouse maupun keyboard.
- **AC-07:** Checkout demo menyimpan transaksi dan itemnya melalui API; total dihitung dari harga database.
- **AC-08:** Pada viewport 390 px, konten tidak menyebabkan scroll horizontal; pembayaran nyata tidak diproses dan status demo disampaikan.

## 8. Constraints + Success Criteria

### Constraints

- Frontend memakai HTML, CSS, dan JavaScript murni tanpa framework atau library UI; backend memakai Express dan PostgreSQL.
- Scope dibatasi pada dua halaman produk dan dua produk demo berukuran 100 ml.
- Harga/visual adalah snapshot studi kasus, bukan informasi penawaran atau ketersediaan yang dijamin tetap.
- Foto produk merujuk aset yang disajikan situs referensi; koneksi internet diperlukan untuk memuat gambar dan font eksternal.
- Penghitung tas hanya hidup selama sesi halaman dan tidak tersimpan setelah refresh.
- Data transaksi checkout demo disimpan di PostgreSQL, tetapi tidak ada pembayaran atau pemrosesan pesanan nyata.
- Identitas merek, nama produk, dan foto tetap milik pemilik masing-masing; implementasi ini hanya untuk pembelajaran.

### Success Criteria

- Seluruh acceptance criteria AC-01 sampai AC-08 dapat didemonstrasikan pada halaman.
- Interaksi galeri, kuantitas, detail, dan tambah ke tas bekerja tanpa error JavaScript dan tanpa reload.
- Layout dapat digunakan pada viewport desktop dan ponsel tanpa overflow horizontal.
- Frontend dapat dijalankan melalui server statis lokal dan mengambil data saat API tersedia; halaman tetap menampilkan data demo jika API tidak dapat diakses.