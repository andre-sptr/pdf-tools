const express = require('express');
const multer = require('multer');
const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');
const cors = require('cors');
const archiver = require('archiver');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os')
const { spawn } = require('child_process');
const crypto = require('crypto');
const libre = require('libreoffice-convert');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const normalizePath = (p) => p.replace(/\\/g, '/');
const safeUnlink = async (p) => {
  try {
    if (fs.existsSync(p)) {
      await fsPromises.unlink(p);
    }
  } catch (err) {
    console.error(`Gagal menghapus file sementara: ${p}`, err);
  }
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const app = express();
const port = 3004;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `upload-${uniqueSuffix}-${file.originalname}`);
  }
});
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

  const cleanup = () => {
    req.files.forEach(file => safeUnlink(file.path));
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const fileBuffer = await fsPromises.readFile(file.path);
      const pdfDoc = await PDFDocument.load(fileBuffer);

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
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    }
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
    safeUnlink(req.file.path);
    return res.status(400).send('Harap tentukan rentang halaman.');
  }

  const cleanup = () => {
    if (req.file) safeUnlink(req.file.path);
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const originalPdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = originalPdfDoc.getPageCount();

    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    archive.on('error', (err) => {
      console.error('Archiver Error:', err);
      if (!res.headersSent) res.status(500).send('Gagal membuat file ZIP.');
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Pisah-PDFTools.zip');

    archive.pipe(res);

    const ranges = rangesString.split(',').map(r => r.trim());

    for (const range of ranges) {
      const newPdfDoc = await PDFDocument.create();
      let pageIndices = [];

      if (range.includes('-')) {
        const parts = range.split('-');
        // Validate format: harus ada 2 bagian
        if (parts.length !== 2) {
          console.warn(`Format rentang tidak valid: ${range}`);
          continue;
        }
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          console.warn(`Rentang tidak valid diabaikan: ${range}`);
          continue;
        }

        for (let i = start; i <= end; i++) {
          pageIndices.push(i - 1);
        }
      } else {
        const pageNum = parseInt(range, 10);
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
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    } else {
      res.end();
    }
  }
});

// ========================================================================
// ENDPOINT COMPRESS PDF
// ========================================================================
app.post('/api/compress-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk kompres PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `output-${tempId}.pdf`);
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  let responseSent = false;

  const cleanupFiles = () => {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  };

  res.on('finish', cleanupFiles);
  res.on('close', cleanupFiles);

  try {
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

    gsProcess.on('close', async (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        console.error('Ghostscript Error Output:', errorOutput);
        return res.status(500).send('Gagal mengompres PDF. Pastikan Ghostscript terinstal.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Kompres-PDFTools.pdf');
      const readStream = fs.createReadStream(outputPath);
      readStream.pipe(res);
      readStream.on('end', () => console.log('PDF berhasil dikompres dan dikirim.'));
      readStream.on('error', (err) => {
        console.error('Stream Error:', err);
        if (!res.headersSent) res.status(500).send('Gagal mengirim file.');
      });
    });

    gsProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;

      console.error('Gagal menjalankan Ghostscript:', err);
      res.status(500).send('Perintah Ghostscript tidak ditemukan. Pastikan sudah terinstal dan ada di PATH.');
    });

  } catch (error) {
    console.error('Error saat proses kompresi:', error);
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
    req.files.forEach(file => safeUnlink(file.path));
    return res.status(400).send('Tidak ada file JPG atau PNG yang valid ditemukan.');
  }

  const cleanup = () => {
    req.files.forEach(file => safeUnlink(file.path));
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const doc = new PDFKitDocument({
      autoFirstPage: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Konversi-PDFTools.pdf');

    doc.pipe(res);

    for (const file of imageFiles) {
      doc.addPage();

      doc.image(file.path, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });
    }

    doc.end();
    console.log('Gambar berhasil dikonversi ke PDF dan dikirim.');

  } catch (error) {
    console.error('Error saat konversi gambar ke PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    } else {
      res.end();
    }
  }
});

