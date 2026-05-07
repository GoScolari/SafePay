import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UploadedFile {
  id: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
}

export function useFiles(transactionId: string) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ['files', transactionId],
    queryFn: () => api.get<UploadedFile[]>(`/files?transactionId=${transactionId}`).then((r) => r.data),
    enabled: !!transactionId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['files', transactionId] });

  const uploadFile = async (uri: string, mimeType: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() ?? 'photo.jpg';
      // React Native FormData acepta objeto con uri/type/name
      formData.append('file', { uri, type: mimeType, name: filename } as unknown as Blob);
      formData.append('transactionId', transactionId);
      formData.append('type', 'evidence');
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await invalidate();
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
      await invalidate();
    } finally {
      setDeleting(null);
    }
  };

  return { files, isLoading, uploading, deleting, uploadFile, getFileUrl, deleteFile };
}
