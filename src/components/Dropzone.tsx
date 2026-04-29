import { useCallback, useRef, type DragEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import { UploadCloud } from 'lucide-react';

export interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  hint?: string;
  dropzoneText?: string;
}

const isValidFileType = (file: File, accept: string): boolean => {
  if (!accept || accept === '*' || accept === '*/*') return true;

  const extensions = accept.split(',').filter(ext => ext.startsWith('.'));
  const mimeTypes = accept.split(',').filter(ext => !ext.startsWith('.'));

  if (extensions.length === 0 && mimeTypes.length === 0) return false;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  for (const ext of extensions) {
    const ext_clean = ext.trim().toLowerCase();
    if (fileName.endsWith(ext_clean)) return true;
  }

  for (const mime of mimeTypes) {
    const mime_clean = mime.trim().toLowerCase();
    if (fileType === mime_clean || fileType === `${mime_clean}/*`) return true;
  }

  return false;
};

const filterValidFiles = (files: FileList | File[], accept: string, maxFiles: number): File[] => {
  const fileArray = Array.from(files);
  let validFiles = fileArray.filter(file => isValidFileType(file, accept));

  if (validFiles.length > maxFiles) {
    validFiles = validFiles.slice(0, maxFiles);
  }

  return validFiles;
};

export default function Dropzone({
  onFilesSelected,
  accept = '.pdf',
  multiple = false,
  maxFiles = 10,
  disabled = false,
  hint = 'atau klik untuk memilih file',
  dropzoneText = 'Seret & Lepaskan file PDF di sini',
}: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        const validFiles = filterValidFiles(files, accept, maxFiles);
        if (validFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          onFilesSelected(dataTransfer.files);
        }
      }
    },
    [disabled, maxFiles, onFilesSelected, accept]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        const validFiles = filterValidFiles(files, accept, maxFiles);
        e.target.value = '';
        if (validFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          onFilesSelected(dataTransfer.files);
        }
      }
    },
    [onFilesSelected, accept, maxFiles]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      className={`
        flex-grow border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-colors flex flex-col justify-center items-center
        ${disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
          : 'border-blue-200 hover:bg-blue-50 cursor-pointer'
        }
      `}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={disabled ? 'Dropzone dinonaktifkan' : 'Pilih file PDF'}
    >
      <UploadCloud className="w-16 h-16 mx-auto text-blue-500" />
      <p className="mt-4 font-semibold text-blue-900">{dropzoneText}</p>
      <p className="text-sm text-gray-500 mt-1">{hint}</p>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
}