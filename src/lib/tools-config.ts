import { LucideIcon } from 'lucide-react';
import {
  Merge,
  Split,
  Minimize2,
  RotateCw,
  ArrowUpDown,
  FileInput,
  FileText,
  Table,
  Presentation,
  FileCheck,
  FileOutput,
  FileType,
  FileSpreadsheet,
  Monitor,
  LockOpen,
  PenTool,
  ScanSearch,
  Brain,
  Languages,
} from 'lucide-react';

export type ToolCategory = 'edit' | 'convert-to' | 'convert-from' | 'security' | 'ai';

export interface ToolCategoryInfo {
  id: ToolCategory;
  title: string;
  description: string;
}

export interface Tool {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
}

export const toolCategories: ToolCategoryInfo[] = [
  {
    id: 'edit',
    title: 'Edit & Kelola PDF',
    description: 'Gabungkan, pisahkan, kompres, dan kelola file PDF Anda.',
  },
  {
    id: 'convert-to',
    title: 'Konversi ke PDF',
    description: 'Ubah berbagai format file menjadi PDF berkualitas tinggi.',
  },
  {
    id: 'convert-from',
    title: 'Konversi dari PDF',
    description: 'Ubah PDF ke format Word, Excel, atau PowerPoint.',
  },
  {
    id: 'security',
    title: 'Keamanan & Tanda Tangan',
    description: 'Lindungi, buka kunci, dan tanda tangani dokumen PDF.',
  },
  {
    id: 'ai',
    title: 'AI & OCR',
    description: 'Fitur cerdas berbasis kecerdasan buatan dan pengenalan teks.',
  },
];

export const tools: Tool[] = [
  // ===================== EDIT & KELOLA =====================
  {
    slug: 'merge-pdf',
    title: 'Gabungkan PDF',
    description: 'Gabungkan beberapa file PDF menjadi satu dokumen dengan mudah dan cepat.',
    icon: Merge,
    category: 'edit',
  },
  {
    slug: 'split-pdf',
    title: 'Pisahkan PDF',
    description: 'Pisahkan file PDF menjadi beberapa halaman atau dokumen terpisah.',
    icon: Split,
    category: 'edit',
  },
  {
    slug: 'compress-pdf',
    title: 'Kompres PDF',
    description: 'Kurangi ukuran file PDF tanpa mengurangi kualitas dokumen.',
    icon: Minimize2,
    category: 'edit',
  },
  {
    slug: 'rotate-pdf',
    title: 'Putar PDF',
    description: 'Putar halaman PDF ke orientasi yang tepat sesuai kebutuhan Anda.',
    icon: RotateCw,
    category: 'edit',
  },
  {
    slug: 'organize-pdf',
    title: 'Atur Halaman PDF',
    description: 'Susun ulang, hapus, atau atur urutan halaman PDF sesuai kebutuhan.',
    icon: ArrowUpDown,
    category: 'edit',
  },

  // ===================== KONVERSI KE PDF =====================
  {
    slug: 'convert-to-pdf',
    title: 'Gambar ke PDF',
    description: 'Ubah file gambar JPG/JPEG/PNG menjadi format PDF berkualitas tinggi.',
    icon: FileInput,
    category: 'convert-to',
  },
  {
    slug: 'word-to-pdf',
    title: 'Word ke PDF',
    description: 'Konversi dokumen Word (DOC/DOCX) menjadi PDF dengan format sempurna.',
    icon: FileText,
    category: 'convert-to',
  },
  {
    slug: 'excel-to-pdf',
    title: 'Excel ke PDF',
    description: 'Ubah spreadsheet Excel (XLS/XLSX) menjadi PDF yang rapi.',
    icon: Table,
    category: 'convert-to',
  },
  {
    slug: 'ppt-to-pdf',
    title: 'PowerPoint ke PDF',
    description: 'Konversi presentasi PowerPoint (PPT/PPTX) menjadi file PDF.',
    icon: Presentation,
    category: 'convert-to',
  },
  {
    slug: 'convert-to-pdfa',
    title: 'Konversi ke PDF/A',
    description: 'Konversi PDF ke format PDF/A untuk arsip jangka panjang.',
    icon: FileCheck,
    category: 'convert-to',
  },

  // ===================== KONVERSI DARI PDF =====================
  {
    slug: 'convert-from-pdf',
    title: 'PDF ke Gambar',
    description: 'Konversi halaman PDF menjadi file gambar JPG berkualitas tinggi.',
    icon: FileOutput,
    category: 'convert-from',
  },
  {
    slug: 'pdf-to-word',
    title: 'PDF ke Word',
    description: 'Ubah file PDF menjadi dokumen Word yang bisa diedit.',
    icon: FileType,
    category: 'convert-from',
  },
  {
    slug: 'pdf-to-excel',
    title: 'PDF ke Excel',
    description: 'Ekstrak tabel dari PDF dan konversi ke format Excel.',
    icon: FileSpreadsheet,
    category: 'convert-from',
  },
  {
    slug: 'pdf-to-ppt',
    title: 'PDF ke PowerPoint',
    description: 'Ubah dokumen PDF menjadi presentasi PowerPoint.',
    icon: Monitor,
    category: 'convert-from',
  },

  // ===================== KEAMANAN =====================
  {
    slug: 'sign-pdf',
    title: 'Tanda Tangan PDF',
    description: 'Tambahkan tanda tangan digital ke dokumen PDF Anda.',
    icon: PenTool,
    category: 'security',
  },

  // ===================== AI & OCR =====================
  {
    slug: 'ocr-pdf',
    title: 'OCR PDF',
    description: 'Ekstrak teks dari PDF hasil scan menggunakan teknologi OCR.',
    icon: ScanSearch,
    category: 'ai',
  },
  {
    slug: 'ai-summarizer',
    title: 'AI Ringkasan PDF',
    description: 'Buat ringkasan otomatis dari dokumen PDF menggunakan AI.',
    icon: Brain,
    category: 'ai',
  },
  {
    slug: 'ai-translator',
    title: 'AI Terjemahan PDF',
    description: 'Terjemahkan konten PDF ke berbagai bahasa dengan bantuan AI.',
    icon: Languages,
    category: 'ai',
  },
];

/** Helper: dapatkan tools berdasarkan kategori */
export const getToolsByCategory = (category: ToolCategory): Tool[] =>
  tools.filter((tool) => tool.category === category);
