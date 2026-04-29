import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function RotatePdfTool() {
  const [angle, setAngle] = useState<string>("90");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const {
    files,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/rotate-pdf',
    outputFilename: 'Hasil-Putar-PDFTools.pdf',
    maxFiles: 1,
    minFiles: 1,
  });

  const handleRotatePdf = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: "File tidak ditemukan",
        description: "Silakan pilih 1 file PDF untuk diputar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('files[0]', files[0]);
    formData.append('angle', angle);

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setUploadProgress(-1);
      }
    };

    const result = await postFile('/rotate-pdf', formData, {
      onProgress: handleProgress,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Putar-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'File PDF telah diputar.',
      });
      removeFile(0);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [files, angle, removeFile, toast]);

  const processingText = `Memutar... ${uploadProgress}%`;

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
          <div className="mt-6 px-4 space-y-6">
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">File yang akan diputar:</h3>
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

        {isProcessing && (
          <div className="mt-4 px-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2 text-center">{processingText}</p>
          </div>
        )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleRotatePdf}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              'Putar PDF Sekarang'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}