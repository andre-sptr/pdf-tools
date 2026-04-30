const express = require('express');
const multer = require('multer');
const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');
const cors = require('cors');
const archiver = require('archiver');
const fs = require('fs');
const { exec } = require('child_process');
const xlsx = require('xlsx');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os')
const { spawn } = require('child_process');
const crypto = require('crypto');
const libre = require('libreoffice-convert');
const { PDFParse } = require('pdf-parse');
const parsePdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  return await parser.getText();
};
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const normalizePath = (p) => p.replace(/\\/g, '/');
const safeUnlink = async (p) => {
  if (!p) return;
  const targetPath = normalizePath(p);
  try {
    if (fs.existsSync(targetPath)) {
      await fsPromises.unlink(targetPath);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Gagal menghapus file sementara: ${targetPath}`, err);
    }
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

app.post('/api/convert-to-pdf', upload.array('files'), (req, res) => {
  console.log('Menerima permintaan untuk konversi Gambar ke PDF...');

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Harap unggah minimal 1 file gambar (JPG/JPEG/PNG).');
  }

  const imageFiles = req.files.filter(file =>
    file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'
  );

  if (imageFiles.length === 0) {
    req.files.forEach(file => safeUnlink(file.path));
    return res.status(400).send('Tidak ada file JPG/JPEG/PNG yang valid ditemukan.');
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
      doc.addPage({ margin: 0 });
      doc.image(file.path, 0, 0, {
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
  console.log('Menerima permintaan untuk konversi PDF ke Word...');
  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = req.file.path;
  const outputDir = os.tmpdir();
  const expectedOutput = path.join(outputDir, path.basename(inputPath, '.pdf') + '.docx');

  const cleanup = () => {
    safeUnlink(inputPath);
    safeUnlink(expectedOutput);
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  const loCommand = process.platform === 'win32' ? 'soffice' : 'libreoffice';
  let responseSent = false;

  try {
    const args = [
      '--headless',
      '--infilter=writer_pdf_import',
      '--convert-to', 'docx',
      '--outdir', normalizePath(outputDir),
      normalizePath(inputPath)
    ];

    const loProcess = spawn(loCommand, args);
    let stderr = '';

    loProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    loProcess.on('close', async (code) => {
      if (responseSent) return;
      responseSent = true;

      if (code !== 0) {
        console.error('LibreOffice Error:', stderr);
        return res.status(500).send('Gagal konversi PDF ke Word. Pastikan LibreOffice terinstal.');
      }

      if (!fs.existsSync(expectedOutput)) {
        return res.status(500).send('File output tidak ditemukan.');
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Word.docx');

      const readStream = fs.createReadStream(expectedOutput);
      readStream.pipe(res);

      readStream.on('end', () => console.log('PDF ke Word berhasil.'));
      readStream.on('error', (err) => {
        console.error('Stream Error:', err);
        if (!res.headersSent) res.status(500).send('Gagal mengirim file.');
      });
    });

    loProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;
      console.error('LibreOffice tidak ditemukan:', err);
      res.status(500).send('LibreOffice tidak terinstal di server.');
    });

  } catch (error) {
    console.error('Error converting PDF to Word:', error);
    if (!responseSent) res.status(500).send('Gagal mengonversi PDF ke Word.');
  }
});

app.post('/api/pdf-to-excel', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan konversi PDF ke Excel (Tabula Direct Execute)...');

  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const inputPath = req.file.path;
  const outputDir = os.tmpdir();
  const tempId = crypto.randomBytes(8).toString('hex');
  const csvOutput = path.join(outputDir, `${tempId}.csv`);
  const excelOutput = path.join(outputDir, `${tempId}.xlsx`);

  const cleanup = () => {
    safeUnlink(inputPath);
    safeUnlink(csvOutput);
    safeUnlink(excelOutput);
  };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const tabulaJarPath = path.join(__dirname, 'node_modules', 'tabula-js', 'lib', 'tabula-java.jar');
    const command = `java -jar "${tabulaJarPath}" -p all -f CSV -o "${csvOutput}" "${inputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (!fs.existsSync(csvOutput)) {
        console.error('Tabula gagal mengekstrak tabel:', stderr || error);
        return res.status(500).send('Gagal mengekstrak teks. Pastikan dokumen PDF bukan gambar hasil scan.');
      }

      try {
        const csvData = fs.readFileSync(csvOutput, 'utf8');

        if (!csvData || csvData.trim() === '') {
          return res.status(400).send('Tidak ada tabel yang terdeteksi di dalam dokumen ini.');
        }

        const workbook = xlsx.read(csvData, { type: 'string' });
        xlsx.writeFile(workbook, excelOutput);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-Excel.xlsx');

        const readStream = fs.createReadStream(excelOutput);
        readStream.pipe(res);

        readStream.on('end', () => console.log('PDF ke Excel berhasil dikirim!'));
        readStream.on('error', (err) => {
          console.error('Stream Error:', err);
          if (!res.headersSent) res.status(500).send('Gagal mengirim file Excel.');
        });

      } catch (excelError) {
        console.error('Error saat merakit Excel:', excelError);
        if (!res.headersSent) res.status(500).send('Gagal merakit data menjadi file Excel.');
      }
    });

  } catch (sysError) {
    console.error('Sistem Error:', sysError);
    if (!res.headersSent) res.status(500).send('Terjadi kesalahan pada server saat memproses file.');
  }
});

