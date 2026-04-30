import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function OrganizePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(f => f.type === 'application/pdf');
    const combined = [...files, ...validFiles];

    if (combined.length > 20) {
      toast({
        title: 'Terlalu banyak file',
        description: 'Maksimal 20 file diperbolehkan.',
        variant: 'destructive',
      });
      setFiles(combined.slice(0, 20));
    } else {
      setFiles(combined);
    }
  }, [files, toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  }, [files]);

  const moveFile = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= newFiles.length) return;

    [newFiles[fromIndex], newFiles[toIndex]] = [newFiles[toIndex], newFiles[fromIndex]];
    setFiles(newFiles);
  }, [files]);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: 'File tidak ditemukan',
        description: 'Silakan pilih minimal 1 file PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setUploadProgress(-1);
      }
    };

    const result = await postFile('/organize-pdf', formData, {
      onProgress: handleProgress,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Atur-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'File PDF telah diatur dan digabungkan.',
      });
      setFiles([]);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [files, toast]);

  const processingText = `Memproses... ${uploadProgress}%`;

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!files.length && (
          <Dropzone
            onFilesSelected={addFiles}
            accept=".pdf"
            multiple
            maxFiles={20}
            dropzoneText="Seret & Lepaskan file PDF di sini untuk diatur ulang"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">
              File (urutkan dengan tombol panah):
            </h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm"
                >
                  <div className="flex flex-col mr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveFile(index, 'up')}
                      disabled={index === 0}
                      className="p-0 h-4"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveFile(index, 'down')}
                      disabled={index === files.length - 1}
                      className="p-0 h-4"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-gray-500 mr-2 w-6">{index + 1}.</span>
                  <FileText className="w-6 h-6 text-blue-600 mr-3" />
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
              'Simpan Perubahan Sekarang'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}