import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import axios from 'axios';

export default function RotatePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<string>("90");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        toast({ title: "File tidak valid", description: "File yang dipilih bukan PDF.", variant: "destructive" });
      }
    }
  }, [toast]);

  const handleRemoveFile = () => setFile(null);
  
  const handleRotatePdf = async () => {
    if (!file) {
      toast({ title: "File tidak ditemukan", description: "Silakan pilih 1 file PDF untuk diputar.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('angle', angle);

    try {
      const response = await axios.post('https://api.pdf.flamyheart.site/api/rotate-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Hasil-Putar-PDFTools.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({ title: "Berhasil!", description: "File PDF Anda telah berhasil diputar." });

    } catch (error) {
      console.error("Gagal memutar PDF:", error);
      toast({ title: "Terjadi Kesalahan", description: "Tidak dapat memproses file Anda.", variant: "destructive" });
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
            onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-16 h-16 mx-auto text-blue-500" />
            <p className="mt-4 font-semibold text-blue-900">Seret & Lepaskan 1 file PDF di sini</p>
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

        {/* Info File & Pilihan Putaran */}
        {file && (
          <div className="mt-6 px-4 space-y-6">
            {/* Info File */}
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">File yang akan diputar:</h3>
              <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
                <FileText className="w-6 h-6 text-blue-600 mr-4" />
                <span className="flex-grow text-sm font-medium text-gray-800">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="p-1 h-auto">
                  <X className="w-5 h-5 text-red-500" />
                </Button>
              </div>
            </div>

            {/* Pilihan Putaran */}
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">Pilih Derajat Putaran:</h3>
              <RadioGroup
                value={angle}
                onValueChange={setAngle}
                className="flex space-x-4"
                disabled={isProcessing}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="90" id="r1" />
                  <Label htmlFor="r1">90 Derajat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="180" id="r2" />
                  <Label htmlFor="r2">180 Derajat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="270" id="r3" />
                  <Label htmlFor="r3">270 Derajat</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleRotatePdf}
            disabled={isProcessing || !file}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memutar...</>
            ) : 'Putar PDF Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}