'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import type { Transaction, TxStatus } from '@/lib/types';

const ALL_STATUSES: TxStatus[] = [
  'PROPUESTA','CONFIRMADA','PAGADO','EN_TRANSITO',
  'ENTREGADO','EN_DISPUTA','COMPLETADO','CANCELADO','REEMBOLSADO','EXPIRADO',
];

function fmt(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
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

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<TxStatus>('PROPUESTA');
  const [showConfirm, setShowConfirm] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [forceError, setForceError] = useState('');

  useEffect(() => {
    api.get<Transaction>(`/admin/transactions/${id}`)
      .then((r) => { setTx(r.data); setNewStatus(r.data.status); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleForceStatus = async () => {
    setShowConfirm(false);
    setForcing(true);
    setForceError('');
    try {
      await api.post(`/admin/transactions/${id}/force-status`, { status: newStatus });
      setTx((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (e: any) {
      setForceError(e?.response?.data?.message ?? 'Error al forzar el estado.');
    } finally {
      setForcing(false);
    }
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!tx)    return <p className="text-red-500">Transacción no encontrada.</p>;

  const isBuyerInitiator = tx.initiatorRole === 'buyer';
  const buyer = isBuyerInitiator ? tx.initiator : tx.counterpart;
  const seller = isBuyerInitiator ? tx.counterpart : tx.initiator;

  return (
    <div className="max-w-3xl space-y-4">
      {showConfirm && (
        <ConfirmModal
          title="Forzar estado"
          message={`¿Cambiar el estado de la transacción a "${newStatus}"? Esta acción queda registrada en los logs.`}
          confirmLabel="Confirmar cambio"
          danger
          onConfirm={handleForceStatus}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900">Transacción</h1>
        <StatusBadge type="tx" value={tx.status} />
        <span className="font-mono text-xs text-gray-400">{tx.slug}</span>
      </div>

      <Section title="Datos generales">
        <Row label="Monto" value={`$${tx.amount.toLocaleString('es-CL')}`} />
        <Row label="Comisión" value={`$${tx.fee.toLocaleString('es-CL')}`} />
        <Row label="Quién paga comisión" value={tx.feePayer} />
        <Row label="Descripción" value={tx.description} />
        <Row label="Modalidad" value={tx.modality === 'shipping' ? 'Envío' : 'Presencial'} />
        <Row label="Comprador" value={buyer ? `${buyer.fullName} · ${buyer.phone}` : '—'} />
        <Row label="Vendedor" value={seller ? `${seller.fullName} · ${seller.phone}` : '—'} />
        <Row label="Aceptada" value={fmt(tx.acceptedAt)} />
        <Row label="Expira" value={fmt(tx.expiresAt)} />
        <Row label="Creada" value={fmt(tx.createdAt)} />
      </Section>

      {tx.payment && (
        <Section title="Pago">
          <Row label="Estado pago" value={tx.payment.status} />
          <Row label="MP Payment ID" value={tx.payment.mpPaymentId ?? '—'} />
          <Row label="Total pagado" value={tx.payment.amountTotal ? `$${tx.payment.amountTotal.toLocaleString('es-CL')}` : '—'} />
          <Row label="Comisión plataforma" value={tx.payment.amountFeePlatform ? `$${tx.payment.amountFeePlatform.toLocaleString('es-CL')}` : '—'} />
          <Row label="Neto vendedor" value={tx.payment.amountSeller ? `$${tx.payment.amountSeller.toLocaleString('es-CL')}` : '—'} />
          <Row label="Liberado" value={fmt(tx.payment.releasedAt)} />
        </Section>
      )}

      {tx.shipment && (
        <Section title="Envío">
          <Row label="Courier" value={tx.shipment.courier} />
          <Row label="Tracking #" value={tx.shipment.trackingNumber} />
          <Row label="Estado" value={tx.shipment.status} />
          <Row label="Última consulta" value={fmt(tx.shipment.lastCheckedAt)} />
          <Row label="Entregado" value={fmt(tx.shipment.deliveredAt)} />
        </Section>
      )}

      {tx.dispute && (
        <Section title="Disputa">
          <Row label="Estado" value={<StatusBadge type="dispute" value={tx.dispute.status} />} />
          <Row label="Razón" value={tx.dispute.reason} />
          <Row label="Resolución" value={tx.dispute.resolution ?? '—'} />
          <div className="mt-2">
            <a href={`/disputes/${tx.dispute.id}`} className="text-indigo-600 text-sm font-medium hover:underline">
              Ver detalle de disputa →
            </a>
          </div>
        </Section>
      )}

      {/* Forzar estado */}
      <Section title="Forzar estado (admin)">
        <p className="text-xs text-gray-400 mb-3">Cambio manual con log de auditoría. Usar solo en casos excepcionales.</p>
        <div className="flex gap-3 items-center">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as TxStatus)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={forcing || newStatus === tx.status}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {forcing ? 'Forzando...' : 'Forzar estado'}
          </button>
        </div>
        {forceError && <p className="text-red-500 text-xs mt-2">{forceError}</p>}
      </Section>
    </div>
  );
}
