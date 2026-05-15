export type TxStatus =
  | 'PROPUESTA'
  | 'CONFIRMADA'
  | 'PAGADO'
  | 'EN_TRANSITO'
  | 'ENTREGADO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'REEMBOLSADO'
  | 'EN_DISPUTA'
  | 'EXPIRADO';

export const TX_STATUS_LABEL: Record<TxStatus, string> = {
  PROPUESTA:   'Propuesta',
  CONFIRMADA:  'Confirmada',
  PAGADO:      'Pagado',
  EN_TRANSITO: 'En tránsito',
  ENTREGADO:   'Entregado',
  COMPLETADO:  'Completado',
  CANCELADO:   'Cancelado',
  REEMBOLSADO: 'Reembolsado',
  EN_DISPUTA:  'En disputa',
  EXPIRADO:    'Expirado',
};

export const TX_STATUS_COLOR: Record<TxStatus, string> = {
  PROPUESTA:   '#F59E0B',
  CONFIRMADA:  '#3B82F6',
  PAGADO:      '#8B5CF6',
  EN_TRANSITO: '#06B6D4',
  ENTREGADO:   '#10B981',
  COMPLETADO:  '#22C55E',
  CANCELADO:   '#6B7280',
  REEMBOLSADO: '#EF4444',
  EN_DISPUTA:  '#F97316',
  EXPIRADO:    '#9CA3AF',
};

export const TX_STATUS_FLOW_SHIPPING: TxStatus[] = [
  'PROPUESTA', 'CONFIRMADA', 'PAGADO', 'EN_TRANSITO', 'ENTREGADO', 'COMPLETADO',
];

export const TX_STATUS_FLOW_PRESENTIAL: TxStatus[] = [
  'PROPUESTA', 'CONFIRMADA', 'PAGADO', 'ENTREGADO', 'COMPLETADO',
];

export const TX_STATUS_FLOW = TX_STATUS_FLOW_SHIPPING;
