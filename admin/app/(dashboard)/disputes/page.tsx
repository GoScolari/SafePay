'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import type { Dispute } from '@/lib/types';

const REASON_LABEL: Record<string, string> = {
  not_received:    'No recibido',
  not_as_described:'No es lo acordado',
  damaged:         'Dañado',
  incomplete:      'Incompleto',
  other:           'Otro',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Dispute[]>('/admin/disputes')
      .then((r) => setDisputes(r.data))
      .catch(() => setError('No se pudieron cargar las disputas'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Cargando disputas...</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Disputas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{disputes.length} disputa{disputes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-gray-500 font-medium">Sin disputas pendientes</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Razón</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comprador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responder antes de</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Abierta</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3"><StatusBadge type="dispute" value={d.status} /></td>
                  <td className="px-4 py-3 text-gray-700">{REASON_LABEL[d.reason] ?? d.reason}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {d.transaction ? `$${d.transaction.amount.toLocaleString('es-CL')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.openedBy?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {d.respondBefore ? fmt(d.respondBefore) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/disputes/${d.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
