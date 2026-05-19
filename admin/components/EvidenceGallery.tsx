'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { TransactionFile } from '@/lib/types';

interface Props {
  files: TransactionFile[];
}

export default function EvidenceGallery({ files }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [enlarged, setEnlarged] = useState<string | null>(null);

  useEffect(() => {
    if (!files?.length) return;
    files.forEach(async (f) => {
      try {
        const res = await api.get<{ url: string }>(`/files/${f.id}/url`);
        setUrls((prev) => ({ ...prev, [f.id]: res.data.url }));
      } catch {}
    });
  }, [files]);

  if (!files?.length) {
    return <p className="text-sm text-gray-400 italic">Sin archivos adjuntos</p>;
  }

  const publication = files.filter((f) => f.type === 'publication');
  const reception = files.filter((f) => f.type === 'reception');

  const renderGroup = (label: string, group: TransactionFile[]) => (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-3">
        {group.map((f) => (
          <div key={f.id} className="relative">
            {urls[f.id] ? (
              <img
                src={urls[f.id]}
                alt={f.type}
                className="w-28 h-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setEnlarged(urls[f.id])}
              />
            ) : (
              <div className="w-28 h-28 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <span className="text-gray-300 text-2xl">🖼️</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {publication.length > 0 && renderGroup('Publicación', publication)}
        {reception.length > 0 && renderGroup('Recepción', reception)}
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(null)}
        >
          <img src={enlarged} alt="Evidencia" className="max-w-full max-h-full rounded-xl shadow-xl" />
        </div>
      )}
    </>
  );
}
