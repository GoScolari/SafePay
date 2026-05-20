'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import type { Transaction, TxStatus } from '@/lib/types';

const ALL_STATUSES: TxStatus[] = [
  'PROPUESTA','CONFIRMADA','PAGADO','EN_TRANSITO',
  'ENTREGADO','EN_DISPUTA','COMPLETADO','CANCELADO','REEMBOLSADO','EXPIRADO',
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TxStatus | ''>('');

  const [error, setError] = useState('');

  const load = (status: TxStatus | '') => {
    setLoading(true);
    setError('');
    const url = status ? `/admin/transactions?status=${status}` : '/admin/transactions';
    api.get<Transaction[]>(url)
      .then((r) => setTxs(r.data))
      .catch(() => setError('No se pudieron cargar las transacciones'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  const handleFilter = (v: TxStatus | '') => {
    setStatusFilter(v);
    load(v);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">{txs.length} resultado{txs.length !== 1 ? 's' : ''}</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleFilter(e.target.value as TxStatus | '')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Modalidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Iniciador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Creada</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3"><StatusBadge type="tx" value={tx.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{tx.slug}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${tx.amount.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-gray-600">{tx.modality === 'shipping' ? 'Envío' : 'Presencial'}</td>
                  <td className="px-4 py-3 text-gray-600">{tx.initiator?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(tx.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/transactions/${tx.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && (
            <p className="text-center text-gray-400 py-12">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}
