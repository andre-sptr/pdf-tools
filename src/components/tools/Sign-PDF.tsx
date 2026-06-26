import { useState, useCallback, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Document, Page, pdfjs } from 'react-pdf';
import { Progress } from '@/components/ui/progress';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Loader2, PenTool, Trash2, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePdfTool } from '@/hooks/usePdfTool';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SignPdfTool() {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [placement, setPlacement] = useState<{ x: number, y: number } | null>(null);
  const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const { files, addFiles, removeFile } = usePdfTool({
    endpoint: '/sign-pdf',
    outputFilename: 'Hasil-Tanda-Tangan.pdf',
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
    setPlacement(null);
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPlacement({ x, y });
    setPdfSize({ width: rect.width, height: rect.height });
  };

  const handleProcess = useCallback(async () => {
    if (!files.length || sigCanvas.current?.isEmpty() || !placement) {
      toast({
        title: 'Data tidak lengkap',
        description: 'Pilih file, tentukan lokasi klik di PDF, dan buat tanda tangan.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const canvas = sigCanvas.current?.getCanvas();
    const signatureData = canvas ? canvas.toDataURL('image/png') : '';

    const formData = new FormData();
    formData.append('files', files[0]);
    formData.append('signature', signatureData);
    formData.append('posX', placement.x.toString());
    formData.append('posY', placement.y.toString());
    formData.append('previewWidth', pdfSize.width.toString());
    formData.append('previewHeight', pdfSize.height.toString());
    formData.append('pageNumber', pageNumber.toString());

    const result = await postFile('/sign-pdf', formData, {
      onProgress: (event: AxiosProgressEvent) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
      signal: abortControllerRef.current.signal,
    });

    if (result.error) {
      toast({ title: 'Gagal', description: result.error.message, variant: 'destructive' });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Tanda-Tangan.pdf');
      toast({ title: 'Berhasil!', description: 'Tanda tangan telah dibubuhkan.' });

      sigCanvas.current?.clear();
      setPlacement(null);
      removeFile(0);
      setPageNumber(1);
    }

    setIsProcessing(false);
    abortControllerRef.current = null;
  }, [files, placement, pdfSize, pageNumber, removeFile, toast]);

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
          <div className="mt-6 px-4 space-y-8">
            <div className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
              <span className="flex-grow text-sm font-medium truncate">{files[0].name}</span>
              <Button variant="ghost" onClick={() => removeFile(0)} disabled={isProcessing}>
                <X className="w-5 h-5 text-red-500" />
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 text-sm flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> 1. Pilih Halaman & Klik lokasi tanda tangan:
              </h3>

              <div
                className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100 flex justify-center cursor-crosshair shadow-inner"
                onClick={handlePdfClick}
              >
                {/* Tambahkan properti onLoadSuccess pada Document */}
                <Document file={files[0]} onLoadSuccess={onDocumentLoadSuccess}>
                  {/* Gunakan state pageNumber untuk menentukan halaman yang dirender */}
                  <Page
                    pageNumber={pageNumber}
                    width={350}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>

                {placement && (
                  <div
                    className="absolute w-10 h-6 border-2 border-blue-500 bg-blue-400/30 rounded pointer-events-none flex items-center justify-center"
                    style={{ left: placement.x - 20, top: placement.y - 12 }}
                  >
                    <div className="w-1 h-1 bg-blue-600 rounded-full" />
                  </div>
                )}
              </div>

              {/* --- KONTROL NAVIGASI HALAMAN --- */}
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageNumber <= 1 || isProcessing}
                    onClick={() => changePage(-1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-gray-700">
                    Halaman {pageNumber} dari {numPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageNumber >= numPages || isProcessing}
                    onClick={() => changePage(1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {/* ---------------------------------- */}

              <p className="text-[11px] text-gray-500 italic text-center mt-2">
                {placement ? `Lokasi terpilih di halaman ${pageNumber} ✅` : "Klik pada gambar untuk menentukan posisi"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <h3 className="font-semibold text-blue-900 text-sm flex items-center">
                  <PenTool className="w-4 h-4 mr-2" /> 2. Goreskan tanda tangan:
                </h3>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => sigCanvas.current?.clear()}
                  disabled={isProcessing}
                  className="text-xs text-red-500 hover:text-red-700 h-8"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Hapus
                </Button>
              </div>

              <div className="border-2 border-dashed border-blue-200 rounded-xl bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="#000000"
                  canvasProps={{ className: "signature-canvas w-full h-32 cursor-crosshair" }}
                />
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 px-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2 text-center">Menandatangani... {uploadProgress}%</p>
          </div>
        )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleProcess}
            disabled={isProcessing || files.length === 0 || !placement}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...</>
            ) : (
              <><PenTool className="mr-2 h-5 w-5" /> Tanda Tangani Sekarang</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}