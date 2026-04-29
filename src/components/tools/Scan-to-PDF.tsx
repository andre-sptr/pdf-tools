import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Dropzone from '@/components/Dropzone';
import { Image, X, Loader2, ScanLine } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];

function validateImageFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) ||
    file.name.endsWith('.jpg') ||
    file.name.endsWith('.jpeg') ||
    file.name.endsWith('.png') ||
    file.name.endsWith('.tiff') ||
    file.name.endsWith('.tif') ||
    file.name.endsWith('.bmp');
}

export default function ScanToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(validateImageFile);
    const invalidCount = fileArray.length - validFiles.length;

    if (invalidCount > 0) {
      toast({
        title: 'File tidak valid',
        description: `${invalidCount} bukan file gambar dan telah diabaikan.`,
        variant: 'destructive',
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  }, [files]);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: 'File tidak ditemukan',
        description: 'Silakan pilih minimal 1 file gambar.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const result = await postFile('/scan-to-pdf', formData, {
      onProgress: (event) => {
        if (event.total && event.loaded) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Scan-ke-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'Gambar telah dikonversi ke PDF.',
      });
      setFiles([]);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [files, toast]);

  const processingText = `Mengonversi... ${uploadProgress}%`;

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!files.length && (
          <Dropzone
            onFilesSelected={addFiles}
            accept="image/jpeg,image/png,image/tiff,image/bmp"
            multiple
            maxFiles={50}
            dropzoneText="Seret & Lepaskan file Scan/Gambar di sini"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dikonversi ke PDF:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm"
                >
                  <Image className="w-6 h-6 text-blue-600 mr-4" />
                  <span className="flex-grow text-sm font-medium text-gray-800 truncate">
                    {file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="p-1 h-auto"
                    disabled={isProcessing}
                  >
                    <X className="w-5 h-5 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 px-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2 text-center">{processingText}</p>
          </div>
        )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleProcess}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              <>
                <ScanLine className="mr-2 h-5 w-5" />
                Konversi ke PDF Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}