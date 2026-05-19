export type TxStatus =
  | 'PROPUESTA' | 'CONFIRMADA' | 'PAGADO' | 'EN_TRANSITO'
  | 'ENTREGADO' | 'EN_DISPUTA' | 'COMPLETADO' | 'CANCELADO'
  | 'REEMBOLSADO' | 'EXPIRADO';

export type DisputeStatus = 'open' | 'responded' | 'resolved';
export type DisputeResolution = 'buyer' | 'seller' | 'split';
export type DisputeReason = 'not_received' | 'not_as_described' | 'damaged' | 'incomplete' | 'other';
export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  rut?: string;
  role: UserRole;
  banned: boolean;
  rating?: number;
  totalTx?: number;
  createdAt: string;
}

export interface TransactionFile {
  id: string;
  type: 'publication' | 'reception';
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  mpPaymentId?: string;
  amountTotal: number;
  amountFeePlatform?: number;
  amountSeller?: number;
  releasedAt?: string;
}

export interface Shipment {
  id: string;
  courier: string;
  trackingNumber: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  rawStatus?: string;
  lastCheckedAt?: string;
  deliveredAt?: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  reason: DisputeReason;
  description?: string;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  vendorResponse?: string;
  resolutionNote?: string;
  respondBefore?: string;
  resolvedAt?: string;
  createdAt: string;
  openedBy?: User;
  transaction?: Transaction;
}

export interface Transaction {
  id: string;
  slug: string;
  status: TxStatus;
  amount: number;
  fee: number;
  feePayer: string;
  description: string;
  modality: 'shipping' | 'presential';
  initiatorRole: 'seller' | 'buyer';
  acceptedAt?: string;
  expiresAt?: string;
  autoReleaseAt?: string;
  archivedAt?: string;
  createdAt: string;
  initiator?: User;
  counterpart?: User;
  payment?: Payment;
  shipment?: Shipment;
  dispute?: Dispute;
  files?: TransactionFile[];
}
