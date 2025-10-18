import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, X, Loader2, Image } from 'lucide-react';
import axios from 'axios';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

export default function ConvertToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(file => 
        ACCEPTED_IMAGE_TYPES.includes(file.type)
      );
      
      if (newFiles.length !== selectedFiles.length) {
        toast({
          title: "File tidak valid",
          description: "Beberapa file bukan JPG/PNG dan telah diabaikan.",
          variant: "destructive",
        });
      }
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  }, [toast]);

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  const handleConvertToPdf = async () => {
    if (files.length === 0) {
      toast({
        title: "File tidak ditemukan",
        description: "Silakan pilih minimal 1 file gambar (JPG/PNG).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('https://api.pdf.flamyheart.site/api/convert-to-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Hasil-Konversi-PDFTools.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFiles([]);
      toast({
        title: "Berhasil!",
        description: "File gambar Anda telah berhasil dikonversi ke PDF.",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Gagal mengonversi ke PDF:", error);
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
              Seret & Lepaskan file Gambar (JPG/PNG) di sini
            </p>
            <p className="text-sm text-gray-500 mt-1">atau klik untuk memilih file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg, image/png"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dikonversi:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm"
                >
                  <Image className="w-6 h-6 text-blue-600 mr-4" />
                  <span className="flex-grow text-sm font-medium text-gray-800">{file.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)} className="p-1 h-auto">
                    <X className="w-5 h-5 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
         )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleConvertToPdf}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Mengonversi...
            </>
            ) : 'Konversi ke PDF Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}