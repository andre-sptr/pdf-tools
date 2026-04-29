import { useState, useCallback, useRef } from 'react';
import type { AxiosProgressEvent } from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { postFile, downloadBlob, validatePdfFile, type ApiResponse, type UploadOptions } from '@/lib/api';

export interface UsePdfToolOptions {
  endpoint: string;
  outputFilename: string;
  maxFiles?: number;
  minFiles?: number;
  allowedTypes?: string[];
}

export interface UsePdfToolReturn {
  files: File[];
  isProcessing: boolean;
  uploadProgress: number;
  addFiles: (newFiles: FileList | File[] | null) => void;
  removeFile: (index: number) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  processFiles: () => Promise<void>;
  reset: () => void;
}

export function usePdfTool({
  endpoint,
  outputFilename,
  maxFiles = 10,
  minFiles = 1,
  allowedTypes,
}: UsePdfToolOptions): UsePdfToolReturn {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(file => {
      if (!allowedTypes) return file.type === 'application/pdf';
      return allowedTypes.includes(file.type) ||
        allowedTypes.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));
    });

    const invalidCount = fileArray.length - validFiles.length;

    if (invalidCount > 0) {
      toast({
        title: 'File tidak valid',
        description: `${invalidCount} file memiliki format yang tidak didukung.`,
        variant: 'destructive',
      });
    }

    if (validFiles.length === 0) {
      toast({
        title: 'File tidak valid',
        description: 'Tidak ada file valid yang dipilih.',
        variant: 'destructive',
      });
      return;
    }

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > maxFiles) {
        toast({
          title: 'Terlalu banyak file',
          description: `Maksimal ${maxFiles} file diperbolehkan.`,
          variant: 'destructive',
        });
        return combined.slice(0, maxFiles);
      }
      return combined;
    });
  }, [maxFiles, toast]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setFiles((prev) => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, moved);
      return newFiles;
    });
  }, []);

  const processFiles = useCallback(async () => {
    const validationError = validateFiles(files, minFiles);
    if (validationError) {
      toast({
        title: 'Validasi gagal',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total && event.loaded) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };

    const options: UploadOptions = {
      onProgress: handleProgress,
      signal: abortControllerRef.current.signal,
    };

    const result = await postFile(endpoint, formData, options);

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, outputFilename);
      toast({
        title: 'Berhasil!',
        description: 'File telah diproses dan diunduh.',
      });
      setFiles([]);
    }

    setIsProcessing(false);
    setUploadProgress(0);
    abortControllerRef.current = null;
  }, [files, endpoint, outputFilename, minFiles, toast]);

  const reset = useCallback(() => {
    setFiles([]);
    setIsProcessing(false);
    setUploadProgress(0);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    files,
    isProcessing,
    uploadProgress,
    addFiles,
    removeFile,
    reorderFiles,
    processFiles,
    reset,
  };
}

function validateFiles(files: File[], minFiles: number): string | null {
  if (files.length < minFiles) {
    if (minFiles === 1) {
      return 'Silakan pilih 1 file PDF.';
    }
    return `Silakan pilih minimal ${minFiles} file PDF.`;
  }
  return null;
}

export default usePdfTool;