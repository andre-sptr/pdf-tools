import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, Lock } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function ProtectPdfTool() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const {
    files,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/protect-pdf',
    outputFilename: 'Hasil-Proteksi-PDFTools.pdf',
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

    if (!password || password.length < 4) {
      toast({
        title: 'Password terlalu pendek',
        description: 'Password harus minimal 4 karakter.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Password tidak cocok',
        description: 'Pastikan password dan konfirmasi password sama.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('password', password);

    const result = await postFile('/protect-pdf', formData, {
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
      downloadBlob(result.data as Blob, 'Hasil-Proteksi-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'PDF telah berhasil diproteksi dengan password.',
      });
      setPassword('');
      setConfirmPassword('');
      removeFile(0);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [files, password, confirmPassword, removeFile, toast]);

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
            dropzoneText="Seret & Lepaskan PDF yang ingin diproteksi di sini"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File PDF yang akan diproteksi:</h3>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
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
            <h3 className="font-semibold text-blue-900">Masukkan Password</h3>
            <Input
              type="password"
              placeholder="Minimal 4 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing}
            />
            <Input
              type="password"
              placeholder="Konfirmasi password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            disabled={isProcessing || files.length === 0 || !password}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Proteksi PDF Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}