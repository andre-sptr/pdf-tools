# Deployment Guide: PDF Tools ke VPS Ubuntu + aaPanel

Panduan ini untuk deploy repo PDF Tools ke VPS Ubuntu menggunakan aaPanel. Struktur project saat ini:

- Frontend React + Vite ada di root project dan hasil build masuk ke `dist/`.
- Backend Express ada di `server/server.js` dan berjalan di port `3004`.
- URL backend di frontend diambil dari `VITE_API_URL` pada saat build. Jika tidak diisi, default-nya `http://localhost:3004/api`, yang hanya cocok untuk development lokal.

Contoh domain pada panduan ini: `pdf.example.com`. Ganti dengan domain Anda.

## 1. Persiapan VPS Ubuntu

Login ke VPS via SSH, lalu install dependensi sistem yang dipakai fitur PDF Tools:

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install -y ghostscript libreoffice default-jre pdftk-java unzip
```

Fungsi dependensi:

- `ghostscript`: compress PDF, PDF ke JPG, unlock PDF, PDF/A.
- `libreoffice`: Word/Excel/PPT ke PDF, PDF ke Word/PPT.
- `default-jre`: dibutuhkan `tabula-js` untuk PDF ke Excel.
- `pdftk-java`: lock PDF.

Cek setelah instalasi:

```bash
which gs
which libreoffice
java -version
pdftk --version
```

Jika command `pdftk` tidak ditemukan setelah install `pdftk-java`, coba:

```bash
sudo apt install -y pdftk
```

## 2. Install Node.js di aaPanel

1. Buka dashboard aaPanel.
2. Masuk ke **App Store**.
3. Install **Node.js version manager**.
4. Install Node.js versi 20 LTS atau minimal Node.js 18.

Project ini punya `package-lock.json` di root dan di folder `server`, jadi panduan ini memakai `npm`.

## 3. Upload Project

1. Di aaPanel, buka menu **Files**.
2. Buat folder project, misalnya:

   ```text
   /www/wwwroot/pdf-tools
   ```

3. Upload isi repo ke folder tersebut.
4. Jangan upload folder berikut:

   ```text
   node_modules
   server/node_modules
   dist
   .env
   ```

5. Jika upload berbentuk `.zip`, ekstrak di `/www/wwwroot/pdf-tools`.

## 4. Konfigurasi Backend

Buat file environment backend:

```bash
cd /www/wwwroot/pdf-tools/server
nano .env
```

Isi:

```env
GOOGLE_AI_API_KEY=isi_api_key_gemini_anda
```

Install dependency backend:

```bash
cd /www/wwwroot/pdf-tools/server
npm install
```

Jalankan test manual sebentar:

```bash
node server.js
```

Jika sukses, akan muncul log server berjalan di `http://localhost:3004`. Tekan `Ctrl+C` setelah pengecekan.

## 5. Jalankan Backend dari aaPanel

1. Buka **Website** -> **Node.js Project**.
2. Klik **Add Node.js Project**.
3. Isi konfigurasi:

   ```text
   Project path : /www/wwwroot/pdf-tools/server
   Project name : pdf-tools-backend
   Startup file : server.js
   Run command  : node server.js
   Port         : 3004
   Node version : Node.js 20 atau 18
   ```

4. Simpan dan pastikan status project **Running**.

Backend sebaiknya tidak dibuka langsung ke publik. Nanti Nginx akan meneruskan request `/api` dari domain ke `127.0.0.1:3004`.

## 6. Build Frontend

Masuk ke root project:

```bash
cd /www/wwwroot/pdf-tools
npm install
```

Buat file `.env.production` di root project:

```bash
nano .env.production
```

Isi dengan URL API public. Jika memakai reverse proxy `/api` seperti panduan ini:

```env
VITE_API_URL=https://pdf.example.com/api
```

Build frontend:

```bash
npm run build
```

Output akan berada di:

```text
/www/wwwroot/pdf-tools/dist
```

## 7. Buat Website di aaPanel

1. Buka **Website** -> **Add site**.
2. Masukkan domain, misalnya `pdf.example.com`.
3. Set document root ke:

   ```text
   /www/wwwroot/pdf-tools/dist
   ```

4. Aktifkan SSL dari menu SSL aaPanel, misalnya Let's Encrypt.

Karena frontend memakai React Router, tambahkan fallback SPA di konfigurasi Nginx site:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 8. Proxy API ke Backend

Di konfigurasi Nginx website aaPanel, tambahkan blok ini:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3004/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 60M;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
}
```

Jika aaPanel sudah punya blok `location /`, biarkan tetap ada dan tambahkan blok `/api/` di konfigurasi server yang sama.

Reload Nginx dari aaPanel atau SSH:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Firewall

Untuk setup reverse proxy, cukup buka port web:

- `80` untuk HTTP.
- `443` untuk HTTPS.

Tidak perlu membuka port `3004` ke publik. Backend cukup diakses internal oleh Nginx melalui `127.0.0.1:3004`.

Jika Anda memilih tidak memakai reverse proxy dan frontend memanggil `https://domain:3004/api`, maka port `3004` harus dibuka dan konfigurasi CORS di `server/server.js` harus disesuaikan. Cara reverse proxy lebih direkomendasikan.

## 10. Update Setelah Ada Perubahan Repo

Jika ada update source code:

```bash
cd /www/wwwroot/pdf-tools
npm install
npm run build

cd /www/wwwroot/pdf-tools/server
npm install
```

Lalu restart Node.js Project `pdf-tools-backend` dari aaPanel.

## Troubleshooting

### Frontend tidak bisa memanggil API

Pastikan saat build nilai `VITE_API_URL` benar:

```env
VITE_API_URL=https://pdf.example.com/api
```

Setelah mengubah `.env.production`, jalankan ulang:

```bash
npm run build
```

### Error `Cannot find module`

Install dependency di folder yang benar:

```bash
cd /www/wwwroot/pdf-tools
npm install

cd /www/wwwroot/pdf-tools/server
npm install
```

### Ghostscript, LibreOffice, Java, atau PDFtk tidak ditemukan

Cek command:

```bash
which gs
which libreoffice
java -version
pdftk --version
```

Install ulang dependensi sistem jika ada yang belum tersedia:

```bash
sudo apt install -y ghostscript libreoffice default-jre pdftk-java
```

### Upload file besar gagal

Pastikan Nginx site punya:

```nginx
client_max_body_size 60M;
proxy_read_timeout 180s;
proxy_send_timeout 180s;
```

Backend saat ini membatasi upload file sampai 50MB, dan fitur AI membatasi PDF sampai 20MB.

### Fitur AI gagal

Pastikan file `server/.env` ada dan berisi:

```env
GOOGLE_AI_API_KEY=isi_api_key_gemini_anda
```

Lalu restart Node.js Project backend dari aaPanel.
