import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ConvertFromPdfTool() {
  const [file, setFile] = useState<File | null>(null);
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
  
  const handleConvertFromPdf = async () => {
    if (!file) {
      toast({
        title: "File tidak ditemukan",
        description: "Silakan pilih 1 file PDF untuk dikonversi.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('https://api.pdf.flamyheart.site/api/convert-from-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Hasil-Konversi-JPG.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Berhasil!",
        description: "File PDF Anda telah berhasil dikonversi ke JPG dan diunduh sebagai ZIP.",
      });

    } catch (error) {
      console.error("Gagal mengonversi dari PDF:", error);
      toast({
        title: "Terjadi Kesalahan",
        description: "Tidak dapat memproses file Anda.",
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

        {/* Dropzone */}
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
            <p className="text-sm text-gray-500 mt-1">untuk diubah ke JPG</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {/* Info File */}
        {file && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dikonversi ke JPG:</h3>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
              <span className="flex-grow text-sm font-medium text-gray-800">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="p-1 h-auto">
                <X className="w-5 h-5 text-red-500" />
              </Button>
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleConvertFromPdf}
            disabled={isProcessing || !file}
          >
            {isProcessing ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Mengonversi...
            </>
            ) : 'Konversi ke JPG Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}