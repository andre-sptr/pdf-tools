import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import ToolCard from '@/components/ToolCard';
import { 
  Merge, 
  Split, 
  Minimize2, 
  FileInput, 
  FileOutput, 
  RotateCw,
  GraduationCap,
  Shield,
  Zap,
} from 'lucide-react';

const tools = [
  {
    icon: Merge,
    title: 'Gabungkan PDF',
    description: 'Gabungkan beberapa file PDF menjadi satu dokumen dengan mudah dan cepat.',
    href: '/tool/merge-pdf'
  },
  {
    icon: Split,
    title: 'Pisahkan PDF',
    description: 'Pisahkan file PDF menjadi beberapa halaman atau dokumen terpisah.',
    href: '/tool/split-pdf'
  },
  {
    icon: Minimize2,
    title: 'Kompres PDF',
    description: 'Kurangi ukuran file PDF tanpa mengurangi kualitas dokumen.',
    href: '/tool/compress-pdf'
  },
  {
    icon: FileInput,
    title: 'Konversi ke PDF',
    description: 'Ubah file Word, Excel, PowerPoint menjadi format PDF berkualitas tinggi.',
    href: '/tool/convert-to-pdf'
  },
  {
    icon: FileOutput,
    title: 'Konversi dari PDF',
    description: 'Konversi PDF ke format Word, Excel, atau PowerPoint dengan mudah.',
    href: '/tool/convert-from-pdf'
  },
  {
    icon: RotateCw,
    title: 'Putar PDF',
    description: 'Putar halaman PDF ke orientasi yang tepat sesuai kebutuhan Anda.',
    href: '/tool/rotate-pdf'
  }
];

export default function Index() {
  const scrollToTools = () => {
    document.getElementById('tools-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 opacity-90"></div>
        <div className="relative container mx-auto px-4 py-20 text-center text-white">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="flex justify-center">
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <Shield className="w-4 h-4 mr-2" />
                100% Aman · Gratis · Tanpa Watermark
              </Badge>
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Ubah, Gabungkan, dan Kompres PDF dengan{' '}
              <span className="text-yellow-300">Mudah</span>
            </h1>
            
            {/* CTA Button */}
            <div className="pt-4">
              <Button
                onClick={scrollToTools}
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 text-lg rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <Zap className="w-5 h-5 mr-2" />
                Mulai Sekarang
              </Button>
            </div>
          </div>
          
          {/* Illustration */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
                  <GraduationCap className="w-12 h-12 md:w-16 md:h-16 text-white/80" />
                  <div className="text-3xl md:text-4xl text-white/60">+</div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileInput className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl text-white/60">=</div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-400/80 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 md:w-8 md:h-8 text-blue-800" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools-section" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-blue-900 mb-4">
              Pilih Tool yang Anda Butuhkan
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tools.map((tool, index) => (
              <ToolCard
                key={index}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                href={tool.href}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-blue-900 mb-12">
              Mengapa Memilih PDF Tools?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-blue-900">100% Aman</h3>
                <p className="text-gray-600">
                  File Anda diproses secara lokal dan otomatis dihapus setelah 30 menit.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-blue-900">Super Cepat</h3>
                <p className="text-gray-600">
                  Proses file PDF dalam hitungan detik dengan teknologi terdepan.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <GraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-blue-900">Untuk Pendidikan</h3>
                <p className="text-gray-600">
                  Dirancang khusus untuk mendukung kebutuhan akademik.
                </p>
              </div>
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