import axios, { AxiosError, type AxiosProgressEvent } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

export interface ApiError {
  message: string;
  code?: string;
}

export interface UploadOptions {
  onProgress?: (event: AxiosProgressEvent) => void;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export async function postFile<T = unknown>(
  endpoint: string,
  data: FormData,
  options?: UploadOptions
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.post<T>(endpoint, data, {
      onUploadProgress: options?.onProgress,
      signal: options?.signal,
      responseType: 'blob',
    });

    return { data: response.data };
  } catch (error) {
    if (error instanceof AxiosError) {
      let errorMessage = 'Terjadi kesalahan pada server.';

      if (error.response?.data) {
        try {
          const errorBlob = error.response.data as Blob;
          const errorText = await errorBlob.text();
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
        }
      }

      return {
        error: {
          message: errorMessage,
          code: error.code,
        },
      };
    }

    return {
      error: {
        message: 'Tidak dapat terhubung ke server.',
      },
    };
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function validatePdfFile(file: File): boolean {
  return file.type === 'application/pdf' ||
         file.name.toLowerCase().endsWith('.pdf');
}

export function validateFile(file: File, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  return allowedTypes.includes(file.type) || 
         allowedTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()));
}

export function validatePdfFiles(files: FileList | File[]): { valid: File[]; invalid: number } {
  const fileArray = Array.from(files);
  const valid = fileArray.filter(validatePdfFile);
  const invalid = fileArray.length - valid.length;
  return { valid, invalid };
}

export default apiClient;