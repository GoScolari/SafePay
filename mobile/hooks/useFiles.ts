import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

export type FileType = 'publication' | 'reception';

export interface UploadedFile {
  id: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  localUri?: string;
}

// Cache global — persiste entre instancias del hook en la misma sesión
const localUriCache = new Map<string, string>();

export function useFiles(transactionId: string, fileType: FileType = 'publication') {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const { data: rawFiles = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ['files', transactionId, fileType],
    queryFn: () =>
      api
        .get<UploadedFile[]>(`/files?transactionId=${transactionId}&type=${fileType}`)
        .then((r) => r.data),
    enabled: !!transactionId,
  });

  // Adjuntar localUri desde cache global
  const files: UploadedFile[] = rawFiles.map((f) => ({
    ...f,
    localUri: localUriCache.get(f.id),
  }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['files', transactionId, fileType] });

  const uploadFile = async (uri: string, mimeType: string): Promise<UploadedFile> => {
    setUploading(true);
    try {
      const token = (globalThis as any).__accessToken as string | undefined;
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
      const filename = uri.split('/').pop() ?? 'photo.jpg';

      const data = await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/files/upload`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Respuesta inválida del servidor')); }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body?.message ?? `Error ${xhr.status}`));
            } catch {
              reject(new Error(`Error ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Error de red'));

        const formData = new FormData();
        formData.append('file', { uri, type: mimeType, name: filename } as unknown as Blob);
        formData.append('transactionId', transactionId);
        formData.append('type', fileType);
        xhr.send(formData);
      });

      localUriCache.set(data.id, uri);
      await invalidate();
      return { ...data, localUri: uri };
    } finally {
      setUploading(false);
    }
  };

  const getFileUrl = async (fileId: string): Promise<string> => {
    const r = await api.get<{ url: string | null }>(`/files/${fileId}/url`);
    return r.data.url ?? '';
  };

  const deleteFile = async (fileId: string) => {
    setDeleting(fileId);
    try {
      await api.delete(`/files/${fileId}`);
      localUriCache.delete(fileId);
      await invalidate();
    } finally {
      setDeleting(null);
    }
  };

  return { files, isLoading, uploading, deleting, uploadFile, getFileUrl, deleteFile };
}