app.post('/api/convert-office-to-pdf', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file dokumen.');

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    libre.convert(fileBuffer, '.pdf', undefined, (err, done) => {
      if (err) {
        console.error('LibreOffice Error (Convert to PDF):', err);
        if (!res.headersSent) return res.status(500).send('Gagal mengonversi dokumen ke PDF.');
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Hasil-Konversi.pdf`);
        res.send(done);
      }
    });
  } catch (error) {
    console.error('Error reading file for LibreOffice:', error);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan saat memproses file.');
  }
});

app.post('/api/pdf-to-word', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    libre.convert(fileBuffer, '.docx', undefined, (err, done) => {
      if (err) {
        console.error('LibreOffice Error (PDF to Word):', err);
        if (!res.headersSent) return res.status(500).send('Gagal mengonversi ke Word.');
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Word.docx');
        res.send(done);
      }
    });
  } catch (error) {
    console.error('Error reading file for LibreOffice:', error);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan saat memproses file.');
  }
});

app.post('/api/pdf-to-excel', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    libre.convert(fileBuffer, '.xlsx', undefined, (err, done) => {
      if (err) {
        console.error('LibreOffice Error (PDF to Excel):', err);
        if (!res.headersSent) return res.status(500).send('Gagal mengonversi ke Excel.');
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Excel.xlsx');
        res.send(done);
      }
    });
  } catch (error) {
    console.error('Error reading file for LibreOffice:', error);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan saat memproses file.');
  }
});

app.post('/api/pdf-to-pptx', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    libre.convert(fileBuffer, '.pptx', undefined, (err, done) => {
      if (err) {
        console.error('LibreOffice Error (PDF to PPTX):', err);
        if (!res.headersSent) return res.status(500).send('Gagal mengonversi ke PowerPoint.');
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-PowerPoint.pptx');
        res.send(done);
      }
    });
  } catch (error) {
    console.error('Error reading file for LibreOffice:', error);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan saat memproses file.');
  }
});


// ========================================================================
// ENDPOINT CONVERT FROM PDF
// ========================================================================
app.post('/api/convert-from-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk konversi PDF ke JPG...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = req.file.path;
  const outputPathPattern = path.join(os.tmpdir(), `output-${tempId}-%d.jpg`);
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';
  let responseSent = false;
  let pageCount = 0;

  const cleanupFiles = () => {
    safeUnlink(inputPath);
    if (pageCount > 0) {
      for (let i = 1; i <= pageCount; i++) {
        safeUnlink(path.join(os.tmpdir(), `output-${tempId}-${i}.jpg`));
      }
    }
  };

  res.on('finish', cleanupFiles);
  res.on('close', cleanupFiles);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    pageCount = pdfDoc.getPageCount();

    if (pageCount > 100) {
      if (!res.headersSent) {
        res.status(400).send('File terlalu panjang. Maksimal 100 halaman untuk konversi gambar demi stabilitas server.');
      }
      return;
    }

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

    gsProcess.on('close', async (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        console.error('Ghostscript GAGAL dengan exit code:', code);
        cleanupFiles();
        return res.status(500).send('Gagal mengonversi PDF ke JPG.');
      }

      const tempDir = os.tmpdir();
      let imageFiles = [];
      for (let i = 1; i <= pageCount; i++) {
        const filePath = path.join(tempDir, `output-${tempId}-${i}.jpg`);
        if (fs.existsSync(filePath)) {
          imageFiles.push({ path: filePath, name: `halaman_${i}.jpg` });
        }
      }

      if (imageFiles.length === 0) {
        cleanupFiles();
        return res.status(500).send('Gagal membuat file gambar.');
      }

      try {
        const archive = archiver('zip', { zlib: { level: 6 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Konversi-JPG.zip');
        archive.pipe(res);

        imageFiles.forEach((img) => {
          archive.file(img.path, { name: img.name });
        });

        archive.on('end', cleanupFiles);
        await archive.finalize();
        console.log('PDF berhasil dikonversi ke JPG dan dikirim sebagai ZIP.');

      } catch (zipError) {
        console.error('Gagal membuat file ZIP:', zipError);
        cleanupFiles();
        if (!res.headersSent) {
          res.status(500).send('Gagal membuat file ZIP.');
        } else {
          res.end();
        }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  const angle = parseInt(req.body.angle, 10);

  if (isNaN(angle)) {
    return res.status(400).send('Derajat putaran tidak valid.');
  }

  if (![90, 180, 270].includes(angle)) {
    return res.status(400).send('Derajat putaran harus 90, 180, atau 270.');
  }

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);

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
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses file Anda.');
    }
  }
});

app.post('/api/edit-pdf', upload.single('files'), async (req, res) => {
  if (!req.file) return res.status(400).send('Harap unggah file PDF yang akan diedit.');

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    let elements = [];
    try {
      elements = JSON.parse(req.body.elements || '[]');
    } catch (e) {
      console.error('JSON Parse Error di /api/edit-pdf:', e);
      return res.status(400).send('Format elemen tidak valid.');
    }
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    elements.forEach(el => {
      const pageIndex = parseInt(el.pageIndex, 10) || 0;
      const x = parseFloat(el.x) || 50;
      const y = parseFloat(el.y) || 50;
      const size = parseFloat(el.size) || 12;
      const text = String(el.text || '');

      if (pageIndex < pages.length && pageIndex >= 0 && text) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        // Bounds check - clamp coordinates to page dimensions
        const safeX = Math.max(0, Math.min(x, width - 50));
        const safeY = Math.max(0, Math.min(y, height - 20));

        page.drawText(text, {
          x: safeX,
          y: page.getHeight() - safeY,
          size: size,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    });
    const editedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Edit.pdf');
    res.send(Buffer.from(editedPdfBytes));
  } catch (error) {
    console.error('Error editing PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Gagal mengedit PDF.');
    }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer, {
      password: req.body.password || '',
    });

    const unlockedPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Buka-Kunci.pdf');
    res.send(Buffer.from(unlockedPdfBytes));

  } catch (error) {
    console.error('Error saat buka kunci PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Gagal membuka kunci. Password mungkin salah.');
    }
  }
});

// ========================================================================
// ENDPOINT SIGN PDF
// ========================================================================
app.post('/api/sign-pdf', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk tanda tangan PDF...');

  if (!req.file || !req.body.signature) {
    if (req.file) safeUnlink(req.file.path);
    return res.status(400).send('File dan teks tanda tangan diperlukan.');
  }

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);
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
    if (!res.headersSent) {
      res.status(500).send('Gagal membubuhkan tanda tangan.');
    }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);

    if (fileBuffer.length > 20 * 1024 * 1024) {
      return res.status(400).send('File terlalu besar untuk diproses AI. Maksimal 20MB.');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const prompt = "Tolong lakukan OCR pada dokumen PDF ini. Ekstrak semua teks secara akurat, pertahankan urutan dan formatnya sebaik mungkin. Berikan hasilnya hanya berupa teks yang diekstrak.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
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
    if (!res.headersSent) {
      res.status(500).send('Gagal memproses OCR dengan AI. Pastikan file tidak terlalu besar.');
    }
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

  const cleanup = () => {
    req.files.forEach(file => safeUnlink(file.path));
  };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const doc = new PDFKitDocument({ autoFirstPage: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Scan.pdf');
    doc.pipe(res);

    for (const file of req.files) {
      doc.addPage();
      doc.image(file.path, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });
    }
    doc.end();
    console.log('Scan berhasil dikonversi ke PDF.');
  } catch (error) {
    console.error('Error saat scan to PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Gagal memproses scan ke PDF.');
    } else {
      res.end();
    }
  }
});

// ========================================================================
// ENDPOINT HTML TO PDF
// ========================================================================
app.post('/api/html-to-pdf', upload.array('files'), async (req, res) => {
  console.log('Menerima permintaan untuk HTML ke PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file HTML.');
  }

  const cleanup = () => {
    req.files.forEach(file => safeUnlink(file.path));
  };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.files[0].path);
    libre.convert(fileBuffer, '.pdf', undefined, (err, done) => {
      if (err) {
        console.error('LibreOffice Error (HTML to PDF):', err);
        if (!res.headersSent) return res.status(500).send('Gagal mengonversi HTML ke PDF.');
      }
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-HTML.pdf');
        res.send(done);
      }
    });
  } catch (error) {
    console.error('Error processing HTML to PDF:', error);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan saat memproses file.');
  }
});

// ========================================================================
// ENDPOINT PDF TO PDF/A
// ========================================================================
app.post('/api/pdf-to-pdfa', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk Konversi ke PDF/A...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `output-${tempId}.pdf`);
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  let responseSent = false;

  const cleanupFiles = () => {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  };

  res.on('finish', cleanupFiles);
  res.on('close', cleanupFiles);

  try {
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

    gsProcess.on('close', async (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        return res.status(500).send('Gagal mengonversi ke PDF/A.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=Hasil-PDFA.pdf');
      const readStream = fs.createReadStream(outputPath);
      readStream.pipe(res);
      readStream.on('error', (err) => {
        console.error('Stream Error:', err);
        if (!res.headersSent) res.status(500).send('Gagal membaca file PDF/A.');
      });
    });

    gsProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;
      console.error('GS Spawn Error:', err);
      res.status(500).send('Gagal menjalankan Ghostscript.');
    });

  } catch (error) {
    if (!responseSent) {
      responseSent = true;
      res.status(500).send('Error sistem saat konversi PDF/A.');
    }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  const summaryLength = req.body.summaryLength || 'medium';
  let prompt = "Tolong buatkan ringkasan dari dokumen PDF ini dalam Bahasa Indonesia. ";

  if (summaryLength === 'short') prompt += "Buat ringkasan yang singkat (1-2 paragraf).";
  else if (summaryLength === 'long') prompt += "Buat ringkasan yang detail dan panjang.";
  else prompt += "Buat ringkasan dengan panjang sedang (3-4 paragraf).";

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    if (fileBuffer.length > 20 * 1024 * 1024) {
      return res.status(400).send('File terlalu besar untuk diproses AI. Maksimal 20MB.');
    }
    const data = await pdf(fileBuffer);
    let text = data.text;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
    let result;

    if (!text || text.trim().length < 50) {
      console.log('Teks digital sedikit, menggunakan OCR Gemini...');
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
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
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses AI.');
    }
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

  const cleanup = () => {
    req.files.forEach(file => safeUnlink(file.path));
  };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const organizedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const fileBuffer = await fsPromises.readFile(file.path);
      const pdfDoc = await PDFDocument.load(fileBuffer);
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
    if (!res.headersSent) {
      res.status(500).send('Gagal mengatur ulang PDF. Pastikan file tidak rusak.');
    }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const repairedBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Perbaiki-PDFTools.pdf');
    res.send(Buffer.from(repairedBytes));

    console.log('PDF berhasil diperbaiki dan dikirim.');

  } catch (error) {
    console.error('Error saat memperbaiki PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Gagal memperbaiki PDF. Kerusakan mungkin terlalu parah.');
    }
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

  const cleanup = () => { if (req.file) safeUnlink(req.file.path); };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  const targetLanguage = req.body.targetLanguage || 'en';
  const prompt = `Tolong terjemahkan isi dokumen PDF ini ke bahasa dengan kode "${targetLanguage}". Pertahankan makna asli dan gaya bahasanya. Berikan hasil terjemahan saja.`;

  try {
    const fileBuffer = await fsPromises.readFile(req.file.path);
    if (fileBuffer.length > 20 * 1024 * 1024) {
      return res.status(400).send('File terlalu besar untuk diproses AI. Maksimal 20MB.');
    }
    const data = await pdf(fileBuffer);
    let text = data.text;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
    let result;

    if (!text || text.trim().length < 20) {
      console.log('Teks digital tidak ditemukan, menggunakan OCR Gemini untuk terjemahan...');
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
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
    if (!res.headersSent) {
      res.status(500).send('Terjadi kesalahan di server saat memproses AI.');
    }
  }
});

app.listen(port, () => {
  console.log(`🚀 Server PDF Tools berjalan di http://localhost:${port}`);
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (!res.headersSent) {
    res.status(500).send('Terjadi kesalahan sistem internal.');
  }
});