import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Phone, Send, MessageCircle, Clock } from 'lucide-react';
import axios from 'axios';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState({ success: null, message: '' });;

  const handleSubmit = async (e) => {
    e.preventDefault(); // Mencegah halaman reload saat submit
    setIsSubmitting(true);
    setResult({ success: null, message: '' }); // Reset hasil sebelumnya

    const dataToSend = {
      ...formData,
      access_key: "d8f6ca40-63ed-4e63-8466-9e197cc1a546", 
      from_name: "Pesan dari Website PDF Tools", // Nama pengirim di email Anda
      subject: `Pesan Baru: ${formData.subject}`, // Menambahkan prefix subjek
    };

    try {
      const response = await axios.post('https://api.web3forms.com/submit', dataToSend);
      
      if (response.data.success) {
        setResult({ success: true, message: "Pesan berhasil terkirim! Terima kasih." });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setResult({ success: false, message: "Terjadi kesalahan. Silakan coba lagi." });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setResult({ success: false, message: "Terjadi kesalahan server. Silakan coba lagi nanti." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <MessageCircle className="w-20 h-20 mx-auto mb-6 text-yellow-300" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Hubungi Kami
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Kami siap membantu Anda dengan pertanyaan, saran, atau masalah teknis
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Card className="shadow-lg border-blue-200">
                <CardHeader>
                  <CardTitle className="text-2xl text-blue-900 flex items-center">
                    <Send className="w-6 h-6 mr-3" />
                    Kirim Pesan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="Masukkan nama lengkap Anda"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="border-blue-200 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="nama@gmail.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="border-blue-200 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subjek</Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        placeholder="Topik pesan Anda"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Pesan</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tuliskan pesan, pertanyaan, atau saran Anda di sini..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
                    </Button>
                    {result.message && (
                      <p className={`text-center mt-4 text-sm font-medium ${
                        result.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.message}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className="space-y-8">
                <Card className="border-blue-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl text-blue-900">
                      Informasi Kontak
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Alamat</h3>
                        <p className="text-gray-600 leading-relaxed">
                          MAN Insan Cendekia Siak<br />
                          Jl. Pemda No.Km 11, Perawang Bar., Kec. Tualang,<br />
                          Kabupaten Siak, Riau 28685
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Telepon</h3>
                        <p className="text-gray-600">
                          +62 823-8702-5429 (WhatsApp)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Email</h3>
                        <p className="text-gray-600">
                          andresaputra07012019@gmail.com
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Jam Operasional</h3>
                        <div className="text-gray-600">
                          <table className="table-auto">
                            <tbody>
                              <tr>
                                <td className="pr-2">Senin - Jumat</td>
                                <td>: 08:00 - 16:00</td>
                              </tr>
                              <tr>
                                <td className="pr-2">Sabtu</td>
                                <td>: 08:00 - 12:00</td>
                              </tr>
                              <tr>
                                <td className="pr-2">Minggu</td>
                                <td>: <span className="font-semibold text-red-600">Tutup</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-3">
                      Respon Cepat & Terpercaya
                    </h3>
                    <p className="text-blue-100 mb-4">
                      Tim support kami berkomitmen merespons setiap pertanyaan 
                      dalam waktu maksimal 1x24 jam pada hari kerja.
                    </p>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-100">Tim support sedang online</span>
                    </div>
                  </CardContent>
                </Card>
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