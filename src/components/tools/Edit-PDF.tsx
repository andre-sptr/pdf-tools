import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Dropzone from '@/components/Dropzone';
import { FileText, X, Type, Image as ImageIcon, Square, Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function EditPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textElements, setTextElements] = useState<Array<{id: string; text: string; x: number; y: number; size: number}>>([]);
  const [newText, setNewText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const { toast } = useToast();

  const handleFileSelect = useCallback((files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setFile(files[0] as File);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setTextElements([]);
  }, []);

  const handleAddText = useCallback(() => {
    if (!newText.trim()) return;

    const newElement = {
      id: `text-${Date.now()}`,
      text: newText,
      x: 50,
      y: 50 + (textElements.length * 30),
      size: fontSize
    };

    setTextElements([...textElements, newElement]);
    setNewText('');
  }, [newText, fontSize, textElements]);

  const handleRemoveText = useCallback((id: string) => {
    setTextElements(textElements.filter(el => el.id !== id));
  }, [textElements]);

  const handleProcess = useCallback(async () => {
    if (!file) {
      toast({
        title: 'File tidak ditemukan',
        description: 'Silakan pilih 1 file PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('files', file);
    formData.append('elements', JSON.stringify(textElements));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3004/api'}/edit-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal memproses PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Hasil-Edit-PDFTools.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Berhasil!',
        description: 'PDF telah berhasil diedit.',
      });

      setFile(null);
      setTextElements([]);
    } catch (error) {
      toast({
        title: 'Terjadi kesalahan',
        description: 'Gagal memproses PDF.',
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  }, [file, textElements, toast]);

  return (
    <Card className="w-full shadow-none border-none">
      <CardContent className="p-0">
        <div className="flex flex-col min-h-[30px]" />

        {!file && (
          <Dropzone
            onFilesSelected={handleFileSelect}
            accept=".pdf"
            multiple={false}
            maxFiles={1}
            dropzoneText="Seret & Lepaskan PDF yang ingin diedit di sini"
          />
        )}

        {file && (
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900">File yang akan diedit:</h3>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="p-1 h-auto">
                <X className="w-5 h-5 text-red-500" />
              </Button>
            </div>
            <div className="flex items-center p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-blue-600 mr-4" />
              <span className="flex-grow text-sm font-medium text-gray-800 truncate">
                {file.name}
              </span>
            </div>
          </div>
        )}

        {file && (
          <div className="mt-6 px-4 space-y-4">
            <h3 className="font-semibold text-blue-900">Tambah Teks</h3>
            <div className="flex gap-2">
              <div className="flex-grow">
                <Input
                  type="text"
                  placeholder="Masukkan teks"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  placeholder="Ukuran"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                  min={8}
                  max={72}
                />
              </div>
              <Button onClick={handleAddText} variant="secondary">
                <Type className="w-4 h-4" />
              </Button>
            </div>

            {textElements.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Teks yang akan ditambahkan:</h4>
                <ul className="space-y-2">
                  {textElements.map((el) => (
                    <li key={el.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{el.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveText(el.id)}
                        className="p-1 h-auto"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
              Catatan: Fitur edit PDF tersedia untuk menambahkan teks sederhana.
            </div>
          </div>
        )}

        <div className="mt-8">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-lg py-6"
            onClick={handleProcess}
            disabled={isProcessing || !file}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Simpan PDF Sekarang
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}