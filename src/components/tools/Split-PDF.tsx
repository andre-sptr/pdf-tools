import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, FileText, X, Loader2, Info } from 'lucide-react';
import axios from 'axios';

export default function SplitPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        toast({
          title: "File tidak valid",
          description: "File yang dipilih bukan PDF.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleRemoveFile = () => {
    setFile(null);
  };
  
  const handleSplitPdf = async () => {
    if (!file) {
      toast({
        title: "File tidak ditemukan",
        description: "Silakan pilih 1 file PDF untuk dipisah.",
        variant: "destructive",
      });
      return;
    }
    if (!ranges.trim()) {
      toast({
        title: "Rentang tidak ditemukan",
        description: "Silakan masukkan rentang halaman (contoh: 1-3, 5, 8).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ranges', ranges);

    try {
      const response = await axios.post('https://api.pdf.flamyheart.site/api/split-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      link.setAttribute('download', 'Hasil-Pisah-PDFTools.zip'); 
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFile(null); 
      setRanges(""); 
      toast({
        title: "Berhasil!",
        description: "File PDF Anda telah berhasil dipisah dan diunduh sebagai file ZIP.",
      });

    } catch (error) {
      console.error("Gagal memisah PDF:", error);
      toast({
        title: "Terjadi Kesalahan",
        description: "Tidak dapat memproses file Anda. Pastikan format rentang benar.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]"></div>

        {/* Tampilkan Dropzone HANYA JIKA TIDAK ADA FILE */}
        {!file && (
          <div 
            className="flex-grow border-2 border-dashed border-blue-200 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors flex flex-col justify-center items-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-16 h-16 mx-auto text-blue-500" />
            <p className="mt-4 font-semibold text-blue-900">
              Seret & Lepaskan 1 file PDF di sini
            </p>
            <p className="text-sm text-gray-500 mt-1">atau klik untuk memilih file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {/* Tampilkan Info File JIKA ADA FILE */}
        {file && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dipisah:</h3>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
              <span className="flex-grow text-sm font-medium text-gray-800">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="p-1 h-auto">
                <X className="w-5 h-5 text-red-500" />
              </Button>
            </div>
          </div>
        )}

        {/* Input untuk Rentang Halaman (Tampilkan JIKA ADA FILE) */}
        {file && (
          <div className="mt-6 px-4 space-y-3">
             <h3 className="font-semibold text-blue-900">Masukkan Rentang Halaman</h3>
            <Input
              type="text"
              placeholder="Contoh: 1-3, 5, 8-10"
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              disabled={isProcessing}
            />
            <div className="flex items-center text-xs text-gray-500 p-2 bg-blue-50 rounded-md">
              <Info className="w-4 h-4 mr-2 flex-shrink-0" />
              Pisahkan rentang dengan koma (`,`). Gunakan tanda hubung (`-`) untuk rentang berkelanjutan.
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleSplitPdf}
            disabled={isProcessing || !file || !ranges}
          >
            {isProcessing ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Memproses...
            </>
            ) : 'Pisahkan PDF Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}