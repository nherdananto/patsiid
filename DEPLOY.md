# Panduan Deploy — PATSI.ID

Website PATSI.ID adalah situs statis (HTML/CSS/JS) yang bisa di-deploy ke hampir semua hosting. Paket siap upload tersedia di:

```
/app/patsi-static-site.zip
```

Isi paket:

```
index.html          → Halaman Home
about.html          → Halaman About PATSI
membership.html     → Halaman Membership
contact.html        → Halaman Contact
favicon.svg
css/style.css
js/script.js
images/             → Logo PATSI, logo 17 anggota, foto
```

PENTING: Semua path memakai root absolut (`/css/...`, `/images/...`), jadi file HARUS di-upload ke root domain (contoh: `public_html/`), bukan subfolder.

---

## Opsi 1 — Hosting cPanel / Shared Hosting (paling umum untuk patsi.id)

1. Login ke cPanel → buka **File Manager** → masuk ke folder `public_html/`
2. Upload `patsi-static-site.zip`, lalu klik **Extract** di dalam `public_html/`
3. Pastikan struktur akhir seperti ini:
   ```
   public_html/
   ├── index.html
   ├── about.html
   ├── membership.html
   ├── contact.html
   ├── favicon.svg
   ├── css/
   ├── js/
   └── images/
   ```
4. Buka https://patsi.id — selesai.

## Opsi 2 — Netlify / Vercel / Cloudflare Pages (gratis, cepat)

1. Ekstrak zip di komputer Anda
2. Drag & drop folder hasil ekstrak ke dashboard Netlify Drop (atau `vercel deploy`)
3. Arahkan domain patsi.id ke nameserver/DNS yang diberikan

## Opsi 3 — VPS (Nginx)

```nginx
server {
    listen 80;
    server_name patsi.id www.patsi.id;
    root /var/www/patsi;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

Upload isi zip ke `/var/www/patsi`, lalu `sudo nginx -t && sudo systemctl reload nginx`.

---

## Formulir Kontak — 2 Mode

Formulir di `contact.html` mengirim data ke endpoint `POST /api/contact`.

**Mode A — Tanpa backend (statis murni):**
Tidak ada langkah tambahan. Jika endpoint tidak ada, formulir otomatis menampilkan pesan fallback yang mengarahkan pengunjung mengirim email langsung ke pengurus@patsi.id. Tidak ada data yang tersimpan.

**Mode B — Dengan email fungsional (direkomendasikan):**
Backend FastAPI sudah siap di `/app/backend/` dan akan:
1. Menyimpan setiap pesan ke MongoDB (koleksi `contact_messages`)
2. Meneruskan pesan ke pengurus@patsi.id via Resend

Langkah mengaktifkan email:
1. Buat API key di https://resend.com (Dashboard → API Keys → Create)
2. Verifikasi domain `patsi.id` di Resend agar bisa kirim dari alamat `@patsi.id` (atau sementara pakai `onboarding@resend.dev`)
3. Isi di `/app/backend/.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   SENDER_EMAIL="PATSI.ID <no-reply@patsi.id>"
   CONTACT_RECIPIENT="pengurus@patsi.id"
   ```
4. Restart backend: `sudo supervisorctl restart backend`
5. Uji: kirim pesan lewat formulir → balasan API berisi `"email_sent": true`

---

## Checklist Setelah Deploy

- [ ] https://patsi.id membuka halaman Home
- [ ] /about.html, /membership.html, /contact.html bisa diakses
- [ ] Logo dan 17 logo anggota tampil
- [ ] Menu mobile (hamburger) berfungsi
- [ ] Formulir kontak terkirim (cek email pengurus@patsi.id jika Mode B aktif)
- [ ] SSL/HTTPS aktif (di cPanel: AutoSSL; di Netlify/Vercel: otomatis)
