import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { ArrowLeft, FileText } from 'lucide-react';

// ========================================================================
// 1. IMPORT KOMPONEN TOOL SPESIFIK ANDA DI SINI
// ========================================================================
import MergePdfTool from '@/components/tools/Merge-PDF';
import SplitPdfTool from '@/components/tools/Split-PDF';
import CompressPdfTool from '@/components/tools/Compress-PDF';
import ConvertToPdfTool from '@/components/tools/ConvertTo-PDF';  
import ConvertFromPdfTool from '@/components/tools/ConvertFrom-PDF';
import RotatePdfTool from '@/components/tools/Rotate-PDF';  

const ToolNotAvailable = () => (
  <div className="text-center p-8 bg-white rounded-lg shadow-md">
    Komponen untuk tool ini belum tersedia.
  </div>
);

const toolConfig = {
  'merge-pdf': {
    title: 'Gabungkan PDF',
    description: 'Gabungkan beberapa file PDF menjadi satu dokumen',
    component: <MergePdfTool />
  },
  'split-pdf': {
    title: 'Pisahkan PDF',
    description: 'Pisahkan file PDF menjadi beberapa halaman atau dokumen',
    component: <SplitPdfTool />
  },
  'compress-pdf': {
    title: 'Kompres PDF',
    description: 'Kurangi ukuran file PDF tanpa mengurangi kualitas',
    component: <CompressPdfTool />
  },
  'convert-to-pdf': {
    title: 'Konversi ke PDF',
    description: 'Ubah file Word, Excel, PowerPoint menjadi PDF',
    component: <ConvertToPdfTool />
  },
  'convert-from-pdf': {
    title: 'Konversi dari PDF',
    description: 'Konversi PDF ke format Word, Excel, atau PowerPoint',
    component: <ConvertFromPdfTool />
  },
  'rotate-pdf': {
    title: 'Putar PDF',
    description: 'Putar halaman PDF ke orientasi yang tepat',
    component: <RotatePdfTool />
  }
};

export default function ToolPage() {
  const { toolSlug } = useParams<{ toolSlug: string }>(); 
  const config = toolConfig[toolSlug as keyof typeof toolConfig];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Tool Header (sudah benar) */}
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
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{config.title}</h1>
                <p className="text-xl text-blue-100 mt-2">{config.description}</p>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {config.component}
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
              href="https://flamyheart.site" 
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