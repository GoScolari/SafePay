import type { TxStatus, DisputeStatus } from '@/lib/types';

const TX_COLORS: Record<TxStatus, string> = {
  PROPUESTA:   'bg-yellow-100 text-yellow-800',
  CONFIRMADA:  'bg-blue-100 text-blue-800',
  PAGADO:      'bg-indigo-100 text-indigo-800',
  EN_TRANSITO: 'bg-cyan-100 text-cyan-800',
  ENTREGADO:   'bg-teal-100 text-teal-800',
  EN_DISPUTA:  'bg-orange-100 text-orange-800',
  COMPLETADO:  'bg-green-100 text-green-800',
  CANCELADO:   'bg-gray-100 text-gray-600',
  REEMBOLSADO: 'bg-purple-100 text-purple-800',
  EXPIRADO:    'bg-red-100 text-red-700',
};

const TX_LABELS: Record<TxStatus, string> = {
  PROPUESTA:   'Propuesta',
  CONFIRMADA:  'Confirmada',
  PAGADO:      'Pagado',
  EN_TRANSITO: 'En tránsito',
  ENTREGADO:   'Entregado',
  EN_DISPUTA:  'En disputa',
  COMPLETADO:  'Completado',
  CANCELADO:   'Cancelado',
  REEMBOLSADO: 'Reembolsado',
  EXPIRADO:    'Expirado',
};

const DISPUTE_COLORS: Record<DisputeStatus, string> = {
  open:      'bg-red-100 text-red-800',
  responded: 'bg-orange-100 text-orange-800',
  resolved:  'bg-green-100 text-green-800',
};

const DISPUTE_LABELS: Record<DisputeStatus, string> = {
  open:      'Abierta',
  responded: 'Respondida',
  resolved:  'Resuelta',
};

interface Props {
  type: 'tx' | 'dispute';
  value: string;
}

export default function StatusBadge({ type, value }: Props) {
  if (type === 'tx') {
    const status = value as TxStatus;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TX_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {TX_LABELS[status] ?? value}
      </span>
    );
  }
  const status = value as DisputeStatus;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${DISPUTE_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {DISPUTE_LABELS[status] ?? value}
    </span>
  );
}
