const express = require('express');
const multer = require('multer');
const { PDFDocument, degrees } = require('pdf-lib');
const PDFKitDocument = require('pdfkit');
const cors = require('cors');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const os = require('os')
const { spawn } = require('child_process');
const crypto = require('crypto');

const app = express();
const port = 5000;

const corsOptions = {
  origin: 'https://pdf.andresptr.site',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
app.post('/api/split-pdf', upload.single('file'), async (req, res) => {
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
      zlib: { level: 9 } 
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
app.post('/api/compress-pdf', upload.single('file'), (req, res) => {
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

    // /screen (kualitas terendah, ukuran terkecil)
    // /ebook (seimbang)
    // /printer (kualitas tinggi, ukuran lebih besar)
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/screen',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
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

// ========================================================================
// ENDPOINT CONVERT FROM PDF
// ========================================================================
app.post('/api/convert-from-pdf', upload.single('file'), (req, res) => {
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
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    } catch (err) {
      console.error('Gagal membersihkan file sementara:', err);
    }
  };

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    const args = [
      '-sDEVICE=jpeg',
      '-r150',
      '-dNOPAUSE',
      '-dBATCH',
      `-sOutputFile=${outputPathPattern}`,
      inputPath
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
        const archive = archiver('zip', { zlib: { level: 9 } });
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
app.post('/api/rotate-pdf', upload.single('file'), async (req, res) => {
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

app.listen(port, () => {
  console.log(`🚀 Backend PDF Tools berjalan di http://localhost:${port}`);
});