app.post('/api/pdf-to-pptx', upload.single('files'), async (req, res) => {
  console.log('Menerima permintaan untuk konversi PDF ke PowerPoint...');

  if (!req.file) return res.status(400).send('Harap unggah 1 file PDF.');

  const tempId = crypto.randomBytes(16).toString('hex');
  const inputPath = req.file.path;
  const outputDir = os.tmpdir();
  const expectedOutput = path.join(outputDir, path.basename(inputPath, '.pdf') + '.pptx');

  const cleanup = () => {
    safeUnlink(inputPath);
    safeUnlink(expectedOutput);
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  const loCommand = process.platform === 'win32' ? 'soffice' : 'libreoffice';
  let responseSent = false;

  try {
    const args = [
      '--headless',
      '--infilter=impress_pdf_import',
      '--convert-to', 'pptx',
      '--outdir', normalizePath(outputDir),
      normalizePath(inputPath)
    ];

    const loProcess = spawn(loCommand, args);
    let stderr = '';

    loProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    loProcess.on('close', async (code) => {
      if (responseSent) return;
      responseSent = true;
      if (code !== 0) {
        console.error('LibreOffice Error:', stderr);
        return res.status(500).send('Gagal konversi PDF ke PowerPoint. Pastikan LibreOffice terinstal.');
      }

      if (!fs.existsSync(expectedOutput)) {
        return res.status(500).send('File output tidak ditemukan.');
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Ke-PowerPoint.pptx');

      const readStream = fs.createReadStream(expectedOutput);
      readStream.pipe(res);

      readStream.on('end', () => console.log('PDF ke PowerPoint berhasil.'));
      readStream.on('error', (err) => {
        console.error('Stream Error:', err);
        if (!res.headersSent) res.status(500).send('Gagal mengirim file.');
      });
    });

    loProcess.on('error', (err) => {
      if (responseSent) return;
      responseSent = true;
      console.error('LibreOffice tidak ditemukan:', err);
      res.status(500).send('LibreOffice tidak terinstal di server.');
    });

  } catch (error) {
    console.error('Error converting PDF to PowerPoint:', error);
    if (!responseSent) res.status(500).send('Gagal mengonversi PDF ke PowerPoint.');
  }
});

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

app.post('/api/sign-pdf', upload.single('files'), async (req, res) => {
  try {
    const { posX, posY, previewWidth, previewHeight, signature } = req.body;
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();
    const ratioX = width / parseFloat(previewWidth);
    const ratioY = height / parseFloat(previewHeight);
    const finalX = parseFloat(posX) * ratioX;
    const finalY = height - (parseFloat(posY) * ratioY);
    const signatureImageBytes = Buffer.from(signature.split(',')[1], 'base64');
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const sigDims = signatureImage.scale(0.5);

    firstPage.drawImage(signatureImage, {
      x: finalX - (sigDims.width / 2),
      y: finalY - (sigDims.height / 2),
      width: sigDims.width,
      height: sigDims.height,
    });

    const signedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(signedPdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal.');
  }
});

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
    const data = await parsePdfText(fileBuffer);
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

app.post('/api/organize-pdf', upload.single('file'), async (req, res) => {
  console.log('Menerima permintaan untuk mengatur ulang halaman PDF...');

  if (!req.file) {
    return res.status(400).send('Harap unggah 1 file PDF.');
  }

  if (!req.body.pageOrder) {
    return res.status(400).send('Urutan halaman (pageOrder) tidak ditemukan.');
  }

  const cleanup = () => {
    safeUnlink(req.file.path);
  };
  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const pageOrder = JSON.parse(req.body.pageOrder);
    const fileBuffer = await fsPromises.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const organizedPdf = await PDFDocument.create();
    const copiedPages = await organizedPdf.copyPages(pdfDoc, pageOrder);
    copiedPages.forEach((page) => organizedPdf.addPage(page));
    const organizedPdfBytes = await organizedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Hasil-Atur-PDFTools.pdf');
    res.send(Buffer.from(organizedPdfBytes));

    console.log('Halaman PDF berhasil diatur ulang dan dikirim.');

  } catch (error) {
    console.error('Error saat mengatur PDF:', error);
    if (!res.headersSent) {
      res.status(500).send('Gagal mengatur ulang PDF. Pastikan file tidak rusak.');
    }
  }
});

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
    const data = await parsePdfText(fileBuffer);
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