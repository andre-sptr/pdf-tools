import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, Info } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function SplitPdfTool() {
  const [ranges, setRanges] = useState('');
  const { toast } = useToast();

  const {
    files,
    isProcessing,
    uploadProgress,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/split-pdf',
    outputFilename: 'Hasil-Pisah-PDFTools.zip',
    maxFiles: 1,
    minFiles: 1,
  });

  const handleProcessFiles = useCallback(async () => {
    if (!ranges.trim()) {
      toast({
        title: 'Rentang tidak ditemukan',
        description: 'Silakan masukkan rentang halaman (contoh: 1-3, 5, 8).',
        variant: 'destructive',
      });
      return;
    }

    if (!files.length) return;

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('ranges', ranges);

    const result = await postFile('/split-pdf', formData);

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Pisah-PDFTools.zip');
      toast({
        title: 'Berhasil!',
        description: 'File PDF telah dipisah dan diunduh sebagai ZIP.',
      });
      setRanges('');
      removeFile(0);
    }
  }, [files, ranges, removeFile, toast]);

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
            dropzoneText="Seret & Lepaskan 1 file PDF di sini"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dipisah:</h3>
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
            disabled={isProcessing || files.length === 0 || !ranges}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              'Pisahkan PDF Sekarang'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}