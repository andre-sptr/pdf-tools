const express = require('express');
const multer = require('multer');
const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');
const cors = require('cors');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const os = require('os')
const { spawn } = require('child_process');
const crypto = require('crypto');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const PptxGenJS = require('pptxgenjs');
const libre = require('libreoffice-convert');
const { createCanvas, loadImage } = require('canvas');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const normalizePath = (p) => p.replace(/\\/g, '/');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const app = express();
const port = 3004;

const corsOptions = {
  origin: 'https://pdf.andresptr.site',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ========================================================================
// ENDPOINT MERGE PDF
// ========================================================================
app.post('/api/merge-pdf', upload.array('files'), async (req, res) => {
  console.log('Menerima permintaan untuk menggabungkan PDF...');

  if (!req.files || req.files.length < 2) {
    return res.status(400).send('Harap unggah minimal 2 file PDF.');
  }

  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const pdfDoc = await PDFDocument.load(file.buffer);

      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Gabungan.pdf');
    res.send(Buffer.from(mergedPdfBytes));

    console.log('PDF berhasil digabungkan dan dikirim.');

  } catch (error) {
    console.error('Error saat menggabungkan PDF:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
  }
});

// ========================================================================
// ENDPOINT SPLIT PDF
// ========================================================================
app.post('/api/split-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk memisah PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const rangesString = req.body.ranges;
  if (!rangesString) {
    return res.status(400).send('Harap tentukan rentang halaman.');
  }

  try {
    const originalPdfDoc = await PDFDocument.load(req.file.buffer);
    const totalPages = originalPdfDoc.getPageCount();

    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Pisah-PDFTools.zip');

    archive.pipe(res);

    const ranges = rangesString.split(',').map(r => r.trim());

    for (const range of ranges) {
      const newPdfDoc = await PDFDocument.create();
      let pageIndices = [];

      if (range.includes('-')) {
        const [start, end] = range.split('-').map(num => parseInt(num));
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          console.warn(`Rentang tidak valid diabaikan: ${range}`);
          continue;
        }

        for (let i = start; i <= end; i++) {
          pageIndices.push(i - 1);
        }
      } else {
        const pageNum = parseInt(range);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          console.warn(`Halaman tidak valid diabaikan: ${range}`);
          continue;
        }
        pageIndices.push(pageNum - 1);
      }

      if (pageIndices.length === 0) continue;

      const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdfDoc.addPage(page));

      const newPdfBytes = await newPdfDoc.save();

      archive.append(Buffer.from(newPdfBytes), {
        name: `Halaman_${range}.pdf`
      });
    }

    await archive.finalize();
    console.log('PDF berhasil dipisah dan dikirim sebagai ZIP.');

  } catch (error) {
    console.error('Error saat memisah PDF:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
  }
});

