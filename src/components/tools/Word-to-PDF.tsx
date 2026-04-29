import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2 } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { useToast } from '@/components/ui/use-toast';

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

function validateWordFile(file: File): boolean {
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc')
  );
}

export default function WordToPdfTool() {
  const { toast } = useToast();

  const {
    files,
    isProcessing,
    uploadProgress,
    addFiles,
    removeFile,
    processFiles,
  } = usePdfTool({
    endpoint: '/convert-office-to-pdf',
    outputFilename: 'Hasil-Word-ke-PDFTools.pdf',
    maxFiles: 10,
    minFiles: 1,
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      '.doc',
      '.docx'
    ],
  });

  const handleAddFiles = useCallback(
    (newFiles: FileList | File[] | null) => {
      if (!newFiles || newFiles.length === 0) return;

      const fileArray = Array.from(newFiles);
      const validFiles = fileArray.filter(validateWordFile);
      const invalidCount = fileArray.length - validFiles.length;

      if (invalidCount > 0) {
        toast({
          title: 'File tidak valid',
          description: `${invalidCount} file bukan Word (.doc/.docx) dan telah diabaikan.`,
          variant: 'destructive',
        });
      }

      if (validFiles.length > 0) {
        addFiles(validFiles);
      }
    },
    [addFiles, toast]
  );

  const processingText = `Mengonversi... ${uploadProgress}%`;

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!files.length && (
          <Dropzone
            onFilesSelected={handleAddFiles}
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            maxFiles={10}
            dropzoneText="Seret & Lepaskan file Word (DOC/DOCX) di sini"
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
                  <FileText className="w-6 h-6 text-blue-600 mr-4" />
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
            onClick={processFiles}
            disabled={isProcessing || files.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              'Konversi ke PDF Sekarang'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}