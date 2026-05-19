'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import type { User, Transaction } from '@/lib/types';

function fmt(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

interface UserDetail extends User {
  recentTransactions?: Transaction[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [banning, setBanning] = useState(false);
  const [banError, setBanError] = useState('');

  useEffect(() => {
    api.get<UserDetail>(`/admin/users/${id}`)
      .then((r) => setUser(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleBan = async () => {
    setShowConfirm(false);
    setBanning(true);
    setBanError('');
    try {
      await api.post(`/admin/users/${id}/ban`);
      setUser((prev) => prev ? { ...prev, banned: true } : prev);
    } catch (e: any) {
      setBanError(e?.response?.data?.message ?? 'Error al banear el usuario.');
    } finally {
      setBanning(false);
    }
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!user)   return <p className="text-red-500">Usuario no encontrado.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      {showConfirm && (
        <ConfirmModal
          title="Banear usuario"
          message={`¿Banear a ${user.fullName}? El usuario no podrá iniciar sesión ni realizar transacciones.`}
          confirmLabel="Banear"
          danger
          onConfirm={handleBan}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
        {user.banned && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Baneado</span>
        )}
        {user.role === 'admin' && (
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">Admin</span>
        )}
      </div>

      <Section title="Perfil">
        <Row label="Nombre" value={user.fullName} />
        <Row label="Teléfono" value={user.phone} />
        <Row label="Email" value={user.email ?? '—'} />
        <Row label="RUT" value={user.rut ?? '—'} />
        <Row label="Rating" value={user.rating ?? '—'} />
        <Row label="Transacciones completadas" value={user.totalTx ?? 0} />
        <Row label="Registrado" value={fmt(user.createdAt)} />
      </Section>

      {/* Últimas transacciones */}
      {user.recentTransactions && user.recentTransactions.length > 0 && (
        <Section title="Últimas transacciones">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-400">Estado</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-400">Monto</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-400">Slug</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-400">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {user.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50">
                  <td className="py-2"><StatusBadge type="tx" value={tx.status} /></td>
                  <td className="py-2 text-gray-700 font-medium">${tx.amount.toLocaleString('es-CL')}</td>
                  <td className="py-2 font-mono text-xs text-gray-400">{tx.slug}</td>
                  <td className="py-2 text-gray-400 text-xs">{fmt(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Acción ban */}
      {!user.banned && user.role !== 'admin' && (
        <Section title="Acciones de moderación">
          <p className="text-xs text-gray-400 mb-3">El ban impide el acceso del usuario a la plataforma.</p>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={banning}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {banning ? 'Baneando...' : '🚫 Banear usuario'}
          </button>
          {banError && <p className="text-red-500 text-xs mt-2">{banError}</p>}
        </Section>
      )}
    </div>
  );
}
