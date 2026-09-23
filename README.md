# NamaBayiIslami

Situs pencari nama bayi Islami untuk orang tua Muslim Indonesia. 100% statis —
HTML/CSS/JS murni tanpa framework, dihosting di Cloudflare Workers static assets.

## Struktur

- `index.html` — pencari nama (cari + saring jenis kelamin, huruf awal, tema, sumber, suku kata, panjang; favorit via localStorage)
- `rangkaian.html` — generator rangkaian nama + mode gabung nama orang tua
- `metodologi.html` — cara verifikasi arti dan label keyakinan
- `names.js` — dataset nama (satu file, dimuat klien)
- `404.html` — halaman tidak ditemukan (dipakai wrangler)
- `wrangler.jsonc` — konfigurasi Cloudflare Workers

## Dataset

Setiap entri: nama latin, tulisan Arab berharakat, transliterasi, jenis kelamin,
arti (Bahasa Indonesia), tema, kategori sumber, rujukan, varian ejaan, panggilan
sayang, tingkat popularitas, label "tidak pasaran", dan tingkat keyakinan arti.
Arti diverifikasi sebelum masuk; nama yang belum terverifikasi tidak ditampilkan.

## Deploy

Setiap push ke `main` memicu build otomatis via Cloudflare Workers Builds
(integrasi Git). Tidak ada perintah build — repo root adalah root situs.
