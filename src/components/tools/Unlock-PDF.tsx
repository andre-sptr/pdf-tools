import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function UnlockPdfTool() {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const {
    files,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/unlock-pdf',
    outputFilename: 'Hasil-Buka-Kunci-PDFTools.pdf',
    maxFiles: 1,
    minFiles: 1,
  });

  const handleProcessFiles = useCallback(async () => {
    if (!files.length) {
      toast({
        title: 'File tidak ditemukan',
        description: 'Silakan pilih 1 file PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('files[0]', files[0]);
    if (password) {
      formData.append('password', password);
    }

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setUploadProgress(-1);
      }
    };

    const result = await postFile('/unlock-pdf', formData, {
      onProgress: handleProgress,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Buka-Kunci-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'PDF telah berhasil dibuka kuncinya.',
      });
      setPassword('');
      removeFile(0);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [files, password, removeFile, toast]);

  const processingText = `Memproses... ${uploadProgress}%`;

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!files.length && (
          <Dropzone
            onFilesSelected={addFiles}
            accept=".pdf"
            multiple={false}
            maxFiles={1}
            dropzoneText="Seret & Lepaskan PDF yang terkunci di sini"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File PDF yang akan dibuka kuncinya:</h3>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <Lock className="w-6 h-6 text-orange-500 mr-4" />
              <span className="flex-grow text-sm font-medium text-gray-800 truncate">
                {files[0].name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(0)}
                className="p-1 h-auto"
                disabled={isProcessing}
              >
                <X className="w-5 h-5 text-red-500" />
              </Button>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4 space-y-3">
            <h3 className="font-semibold text-blue-900">
              {password ? 'Password (opsional)' : 'Masukkan Password'}
            </h3>
            <Input
              type="password"
              placeholder="Masukkan password jika ada"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing}
            />
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
            onClick={handleProcessFiles}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-5 w-5" />
                Buka Kunci PDF Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}