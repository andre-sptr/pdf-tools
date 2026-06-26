import { useState, useCallback, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AxiosProgressEvent } from 'axios';
import Dropzone from '@/components/Dropzone';
import { FileText, Loader2, GripVertical, Trash2 } from 'lucide-react';
import { postFile, downloadBlob } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function OrganizePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const generateThumbnails = async (selectedFile: File) => {
    setIsGeneratingThumbs(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      setPageOrder(Array.from({ length: numPages }, (_, i) => i));

      const newThumbnails: Record<number, string> = {};

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
          newThumbnails[i - 1] = canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      setThumbnails(newThumbnails);
    } catch (error) {
      console.error("Gagal membuat thumbnail:", error);
      toast({
        title: 'Gagal membaca PDF',
        description: 'File mungkin rusak atau dilindungi kata sandi.',
        variant: 'destructive',
      });
      setFile(null);
    } finally {
      setIsGeneratingThumbs(false);
    }
  };

  const handleFileSelect = async (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const selectedFile = newFiles[0];
    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: 'Format tidak didukung',
        description: 'Harap unggah file PDF.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    await generateThumbnails(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPageOrder([]);
    setThumbnails({});
  };

  const removePage = (indexToRemove: number) => {
    if (pageOrder.length <= 1) {
      toast({ title: 'Gagal', description: 'PDF minimal harus memiliki 1 halaman.', variant: 'destructive' });
      return;
    }
    setPageOrder(pageOrder.filter((_, i) => i !== indexToRemove));
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newOrder = [...pageOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setPageOrder(newOrder);
    setDraggedIndex(null);
  };

  const handleProcess = useCallback(async () => {
    if (!file || pageOrder.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pageOrder', JSON.stringify(pageOrder));

    const handleProgress = (event: AxiosProgressEvent) => {
      if (event.total) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    const result = await postFile('/organize-pdf', formData, {
      onProgress: handleProgress,
    });

    if (result.error) {
      toast({
        title: 'Terjadi kesalahan',
        description: result.error.message,
        variant: 'destructive',
      });
    } else if (result.data) {
      downloadBlob(result.data as Blob, 'Hasil-Atur-PDFTools.pdf');
      toast({
        title: 'Berhasil!',
        description: 'Halaman PDF telah berhasil diatur ulang.',
      });
      removeFile();
    }

    setIsProcessing(false);
    setUploadProgress(0);
  }, [file, pageOrder, toast]);

  const processingText = `Memproses... ${uploadProgress}%`;

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!file && (
          <Dropzone
            onFilesSelected={handleFileSelect}
            accept=".pdf"
            multiple={false}
            dropzoneText="Seret & Lepaskan file PDF di sini"
          />
        )}

        {file && (
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-600 mr-3" />
                <span className="font-medium text-gray-800">{file.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={removeFile} disabled={isProcessing}>
                Ganti File
              </Button>
            </div>

            <h3 className="font-semibold text-blue-900 mb-3">
              Geser (Drag & Drop) untuk mengatur ulang urutan halaman:
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {pageOrder.map((originalPageIndex, currentIndex) => (
                <div
                  key={`page-${originalPageIndex}-${currentIndex}`}
                  draggable
                  onDragStart={() => handleDragStart(currentIndex)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(currentIndex)}
                  className="relative group bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg overflow-hidden flex flex-col items-center justify-center cursor-move aspect-[1/1.4] transition-all shadow-sm hover:shadow-md"
                >
                  {/* Indikator Loading Thumbnail atau Gambar Thumbnail */}
                  {isGeneratingThumbs && !thumbnails[originalPageIndex] ? (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                      <span className="text-xs text-gray-500">Memuat...</span>
                    </div>
                  ) : (
                    thumbnails[originalPageIndex] && (
                      <img
                        src={thumbnails[originalPageIndex]}
                        alt={`Halaman ${originalPageIndex + 1}`}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    )
                  )}

                  {/* Overlay Nomor Halaman & Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <GripVertical className="w-8 h-8 text-white mb-1 drop-shadow-md" />
                    <span className="text-white font-bold text-sm bg-black/50 px-2 py-1 rounded">
                      Geser
                    </span>
                  </div>

                  {/* Label Halaman di Bagian Bawah */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 py-1.5 text-center">
                    <span className="text-xs font-bold text-gray-700">
                      Halaman {originalPageIndex + 1}
                    </span>
                  </div>

                  {/* Tombol Hapus Halaman */}
                  <button
                    onClick={() => removePage(currentIndex)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
                    title="Hapus Halaman"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
            onClick={handleProcess}
            disabled={isProcessing || !file || pageOrder.length === 0 || isGeneratingThumbs}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {processingText}
              </>
            ) : (
              'Simpan & Unduh PDF'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}