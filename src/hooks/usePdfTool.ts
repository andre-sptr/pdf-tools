import { useState, useCallback, useRef, useEffect } from 'react';
import type { AxiosProgressEvent } from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { postFile, downloadBlob, type ApiResponse, type UploadOptions } from '@/lib/api';

export interface UsePdfToolOptions {
  endpoint: string;
  outputFilename: string;
  maxFiles?: number;
  minFiles?: number;
  maxFileSize?: number;
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
  maxFileSize,
  allowedTypes,
}: UsePdfToolOptions): UsePdfToolReturn {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    let validFiles = fileArray.filter(file => {
      if (!file.name || file.name.trim() === '') return false;
      if (!allowedTypes) {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      }
      return allowedTypes.includes(file.type) ||
        allowedTypes.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));
    });

    setFiles((prev) => {
      const existingNames = new Set(prev.map(f => f.name));
      const newWithoutDuplicates = validFiles.filter(f => !existingNames.has(f.name));

      const duplicateCount = validFiles.length - newWithoutDuplicates.length;
      if (duplicateCount > 0) {
        setTimeout(() => {
          toast({
            title: 'File duplikat',
            description: `${duplicateCount} file sudah ada dalam daftar.`,
            variant: 'destructive',
          });
        }, 0);
      }

      if (maxFileSize) {
        const tooLarge = newWithoutDuplicates.filter(f => f.size > maxFileSize);
        if (tooLarge.length > 0) {
          setTimeout(() => {
            toast({
              title: 'File terlalu besar',
              description: `${tooLarge.length} file melebihi batas ukuran.`,
              variant: 'destructive',
            });
          }, 0);
        }
      }

      const validAfterSize = maxFileSize
        ? newWithoutDuplicates.filter(f => f.size <= maxFileSize)
        : newWithoutDuplicates;

      const invalidCount = fileArray.length - validAfterSize.length;

      if (invalidCount > 0) {
        setTimeout(() => {
          toast({
            title: 'File tidak valid',
            description: `${invalidCount} file memiliki format yang tidak didukung.`,
            variant: 'destructive',
          });
        }, 0);
      }

      if (validAfterSize.length === 0) {
        setTimeout(() => {
          toast({
            title: 'File tidak valid',
            description: 'Tidak ada file valid yang dipilih.',
            variant: 'destructive',
          });
        }, 0);
        return prev;
      }

      const combined = [...prev, ...validAfterSize];
      if (combined.length > maxFiles) {
        setTimeout(() => {
          toast({
            title: 'Terlalu banyak file',
            description: `Maksimal ${maxFiles} file diperbolehkan.`,
            variant: 'destructive',
          });
        }, 0);
        return combined.slice(0, maxFiles);
      }
      return combined;
    });
  }, [maxFiles, maxFileSize, allowedTypes, toast]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0) return;

    setFiles((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, moved);
      return newFiles;
    });
  }, []);

  const processFiles = useCallback(async () => {
    if (processingRef.current) {
      toast({
        title: 'Sedang memproses',
        description: 'Mohon tunggu hingga proses selesai.',
        variant: 'destructive',
      });
      return;
    }

    const validationError = validateFiles(files, minFiles);
    if (validationError) {
      toast({
        title: 'Validasi gagal',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setUploadProgress(0);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      } else {
        setUploadProgress(0);
      }
    };

    const options: UploadOptions = {
      onProgress: handleProgress,
      signal: abortControllerRef.current.signal,
    };

    try {
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
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
      processingRef.current = false;
    }
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