// ========================================================================
// ENDPOINT COMPRESS PDF
// ========================================================================
app.post('/api/compress-pdf', upload.single('files'), (req, res) => {
  console.log('Menerima permintaan untuk kompres PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = path.join(os.tmpdir(), `input-${tempId}.pdf`);
  const outputPath = path.join(os.tmpdir(), `output-${tempId}.pdf`);
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  let responseSent = false;

  const cleanupFiles = () => {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) {
      console.error('Gagal membersihkan file sementara:', err);
    }
  };

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${normalizePath(outputPath)}`,
      normalizePath(inputPath)
    ];

    const gsProcess = spawn(gsCommand, args);

    let errorOutput = '';
    gsProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    gsProcess.on('close', (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        console.error('Ghostscript Error Output:', errorOutput);
        cleanupFiles();
        return res.status(500).send('Gagal mengompres PDF. Pastikan Ghostscript terinstal.');
      }

      try {
        const compressedBuffer = fs.readFileSync(outputPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Kompres-PDFTools.pdf');
        res.send(compressedBuffer);
        console.log('PDF berhasil dikompres dan dikirim.');
      } catch (readError) {
        console.error('Gagal membaca file output:', readError);
        res.status(500).send('Gagal membaca file hasil kompresi.');
      } finally {
        cleanupFiles();
      }
    });

    gsProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;

      console.error('Gagal menjalankan Ghostscript:', err);
      cleanupFiles();
      res.status(500).send('Perintah Ghostscript tidak ditemukan. Pastikan sudah terinstal dan ada di PATH.');
    });

  } catch (error) {
    console.error('Error saat proses kompresi:', error);
    cleanupFiles();
    if (!responseSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    }
  }
});

// ========================================================================
// ENDPOINT CONVERT TO PDF
// ========================================================================
app.post('/api/convert-to-pdf', upload.array('files'), (req, res) => {
  console.log('Menerima permintaan untuk konversi Gambar ke PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file gambar (JPG/PNG).');
  }

  const imageFiles = req.files.filter(file =>
    file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'
  );

  if (imageFiles.length === 0) {
    return res.status(400).send('Tidak ada file JPG atau PNG yang valid ditemukan.');
  }

  try {
    const doc = new PDFKitDocument({
      autoFirstPage: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Konversi-PDFTools.pdf');

    doc.pipe(res);

    for (const file of imageFiles) {
      doc.addPage();

      doc.image(file.buffer, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });
    }

    doc.end();
    console.log('Gambar berhasil dikonversi ke PDF dan dikirim.');

  } catch (error) {
    console.error('Error saat konversi gambar ke PDF:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
  }
});

app.post('/api/convert-office-to-pdf', upload.single('files'), (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file dokumen.');
  libre.convert(req.file.buffer, '.pdf', undefined, (err, done) => {
    if (err) return res.status(500).send('Gagal mengonversi dokumen.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Hasil-Konversi.pdf`);
    res.send(done);
  });
});

app.post('/api/pdf-to-word', upload.single('files'), (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');
  libre.convert(req.file.buffer, '.docx', undefined, (err, done) => {
    if (err) return res.status(500).send('Gagal mengonversi ke Word.');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Word.docx');
    res.send(done);
  });
});

app.post('/api/pdf-to-excel', upload.single('files'), (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');
  libre.convert(req.file.buffer, '.xlsx', undefined, (err, done) => {
    if (err) return res.status(500).send('Gagal mengonversi ke Excel.');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Excel.xlsx');
    res.send(done);
  });
});

app.post('/api/pdf-to-pptx', upload.single('files'), (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');
  libre.convert(req.file.buffer, '.pptx', undefined, (err, done) => {
    if (err) return res.status(500).send('Gagal mengonversi ke PowerPoint.');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-PowerPoint.pptx');
    res.send(done);
  });
});


