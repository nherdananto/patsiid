# Panduan Deploy — PATSI.ID (Ubuntu 22.04 Server Baru)

Arsitektur di server:

```
Internet → Nginx (port 80/443)
            ├── /          → file statis situs (HTML/CSS/JS/gambar)
            └── /api/      → FastAPI (uvicorn, 127.0.0.1:8001) → MongoDB + Resend (email)
```

Yang dibutuhkan sebelum mulai:
- Server Ubuntu 22.04 baru dengan akses root/sudo
- Domain `patsi.id` — buat DNS **A record** `@` dan `www` mengarah ke IP server
- API key Resend dari https://resend.com (untuk email formulir kontak)

---

## Langkah 1 — Update Server & Firewall

```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Langkah 2 — Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable --now nginx
```

Buka http://IP-SERVER — halaman default Nginx harus tampil.

## Langkah 3 — Install MongoDB 7

```bash
sudo apt install gnupg curl -y
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install mongodb-org -y
sudo systemctl enable --now mongod
mongod --version
```

## Langkah 4 — Install Python 3.11

```bash
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update && sudo apt install python3.11 python3.11-venv -y
```

## Langkah 5 — Upload File Website

Pilih salah satu:

**Opsi A — dari git (direkomendasikan):**
```bash
sudo apt install git -y
sudo mkdir -p /var/www/patsi && sudo chown $USER:$USER /var/www/patsi
git clone <URL-REPO-ANDA> /tmp/patsi-repo
cp -r /tmp/patsi-repo/frontend/public/* /var/www/patsi/
cp -r /tmp/patsi-repo/backend /var/www/patsi-api
```

**Opsi B — upload zip dari komputer lokal:**
```bash
# di komputer lokal:
scp patsi-static-site.zip user@IP-SERVER:/tmp/
scp -r backend user@IP-SERVER:/tmp/patsi-api

# di server:
sudo apt install unzip -y
sudo mkdir -p /var/www/patsi && sudo chown $USER:$USER /var/www/patsi
unzip /tmp/patsi-static-site.zip -d /var/www/patsi
mv /tmp/patsi-api /var/www/patsi-api
```

Hasil akhir:
```
/var/www/patsi/        → index.html, about.html, membership.html, contact.html, css/, js/, images/, favicon.svg
/var/www/patsi-api/    → server.py, requirements.txt, .env
```

## Langkah 6 — Setup Backend (FastAPI)

```bash
cd /var/www/patsi-api
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt
```

Buat file `.env`:

```bash
nano /var/www/patsi-api/.env
```

Isi:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="patsi"
CORS_ORIGINS="https://patsi.id,https://www.patsi.id"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
SENDER_EMAIL="PATSI.ID <no-reply@patsi.id>"
CONTACT_RECIPIENT="pengurus@patsi.id"
```

> Agar bisa mengirim dari `@patsi.id`, verifikasi domain di dashboard Resend (Domain → Add Domain → tambahkan record DNS DKIM/SPF yang diberikan). Sebelum domain terverifikasi, sementara gunakan `SENDER_EMAIL="PATSI.ID <onboarding@resend.dev>"`.

## Langkah 7 — Service systemd untuk Backend

```bash
sudo nano /etc/systemd/system/patsi-api.service
```

Isi:

```ini
[Unit]
Description=PATSI.ID API
After=network.target mongod.service

[Service]
User=root
WorkingDirectory=/var/www/patsi-api
ExecStart=/var/www/patsi-api/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now patsi-api
sudo systemctl status patsi-api
curl http://127.0.0.1:8001/api/   # harus menjawab {"message":"PATSI.ID API"}
```

## Langkah 8 — Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/patsi
```

Isi:

```nginx
server {
    listen 80;
    server_name patsi.id www.patsi.id;

    root /var/www/patsi;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/patsi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Langkah 9 — HTTPS (SSL Gratis)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d patsi.id -d www.patsi.id
```

Certbot otomatis memasang sertifikat dan redirect HTTP → HTTPS. Perpanjangan otomatis sudah terjadwal.

## Langkah 10 — Verifikasi

```bash
curl https://patsi.id/                                   # halaman Home
curl https://patsi.id/api/                               # API hidup
curl -X POST https://patsi.id/api/contact \
  -H "Content-Type: application/json" \
  -d '{"nama":"Uji Coba","perusahaan":"PT Uji","email":"uji@test.com","telepon":"0812","pesan":"Tes formulir kontak"}'
# balasan harus berisi "email_sent": true → cek inbox pengurus@patsi.id
```

## Checklist Akhir

- [ ] https://patsi.id membuka halaman Home
- [ ] /about.html, /membership.html, /contact.html bisa diakses
- [ ] Logo PATSI dan 24 logo anggota tampil di marquee
- [ ] Menu mobile (hamburger) berfungsi
- [ ] Formulir kontak terkirim dan email masuk ke pengurus@patsi.id
- [ ] HTTPS aktif dengan gembok hijau

## Perintah Berguna

```bash
sudo systemctl restart patsi-api          # restart backend setelah ubah .env
journalctl -u patsi-api -f                # melihat log backend
sudo tail -f /var/log/nginx/error.log     # log nginx
```

---

# Alternatif — Hosting Statis (tanpa backend)

Jika formulir kontak tidak diperlukan (pengunjung diarahkan mengirim email manual), situs bisa di-hosting murni statis:

**cPanel / Shared Hosting:** upload `patsi-static-site.zip` ke `public_html/` lalu Extract. File HARUS di root domain karena semua path memakai root absolut (`/css/...`, `/images/...`).

**Netlify / Vercel / Cloudflare Pages:** ekstrak zip, drag & drop foldernya ke dashboard, arahkan DNS domain.

Tanpa backend, formulir otomatis menampilkan pesan fallback yang mengarahkan pengunjung ke pengurus@patsi.id.

