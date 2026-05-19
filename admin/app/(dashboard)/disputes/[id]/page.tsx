'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import EvidenceGallery from '@/components/EvidenceGallery';
import type { Dispute, DisputeResolution } from '@/lib/types';

const REASON_LABEL: Record<string, string> = {
  not_received:    'No recibido',
  not_as_described:'No es lo acordado',
  damaged:         'Dañado',
  incomplete:      'Incompleto',
  other:           'Otro',
};

const RESOLUTION_OPTIONS: { value: DisputeResolution; label: string; desc: string }[] = [
  { value: 'buyer',  label: 'Fallo a favor del Comprador', desc: 'Se reembolsa el monto completo al comprador.' },
  { value: 'seller', label: 'Fallo a favor del Vendedor',  desc: 'Se libera el monto al vendedor.' },
  { value: 'split',  label: 'División equitativa',          desc: 'Se libera al vendedor, pero se reembolsa la mitad al comprador.' },
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

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<DisputeResolution>('buyer');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.get<Dispute>(`/admin/disputes/${id}`)
      .then((r) => setDispute(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleResolve = async () => {
    if (note.trim().length < 10) {
      setSubmitError('La nota de resolución debe tener al menos 10 caracteres.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { resolution, resolutionNote: note.trim() });
      router.push('/disputes');
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? 'Error al emitir el veredicto.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!dispute) return <p className="text-red-500">Disputa no encontrada.</p>;

  const tx = dispute.transaction;
  const isBuyerInitiator = tx?.initiatorRole === 'buyer';
  const buyer = isBuyerInitiator ? tx?.initiator : tx?.counterpart;
  const seller = isBuyerInitiator ? tx?.counterpart : tx?.initiator;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900">Detalle de disputa</h1>
        <StatusBadge type="dispute" value={dispute.status} />
      </div>

      {/* Transacción */}
      {tx && (
        <Section title="Transacción">
          <Row label="Monto" value={`$${tx.amount.toLocaleString('es-CL')}`} />
          <Row label="Descripción" value={tx.description} />
          <Row label="Modalidad" value={tx.modality === 'shipping' ? 'Envío' : 'Presencial'} />
          <Row label="Estado tx" value={<StatusBadge type="tx" value={tx.status} />} />
          <Row label="Slug" value={tx.slug} />
          <Row label="Creada" value={fmt(tx.createdAt)} />
        </Section>
      )}

      {/* Partes */}
      <Section title="Partes involucradas">
        <Row label="Comprador" value={buyer ? `${buyer.fullName} · ${buyer.phone}` : '—'} />
        <Row label="Vendedor" value={seller ? `${seller.fullName} · ${seller.phone}` : '—'} />
      </Section>

      {/* Disputa */}
      <Section title="Disputa">
        <Row label="Razón" value={REASON_LABEL[dispute.reason] ?? dispute.reason} />
        <Row label="Descripción" value={dispute.description ?? '—'} />
        <Row label="Deadline respuesta" value={fmt(dispute.respondBefore)} />
        <Row label="Abierta" value={fmt(dispute.createdAt)} />
        {dispute.vendorResponse && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Respuesta del vendedor</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{dispute.vendorResponse}</p>
          </div>
        )}
        {dispute.resolutionNote && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nota de resolución</p>
            <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{dispute.resolutionNote}</p>
            <Row label="Resuelta" value={fmt(dispute.resolvedAt)} />
          </div>
        )}
      </Section>

      {/* Evidencia */}
      <Section title="Evidencia fotográfica">
        <EvidenceGallery files={tx?.files ?? []} />
      </Section>

      {/* Formulario de resolución */}
      {dispute.status !== 'resolved' && (
        <Section title="Emitir veredicto">
          <div className="space-y-3 mb-4">
            {RESOLUTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  resolution === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolution"
                  value={opt.value}
                  checked={resolution === opt.value}
                  onChange={() => setResolution(opt.value)}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">Nota de resolución *</label>
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setSubmitError(''); }}
            rows={4}
            placeholder="Explicá brevemente la razón del fallo (mín. 10 caracteres)..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-indigo-500 mb-3"
          />

          {submitError && <p className="text-red-500 text-xs mb-3">{submitError}</p>}

          <button
            onClick={handleResolve}
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Emitiendo veredicto...' : '⚖️ Emitir veredicto'}
          </button>
        </Section>
      )}
    </div>
  );
}