// ========================================================================
// ENDPOINT CONVERT FROM PDF
// ========================================================================
app.post('/api/convert-from-pdf', upload.single('files'), (req, res) => {
  console.log('Menerima permintaan untuk konversi PDF ke JPG...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = path.join(os.tmpdir(), `input-${tempId}.pdf`);
  const outputPathPattern = path.join(os.tmpdir(), `output-${tempId}-%d.jpg`);

  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  let responseSent = false;


  const cleanupFiles = () => {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      const tempDir = os.tmpdir();
      fs.readdirSync(tempDir).forEach(file => {
        if (file.startsWith(`output-${tempId}-`) && file.endsWith('.jpg')) {
          const filePath = path.join(tempDir, file);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });
    } catch (err) {
      console.error('Gagal membersihkan file sementara:', err);
    }
  };

  res.on('close', cleanupFiles);
  res.on('finish', cleanupFiles);

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    const args = [
      '-sDEVICE=jpeg',
      '-r150',
      '-dNOPAUSE',
      '-dBATCH',
      `-sOutputFile=${normalizePath(outputPathPattern)}`,
      normalizePath(inputPath)
    ];

    const gsProcess = spawn(gsCommand, args);

    let stdOutput = '';
    let errorOutput = '';
    gsProcess.stdout.on('data', (data) => { stdOutput += data.toString(); });
    gsProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    gsProcess.on('close', (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        console.error('Ghostscript GAGAL dengan exit code:', code);
        console.error('Ghostscript Error Output (stderr):', errorOutput);
        console.error('Ghostscript Standard Output (stdout):', stdOutput);
        cleanupFiles();
        return res.status(500).send('Gagal mengonversi PDF. Cek log server.');
      }

      const tempDir = os.tmpdir();
      const imageFiles = fs.readdirSync(tempDir).filter(file =>
        file.startsWith(`output-${tempId}-`) && file.endsWith('.jpg')
      );

      if (imageFiles.length === 0) {
        console.error('Ghostscript berjalan tetapi tidak ada file output.');
        cleanupFiles();
        return res.status(500).send('Gagal membuat file gambar.');
      }

      try {
        const archive = archiver('zip', { zlib: { level: 6 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Konversi-JPG.zip');
        archive.pipe(res);

        imageFiles.forEach((file, index) => {
          const filePath = path.join(tempDir, file);
          archive.file(filePath, { name: `halaman_${index + 1}.jpg` });
        });

        archive.on('end', cleanupFiles);

        archive.finalize();
        console.log('PDF berhasil dikonversi ke JPG dan dikirim sebagai ZIP.');

      } catch (zipError) {
        console.error('Gagal membuat file ZIP:', zipError);
        cleanupFiles();
        res.status(500).send('Gagal membuat file ZIP.');
      }
    });

    gsProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;
      console.error('Gagal menjalankan Ghostscript (spawn error):', err);
      cleanupFiles();
      res.status(500).send('Perintah Ghostscript tidak ditemukan.');
    });

  } catch (error) {
    console.error('Error saat proses konversi:', error);
    cleanupFiles();
    if (!responseSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    }
  }
});

// ========================================================================
// ENDPOINT ROTATE PDF
// ========================================================================
app.post('/api/rotate-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk memutar PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const angle = parseInt(req.body.angle, 10);

  if (![90, 180, 270].includes(angle)) {
    return res.status(400).send('Derajat putaran harus 90, 180, atau 270.');
  }

  try {
    const pdfDoc = await PDFDocument.load(req.file.buffer);

    const pages = pdfDoc.getPages();

    pages.forEach(page => {
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + angle) % 360;
      page.setRotation(degrees(newRotation));
    });

    const rotatedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Putar-PDFTools.pdf');
    res.send(Buffer.from(rotatedPdfBytes));

    console.log('PDF berhasil diputar dan dikirim.');

  } catch (error) {
    console.error('Error saat memutar PDF:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
  }
});

app.post('/api/edit-pdf', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah file PDF yang akan diedit.');
  try {
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const elements = JSON.parse(req.body.elements || '[]');
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    elements.forEach(el => {
      firstPage.drawText(el.text, {
        x: el.x || 50,
        y: firstPage.getHeight() - (el.y || 50),
        size: el.size || 12,
        font: font,
        color: rgb(0, 0, 0),
      });
    });
    const editedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Edit.pdf');
    res.send(Buffer.from(editedPdfBytes));
  } catch (error) {
    res.status(500).send('Gagal mengedit PDF.');
  }
});



// ========================================================================
// ENDPOINT UNLOCK PDF
// ========================================================================
app.post('/api/unlock-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk buka kunci PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah file PDF.');
  }

  try {
    const pdfDoc = await PDFDocument.load(req.file.buffer, {
      password: req.body.password || '',
    });

    const unlockedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Buka-Kunci.pdf');
    res.send(Buffer.from(unlockedPdfBytes));

  } catch (error) {
    console.error('Error saat buka kunci PDF:', error);
    res.status(500).send('Gagal membuka kunci. Password mungkin salah.');
  }
});

