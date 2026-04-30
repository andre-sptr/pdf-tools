import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, Table } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { useToast } from '@/components/ui/use-toast';

export default function PdfToExcelTool() {
  const { toast } = useToast();

  const {
    files,
    isProcessing,
    uploadProgress,
    addFiles,
    removeFile,
  } = usePdfTool({
    endpoint: '/pdf-to-excel',
    outputFilename: 'Hasil-PDF-ke-Excel.xlsx',
    maxFiles: 1,
    minFiles: 1,
  });

  const processingText = `Mengonversi... ${uploadProgress}%`;

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
            dropzoneText="Seret & Lepaskan PDF di sini"
            hint="untuk diubah ke Excel"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan dikonversi ke Excel:</h3>
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

        {isProcessing && (
          <div className="mt-4 px-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2 text-center">{processingText}</p>
          </div>
        )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={processFiles}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              <>
                <Table className="mr-2 h-5 w-5" />
                Konversi ke Excel Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}