import Header from '@/components/Header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Shield, Zap, Users } from 'lucide-react';

const faqs = [
  {
    question: "Apakah file saya disimpan di server?",
    answer: "Tidak, file Anda tidak disimpan di server kami. Semua file diproses secara lokal dan otomatis dihapus setelah 30 menit untuk menjaga privasi dan keamanan data Anda."
  },
  {
    question: "Apakah layanan ini benar-benar gratis?",
    answer: "Ya, PDF Tools sepenuhnya gratis untuk semua pengguna. Tidak ada biaya tersembunyi atau batasan penggunaan. Ini adalah komitmen kami untuk mendukung pendidikan di Indonesia."
  },
  {
    question: "Format file apa saja yang didukung?",
    answer: "Kami mendukung file PDF untuk semua tool pengolahan. Untuk konversi, kami mendukung Word (.docx), Excel (.xlsx), PowerPoint (.pptx), dan berbagai format gambar (JPG, PNG)."
  },
  {
    question: "Berapa ukuran maksimal file yang bisa diupload?",
    answer: "Saat ini, ukuran maksimal file adalah 20MB per file. Untuk file yang lebih besar, kami sarankan untuk mengompres terlebih dahulu atau memisahkan menjadi beberapa bagian."
  },
  {
    question: "Apakah bisa digunakan di ponsel?",
    answer: "Ya, PDF Tools dirancang responsif dan dapat digunakan dengan nyaman di ponsel, tablet, maupun desktop. Semua fitur tersedia di semua perangkat."
  },
  {
    question: "Bagaimana keamanan data dijamin?",
    answer: "Kami menggunakan koneksi HTTPS terenkripsi, pemrosesan file secara lokal, dan penghapusan otomatis file setelah 30 menit. Tidak ada data yang disimpan atau dibagikan ke pihak ketiga."
  },
  {
    question: "Apakah perlu mendaftar akun?",
    answer: "Tidak, Anda tidak perlu mendaftar akun atau memberikan informasi pribadi. Cukup buka website dan langsung gunakan semua fitur yang tersedia."
  },
  {
    question: "Bagaimana jika terjadi error saat memproses file?",
    answer: "Jika terjadi error, coba refresh halaman dan upload ulang file. Pastikan file tidak corrupt dan format sesuai. Jika masalah berlanjut, hubungi kami melalui halaman kontak."
  },
  {
    question: "Apakah ada batasan jumlah file yang bisa diproses?",
    answer: "Tidak ada batasan khusus untuk jumlah file. Namun, untuk performa optimal, kami sarankan memproses maksimal 10 file sekaligus untuk tool gabungkan PDF."
  },
  {
    question: "Bisakah digunakan offline?",
    answer: "Saat ini PDF Tools memerlukan koneksi internet untuk berfungsi. Namun, kami sedang mengembangkan fitur offline (PWA) yang akan tersedia dalam update mendatang."
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <HelpCircle className="w-20 h-20 mx-auto mb-6 text-yellow-300" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pertanyaan yang Sering Diajukan
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Temukan jawaban atas pertanyaan umum tentang PDF Tools
            </p>
          </div>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <Card className="text-center border-green-200 bg-green-50">
                <CardHeader>
                  <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <CardTitle className="text-green-800">100% Aman</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-700">
                    File otomatis dihapus setelah 30 menit. Tidak ada data yang disimpan.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-blue-200 bg-blue-50">
                <CardHeader>
                  <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-blue-800">Gratis Selamanya</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-700">
                    Tidak ada biaya tersembunyi. Semua fitur gratis untuk semua pengguna.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-purple-200 bg-purple-50">
                <CardHeader>
                  <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <CardTitle className="text-purple-800">Untuk Semua</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-purple-700">
                    Tidak perlu registrasi. Langsung gunakan semua fitur yang tersedia.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Accordion */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">
                Jawaban Lengkap untuk Pertanyaan Anda
              </h2>
              
              <Card className="shadow-lg border-blue-200">
                <CardContent className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left font-semibold text-blue-900 hover:text-blue-700">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 leading-relaxed pt-2">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Contact CTA */}
            <div className="text-center mt-16">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">
                  Masih Ada Pertanyaan?
                </h3>
                <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                  Jika Anda tidak menemukan jawaban yang dicari, jangan ragu untuk 
                  menghubungi tim kami. Kami siap membantu Anda.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Hubungi Kami
                </a>
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