// ========================================================================
// ENDPOINT SIGN PDF
// ========================================================================
app.post('/api/sign-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk tanda tangan PDF...');

  if (!req.file || !req.body.signature) {
    return res.status(400).send('File dan teks tanda tangan diperlukan.');
  }

  try {
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    firstPage.drawText(req.body.signature, {
      x: width - 200,
      y: 50,
      size: 30,
      font: font,
      color: rgb(0, 0, 0.5),
    });

    const signedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Tanda-Tangan.pdf');
    res.send(Buffer.from(signedPdfBytes));

  } catch (error) {
    console.error('Error saat tanda tangan PDF:', error);
    res.status(500).send('Gagal membubuhkan tanda tangan.');
  }
});

// ========================================================================
// ENDPOINT OCR PDF
// ========================================================================
app.post('/api/ocr-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk OCR PDF dengan Gemini 3.1 Pro...');

  if (!req.file) {
    return res.status(400).send('Harap unggah file PDF.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const prompt = "Tolong lakukan OCR pada dokumen PDF ini. Ekstrak semua teks secara akurat, pertahankan urutan dan formatnya sebaik mungkin. Berikan hasilnya hanya berupa teks yang diekstrak.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: "application/pdf"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-OCR.txt');
    res.send(text);

    console.log('OCR AI berhasil diproses dan dikirim.');

  } catch (error) {
    console.error('Error saat OCR AI:', error);
    res.status(500).send('Gagal memproses OCR dengan AI. Pastikan file tidak terlalu besar.');
  }
});

// ========================================================================
// ENDPOINT SCAN TO PDF
// ========================================================================
app.post('/api/scan-to-pdf', upload.array('files'), (req, res) => {
  console.log('Menerima permintaan untuk Scan Gambar ke PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file gambar hasil scan.');
  }

  try {
    const doc = new PDFKitDocument({ autoFirstPage: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Scan.pdf');
    doc.pipe(res);

    for (const file of req.files) {
      doc.addPage();
      doc.image(file.buffer, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });
    }
    doc.end();
    console.log('Scan berhasil dikonversi ke PDF.');
  } catch (error) {
    console.error('Error saat scan to PDF:', error);
    res.status(500).send('Gagal memproses scan ke PDF.');
  }
});

// ========================================================================
// ENDPOINT HTML TO PDF
// ========================================================================
app.post('/api/html-to-pdf', upload.array('files'), (req, res) => {
  console.log('Menerima permintaan untuk HTML ke PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file HTML.');
  }

  libre.convert(req.files[0].buffer, '.pdf', undefined, (err, done) => {
    if (err) return res.status(500).send('Gagal mengonversi HTML ke PDF.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-HTML.pdf');
    res.send(done);
  });
});

// ========================================================================
// ENDPOINT PDF TO PDF/A
// ========================================================================
app.post('/api/pdf-to-pdfa', upload.single('files'), (req, res) => {
  console.log('Menerima permintaan untuk Konversi ke PDF/A...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = path.join(os.tmpdir(), `input-${tempId}.pdf`);
  const outputPath = path.join(os.tmpdir(), `output-${tempId}.pdf`);
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  const cleanupFiles = () => {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) { }
  };

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    const args = [
      '-dPDFA=2',
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOOUTERSAVE',
      '-dQUIET',
      '-sProcessColorModel=DeviceRGB',
      '-sDEVICE=pdfwrite',
      '-dPDFACompatibilityPolicy=1',
      `-sOutputFile=${normalizePath(outputPath)}`,
      normalizePath(inputPath)
    ];

    const gsProcess = spawn(gsCommand, args);

    gsProcess.on('close', (code) => {
      if (code !== 0) {
        cleanupFiles();
        return res.status(500).send('Gagal mengonversi ke PDF/A.');
      }

      try {
        const buffer = fs.readFileSync(outputPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-PDFA.pdf');
        res.send(buffer);
      } finally {
        cleanupFiles();
      }
    });
  } catch (error) {
    cleanupFiles();
    res.status(500).send('Error sistem saat konversi PDF/A.');
  }
});


