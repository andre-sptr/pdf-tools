import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, PenTool } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function SignPdfTool() {
  const [signatureText, setSignatureText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const {
    files,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/sign-pdf',
    outputFilename: 'Hasil-Tanda-Tangan-PDFTools.pdf',
    maxFiles: 1,
    minFiles: 1,
  });

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleProcess = useCallback(async () => {
    if (!files.length || !signatureText.trim()) {
      toast({
        title: 'Data tidak lengkap',
        description: 'Silakan pilih file PDF dan masukkan tanda tangan.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('files', files[0]);
    formData.append('signature', signatureText);

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setUploadProgress(0);
      }
    };

    const result = await postFile('/sign-pdf', formData, {
      onProgress: handleProgress,
      signal: abortControllerRef.current.signal,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Tanda-Tangan-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'PDF telah ditandatangani.',
      });
      setSignatureText('');
      removeFile(0);
    }

    setIsProcessing(false);
    setUploadProgress(0);
    abortControllerRef.current = null;
  }, [files, signatureText, removeFile, toast]);

  const processingText = `Menandatangani... ${uploadProgress}%`;

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
            dropzoneText="Seret & Lepaskan PDF untuk ditandatangani di sini"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan ditandatangani:</h3>
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
            <h3 className="font-semibold text-blue-900">Tanda Tangan</h3>
            <Input
              type="text"
              placeholder="Masukkan nama tanda tangan Anda"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
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
            onClick={handleProcess}
            disabled={isProcessing || files.length === 0 || !signatureText}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              <>
                <PenTool className="mr-2 h-5 w-5" />
                Tanda Tangani PDF Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}