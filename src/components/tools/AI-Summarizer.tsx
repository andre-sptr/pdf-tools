import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, Sparkles } from 'lucide-react';
import { postFormJson, validatePdfFile, type MarkdownApiResult } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import MarkdownResultPanel from './MarkdownResultPanel';

export default function AiSummarizerTool() {
  const [summaryLength, setSummaryLength] = useState('medium');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultMarkdown, setResultMarkdown] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(validatePdfFile);
    const invalidCount = fileArray.length - validFiles.length;

    if (invalidCount > 0) {
      toast({
        title: 'File tidak valid',
        description: `${invalidCount} file bukan PDF dan telah diabaikan.`,
        variant: 'destructive',
      });
    }

    if (validFiles.length === 0) {
      toast({
        title: 'File tidak valid',
        description: 'Tidak ada file PDF yang dipilih.',
        variant: 'destructive',
      });
      return;
    }

    setResultMarkdown('');
    setFiles(validFiles.slice(0, 1));
  }, [toast]);

  const removeFile = useCallback(() => {
    setFiles([]);
  }, []);

  const processFiles = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: 'Validasi gagal',
        description: 'Silakan pilih 1 file PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setResultMarkdown('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('files', files[0]);
    formData.append('summaryLength', summaryLength);

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setUploadProgress(-1);
      }
    };

    const result = await postFormJson<MarkdownApiResult>('/ai-summarize', formData, {
      onProgress: handleProgress,
      signal: abortControllerRef.current.signal,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data?.markdown) {
      setResultMarkdown(result.data.markdown);
      toast({
        title: 'Berhasil!',
        description: 'Ringkasan AI telah dibuat dan ditampilkan.',
      });
      setFiles([]);
    }

    setIsProcessing(false);
    setUploadProgress(0);
    abortControllerRef.current = null;
  }, [files, summaryLength, toast]);

  const resetResult = useCallback(() => {
    setResultMarkdown('');
    setFiles([]);
  }, []);

  const progressLabel = uploadProgress >= 0 ? `${uploadProgress}%` : 'mengunggah...';
  const processingText = `Membuat ringkasan AI... ${progressLabel}`;

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
            hint="untuk dibuatkan ringkasan AI"
          />
        )}

        {files.length > 0 && (
          <div className="mt-6 px-4">
            <h3 className="font-semibold text-blue-900 mb-3">File yang akan diringkas:</h3>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
              <span className="flex-grow text-sm font-medium text-gray-800 truncate">
                {files[0].name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
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
            <h3 className="font-semibold text-blue-900">Panjang Ringkasan</h3>
            <Select value={summaryLength} onValueChange={setSummaryLength}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih panjang ringkasan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Pendek (1-2 paragraf)</SelectItem>
                <SelectItem value="medium">Sedang (3-4 paragraf)</SelectItem>
                <SelectItem value="long">Panjang (halaman penuh)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 px-4">
            <Progress value={Math.max(uploadProgress, 0)} className="h-2" />
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
                <Sparkles className="mr-2 h-5 w-5" />
                Buat Ringkasan AI Sekarang
              </>
            )}
          </Button>
        </div>

        {resultMarkdown && (
          <MarkdownResultPanel
            title="Hasil Ringkasan AI"
            markdown={resultMarkdown}
            onReset={resetResult}
          />
        )}
      </CardContent>
    </Card>
  );
}
