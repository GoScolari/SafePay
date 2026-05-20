'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { User } from '@/lib/types';

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannedOnly, setBannedOnly] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<User[]>('/admin/users')
      .then((r) => setUsers(r.data))
      .catch(() => setError('No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bannedOnly ? users.filter((u) => u.banned) : users;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={bannedOnly}
            onChange={(e) => setBannedOnly(e.target.checked)}
            className="accent-red-500"
          />
          Solo baneados
        </label>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Txs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                  <td className="px-4 py-3">
                    {u.role === 'admin' ? (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">Admin</span>
                    ) : (
                      <span className="text-gray-500 text-xs">Usuario</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Baneado</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Activo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.rating ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.totalTx ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}
