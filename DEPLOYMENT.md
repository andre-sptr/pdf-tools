# Deployment Guide: PDF Tools (Ubuntu VPS + aaPanel)

Panduan ini menjelaskan langkah-langkah untuk mendeploy aplikasi PDF Tools ke VPS Ubuntu menggunakan panel kontrol **aaPanel**.

## 1. Persiapan Server (Ubuntu)

Hubungkan ke VPS Anda melalui SSH dan instal dependensi sistem yang diperlukan oleh aplikasi:

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Instal Ghostscript (untuk Kompresi & PDF ke JPG)
sudo apt install ghostscript -y

# Instal LibreOffice (untuk Word/Excel/PPT ke PDF)
sudo apt install libreoffice -y
```

## 2. Persiapan Project di aaPanel

### A. Instal Node.js Version Manager
1. Buka **aaPanel** dashboard.
2. Pergi ke **App Store**.
3. Cari dan instal **Node.js version manager**.
4. Buka Node.js version manager dan instal versi Node.js terbaru (v18 atau v20 direkomendasikan).

### B. Upload File Project
1. Buka menu **Files** di aaPanel.
2. Buat folder baru (misal: `/www/wwwroot/pdf-tools`).
3. Upload semua file project Anda ke folder tersebut (kecuali `node_modules`).
4. Ekstrak file jika Anda mengupload dalam format `.zip`.

## 3. Konfigurasi Backend (Server)

1. Masuk ke folder `server` di dalam folder project Anda.
2. Buat/Edit file `.env` dan masukkan API Key Gemini Anda:
   ```env
   GOOGLE_AI_API_KEY=your_api_key_here
   ```
3. Buka terminal di folder `server` (via aaPanel Terminal atau SSH) dan jalankan:
   ```bash
   npm install
   ```

## 4. Konversi Frontend (Vite Build)

Karena Anda akan mendeploy di VPS, Anda perlu membangun (build) frontend terlebih dahulu:

1. Di komputer lokal Anda (atau di VPS jika Node.js terinstal), jalankan:
   ```bash
   npm install
   ```
2. Pastikan file `src/lib/api.ts` sudah mengarah ke IP VPS Anda atau `http://localhost:3004/api`.
3. Jalankan perintah build:
   ```bash
   npm run build
   ```
4. Folder `dist` akan muncul. Upload isi folder `dist` ini ke folder root website di aaPanel (misal: `/www/wwwroot/pdf-site`).

## 5. Menjalankan Server di aaPanel

1. Pergi ke menu **Website** -> **Node.js Project**.
2. Klik **Add Node.js Project**.
3. Konfigurasi sebagai berikut:
   - **Project path**: Pilih folder `server` (misal: `/www/wwwroot/pdf-tools/server`).
   - **Project Name**: `pdf-tools-backend`.
   - **Run command**: `node server.js`.
   - **Project Port**: `3004`.
   - **Node.js version**: Pilih versi yang sudah diinstal.
4. Klik **Submit**.
5. Pastikan statusnya **Running**.

## 6. Konfigurasi Keamanan (Firewall)

Aplikasi berjalan di port `3004`. Anda harus membuka port ini agar bisa diakses:

1. Di **aaPanel**, buka menu **Security**.
2. Klik **Add Rule**.
3. Masukkan port `3004`, Protocol `TCP`, dan simpan.
4. Jika Anda menggunakan Cloud Provider (seperti AWS, GCP, atau DigitalOcean), pastikan port `3004` juga dibuka di **Security Group / Firewall** dashboard provider tersebut.

## 7. Akses Aplikasi

- Frontend: Akses melalui domain/IP yang Anda setup di aaPanel (Port 80/443).
- Backend: Berjalan secara internal di `http://localhost:3004`.

Jika Anda ingin mengakses aplikasi tanpa domain, cukup buka:
`http://IP_VPS_ANDA` (Setelah file `dist` diletakkan di root web server aaPanel).

---

### Troubleshooting
- **Ghostscript Not Found**: Jalankan `which gs` di terminal untuk memastikan Ghostscript terinstal.
- **CORS Error**: Pastikan di `server.js` bagian `corsOptions` sudah menggunakan `origin: '*'`.
- **API Timeout**: PDF berukuran besar membutuhkan waktu proses lama, aaPanel Node.js manager akan tetap menjaganya tetap hidup (PM2 otomatis).
