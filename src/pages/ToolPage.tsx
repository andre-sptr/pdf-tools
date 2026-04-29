import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { ArrowLeft, FileText } from 'lucide-react';
import { tools } from '@/lib/tools-config';
import { type ComponentType, JSX, lazy, Suspense } from 'react';

// ========================================================================
// IMPORT KOMPONEN TOOL
// ========================================================================
import MergePdfTool from '@/components/tools/Merge-PDF';
import SplitPdfTool from '@/components/tools/Split-PDF';
import CompressPdfTool from '@/components/tools/Compress-PDF';
import ConvertToPdfTool from '@/components/tools/ConvertTo-PDF';
import ConvertFromPdfTool from '@/components/tools/ConvertFrom-PDF';
import RotatePdfTool from '@/components/tools/Rotate-PDF';
import EditPdfTool from '@/components/tools/Edit-PDF';
import OrganizePdfTool from '@/components/tools/Organize-PDF';
import RepairPdfTool from '@/components/tools/Repair-PDF';
import WordToPdfTool from '@/components/tools/Word-to-PDF';
import ExcelToPdfTool from '@/components/tools/Excel-to-PDF';
import PptToPdfTool from '@/components/tools/PowerPoint-to-PDF';
import HtmlToPdfTool from '@/components/tools/HTML-to-PDF';
import ScanToPdfTool from '@/components/tools/Scan-to-PDF';
import ConvertToPdfaTool from '@/components/tools/ConvertTo-PDFA';
import PdfToWordTool from '@/components/tools/PDF-to-Word';
import PdfToExcelTool from '@/components/tools/PDF-to-Excel';
import PdfToPptTool from '@/components/tools/PDF-to-PowerPoint';
import ProtectPdfTool from '@/components/tools/Protect-PDF';
import UnlockPdfTool from '@/components/tools/Unlock-PDF';
import SignPdfTool from '@/components/tools/Sign-PDF';
import OcrPdfTool from '@/components/tools/OCR-PDF';
import AiSummarizerTool from '@/components/tools/AI-Summarizer';
import AiTranslatorTool from '@/components/tools/AI-Translator';

const ToolNotAvailable = () => (
  <div className="text-center p-8 bg-white rounded-lg shadow-md">
    <p className="text-gray-600 text-lg">Komponen untuk tool ini belum tersedia.</p>
    <Button asChild className="mt-4">
      <Link to="/">Kembali ke Beranda</Link>
    </Button>
  </div>
);

const toolComponents: Record<string, JSX.Element> = {
  'merge-pdf': <MergePdfTool />,
  'split-pdf': <SplitPdfTool />,
  'compress-pdf': <CompressPdfTool />,
  'convert-to-pdf': <ConvertToPdfTool />,
  'convert-from-pdf': <ConvertFromPdfTool />,
  'rotate-pdf': <RotatePdfTool />,
  'edit-pdf': <EditPdfTool />,
  'organize-pdf': <OrganizePdfTool />,
  'repair-pdf': <RepairPdfTool />,
  'word-to-pdf': <WordToPdfTool />,
  'excel-to-pdf': <ExcelToPdfTool />,
  'ppt-to-pdf': <PptToPdfTool />,
  'html-to-pdf': <HtmlToPdfTool />,
  'scan-to-pdf': <ScanToPdfTool />,
  'convert-to-pdfa': <ConvertToPdfaTool />,
  'pdf-to-word': <PdfToWordTool />,
  'pdf-to-excel': <PdfToExcelTool />,
  'pdf-to-ppt': <PdfToPptTool />,
  'protect-pdf': <ProtectPdfTool />,
  'unlock-pdf': <UnlockPdfTool />,
  'sign-pdf': <SignPdfTool />,
  'ocr-pdf': <OcrPdfTool />,
  'ai-summarizer': <AiSummarizerTool />,
  'ai-translator': <AiTranslatorTool />,
};

export default function ToolPage() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const toolMeta = tools.find((t) => t.slug === toolSlug);
  const component = toolSlug ? toolComponents[toolSlug] : undefined;

  if (!toolMeta || !component) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <ToolNotAvailable />
          </div>
        </section>
      </div>
    );
  }

  const IconComponent = toolMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />

      {/* Tool Header */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 mb-6">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </Button>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{toolMeta.title}</h1>
                <p className="text-xl text-blue-100 mt-2">{toolMeta.description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {component}
          </div>

          {/* Security Notice */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                🔒 Keamanan & Privasi Terjamin
              </h3>
              <p className="text-blue-700 text-sm">
                File Anda aman — kami tidak menyimpan data di server.
                Semua file akan otomatis dihapus setelah 30 menit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-200">
            <a
              href="https://andresptr.site"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:underline"
            >
              © {new Date().getFullYear()} Andre Saputra
            </a>.
          </p>
        </div>
      </footer>
    </div>
  );
}