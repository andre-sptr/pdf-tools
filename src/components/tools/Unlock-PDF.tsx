import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, LockOpen, Eye, EyeOff } from 'lucide-react';
import { postFile, downloadBlob, validatePdfFile } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function UnlockPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
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

        if (!password || password.trim() === '') {
            toast({
                title: 'Password kosong',
                description: 'Silakan masukkan password untuk membuka PDF.',
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
        formData.append('password', password);

        const handleProgress = (event: AxiosProgressEvent) => {
            if (event.total) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            } else {
                setUploadProgress(-1);
            }
        };

        const result = await postFile('/unlock-pdf', formData, {
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
            downloadBlob(result.data as Blob, 'Hasil-Terbuka-PDFTools.pdf');
            toast({
                title: 'Berhasil!',
                description: 'Password PDF telah dihapus.',
            });
            setFiles([]);
            setPassword('');
        }

        setIsProcessing(false);
        setUploadProgress(0);
        abortControllerRef.current = null;
    }, [files, password, toast]);

    const processingText = `Membuka kunci... ${uploadProgress}%`;

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
                        dropzoneText="Seret & Lepaskan PDF terkunci di sini"
                        hint="untuk menghapus password"
                    />
                )}

                {files.length > 0 && (
                    <div className="mt-6 px-4">
                        <h3 className="font-semibold text-blue-900 mb-3">File yang akan dibuka:</h3>
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
                        <h3 className="font-semibold text-blue-900">Masukkan Password PDF</h3>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password PDF"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isProcessing}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Masukkan password untuk membuka kunci PDF ini.
                        </p>
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
                        disabled={isProcessing || files.length === 0 || !password}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {processingText}
                            </>
                        ) : (
                            <>
                                <LockOpen className="mr-2 h-5 w-5" />
                                Buka Kunci PDF Sekarang
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}