// ========================================================================
// ENDPOINT AI SUMMARIZER
// ========================================================================
app.post('/api/ai-summarize', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk Ringkasan AI...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const summaryLength = req.body.summaryLength || 'medium';
  let prompt = "Tolong buatkan ringkasan dari dokumen PDF ini dalam Bahasa Indonesia. ";

  if (summaryLength === 'short') prompt += "Buat ringkasan yang singkat (1-2 paragraf).";
  else if (summaryLength === 'long') prompt += "Buat ringkasan yang detail dan panjang.";
  else prompt += "Buat ringkasan dengan panjang sedang (3-4 paragraf).";

  try {
    const data = await pdf(req.file.buffer);
    let text = data.text;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
    let result;

    if (!text || text.trim().length < 50) {
      console.log('Teks digital sedikit, menggunakan OCR Gemini...');
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: "application/pdf"
          }
        }
      ]);
    } else {
      result = await model.generateContent([prompt, text]);
    }

    const response = await result.response;
    const summary = response.text();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ringkasan-AI.txt');
    res.send(summary);

    console.log('Ringkasan AI berhasil dibuat dan dikirim.');

  } catch (error) {
    console.error('Error saat membuat ringkasan AI:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses AI.');
  }
});

// ========================================================================
// ENDPOINT ORGANIZE PDF
// ========================================================================
app.post('/api/organize-pdf', upload.array('files'), async (req, res) => {
  console.log('Menerima permintaan untuk mengatur ulang PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file PDF.');
  }

  try {
    const organizedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const copiedPages = await organizedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => organizedPdf.addPage(page));
    }

    const organizedPdfBytes = await organizedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Atur-PDFTools.pdf');
    res.send(Buffer.from(organizedPdfBytes));

    console.log('PDF berhasil diatur dan dikirim.');

  } catch (error) {
    console.error('Error saat mengatur PDF:', error);
    res.status(500).send('Gagal mengatur ulang PDF. Pastikan file tidak rusak.');
  }
});

// ========================================================================
// ENDPOINT REPAIR PDF
// ========================================================================
app.post('/api/repair-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk memperbaiki PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah file PDF.');
  }

  try {
    const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
    const repairedBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Perbaiki-PDFTools.pdf');
    res.send(Buffer.from(repairedBytes));

    console.log('PDF berhasil diperbaiki dan dikirim.');

  } catch (error) {
    console.error('Error saat memperbaiki PDF:', error);
    res.status(500).send('Gagal memperbaiki PDF. Kerusakan mungkin terlalu parah.');
  }
});

// ========================================================================
// ENDPOINT AI TRANSLATOR
// ========================================================================
app.post('/api/ai-translate', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk Terjemahan AI...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const targetLanguage = req.body.targetLanguage || 'en';
  const prompt = `Tolong terjemahkan isi dokumen PDF ini ke bahasa dengan kode "${targetLanguage}". Pertahankan makna asli dan gaya bahasanya. Berikan hasil terjemahan saja.`;

  try {
    const data = await pdf(req.file.buffer);
    let text = data.text;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
    let result;

    if (!text || text.trim().length < 20) {
      console.log('Teks digital tidak ditemukan, menggunakan OCR Gemini untuk terjemahan...');
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: "application/pdf"
          }
        }
      ]);
    } else {
      result = await model.generateContent([prompt, text]);
    }

    const response = await result.response;
    const translatedText = response.text();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Terjemahan-AI.txt');
    res.send(translatedText);

    console.log('Terjemahan AI berhasil dibuat dan dikirim.');

  } catch (error) {
    console.error('Error saat menerjemahkan AI:', error);
    res.status(500).send('Terjadi kesalahan di server saat memproses AI.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server PDF Tools berjalan di http://localhost:${port}`);
});