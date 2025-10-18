import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UploadCloud, FileText, X, GripVertical, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
      if (newFiles.length !== selectedFiles.length) {
        toast({
          title: "File tidak valid",
          description: "Beberapa file bukan PDF dan telah diabaikan.",
          variant: "destructive",
        });
      }
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  }, [toast]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);
  
  const handleMergePdfs = async () => {
    if (files.length < 2) {
      toast({
        title: "File tidak cukup",
        description: "Silakan pilih minimal 2 file PDF untuk digabungkan.",
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
      const response = await axios.post('https://api.pdf.flamyheart.site/api/merge-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Hasil-Gabungan-PDFTools.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFiles([]);
      toast({
        title: "Berhasil!",
        description: "File PDF Anda telah berhasil digabungkan dan diunduh.",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Gagal menggabungkan PDF:", error);

      let errorMessage = "Tidak dapat memproses file Anda. Coba ulangi lagi.";
      if (axios.isAxiosError(error) && error.response?.data) {
        try {
          const errorDataText = await (error.response.data as Blob).text();
          const errorJson = JSON.parse(errorDataText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          console.error("Gagal mem-parse error response:", parseError);
        }
      }

      toast({
        title: "Terjadi Kesalahan",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragStart = useCallback((index: number) => {
    setDraggedItemIndex(index);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  }, []);
  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedItemIndex === null) return;
    if (draggedItemIndex === targetIndex) return; 

    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const draggedItem = newFiles.splice(draggedItemIndex, 1)[0];
      newFiles.splice(targetIndex, 0, draggedItem);
      return newFiles;
    });
    setDraggedItemIndex(null);
  }, [draggedItemIndex]);

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]"></div>
          <div 
            className="flex-grow border-2 border-dashed border-blue-200 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors flex flex-col justify-center items-center" // Tambahkan flex utilities untuk centering
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-16 h-16 mx-auto text-blue-500" />
            <p className="mt-4 font-semibold text-blue-900">
              Seret & Lepaskan file PDF di sini
            </p>
            <p className="text-sm text-gray-500 mt-1">atau klik untuk memilih file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan digabungkan (urutkan dengan drag):</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={file.name + index}
                  className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm transition-opacity"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  style={{ opacity: draggedItemIndex === index ? 0.5 : 1 }}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move mr-3" />
                  <FileText className="w-6 h-6 text-blue-600 mr-4" />
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
            onClick={handleMergePdfs}
            disabled={isProcessing || files.length < 2}
          >
            {isProcessing ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Memproses...
            </>
            ) : 'Gabungkan PDF Sekarang'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}