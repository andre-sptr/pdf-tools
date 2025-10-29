import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Target, Users, Lightbulb, Heart, Shield } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <GraduationCap className="w-20 h-20 mx-auto mb-6 text-yellow-300" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tentang PDF Tools
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Platform pengolah PDF yang dirancang khusus untuk mendukung 
              literasi digital Akademik.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-blue-900">Misi Kami</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-center">
                    Menyediakan solusi teknologi yang mudah diakses untuk mendukung 
                    kegiatan belajar mengajar, penelitian, dan administrasi akademik 
                    dengan standar keamanan tinggi.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-blue-900">Visi Kami</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-center">
                    Menjadi platform digital terdepan yang memberdayakan generasi 
                    cendekia Indonesia dengan teknologi yang inovatif, aman, 
                    dan mudah digunakan untuk semua kalangan.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-blue-900 mb-4">
                Mengapa PDF Tools?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Kami memahami kebutuhan khusus lingkungan pendidikan dan 
                menghadirkan solusi yang tepat sasaran.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center border-blue-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl text-blue-900">Keamanan Terjamin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    File diproses secara lokal dan otomatis dihapus. 
                    Tidak ada data yang disimpan di server kami.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-blue-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl text-blue-900">Untuk Semua</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Dirancang untuk guru, siswa, dan staff administrasi 
                    dengan antarmuka yang intuitif dan mudah dipahami.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-blue-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-red-500" />
                  </div>
                  <CardTitle className="text-xl text-blue-900">Gratis Selamanya</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Komitmen kami untuk mendukung pendidikan Indonesia 
                    dengan menyediakan layanan gratis tanpa batas.
                  </p>
                </CardContent>
              </Card>
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