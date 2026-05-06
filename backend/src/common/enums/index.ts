export enum TxStatus {
  PROPUESTA = 'PROPUESTA',
  CONFIRMADA = 'CONFIRMADA',
  PAGADO = 'PAGADO',
  EN_TRANSITO = 'EN_TRANSITO',
  ENTREGADO = 'ENTREGADO',
  EN_DISPUTA = 'EN_DISPUTA',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  REEMBOLSADO = 'REEMBOLSADO',
  EXPIRADO = 'EXPIRADO',
}

export enum TxRole {
  SELLER = 'seller',
  BUYER = 'buyer',
}

export enum TxModality {
  SHIPPING = 'shipping',
  PRESENTIAL = 'presential',
}

export enum FeePayer {
  SELLER = 'seller',
  BUYER = 'buyer',
  SPLIT = 'split',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum PaymentStatus {
  PENDING = 'pending',
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
}

export enum FileType {
  PUBLICATION = 'publication',
  RECEPTION = 'reception',
}

export enum CourierType {
  CHILEXPRESS = 'chilexpress',
  BLUEXPRESS = 'bluexpress',
}

export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  LOST = 'lost',
}

export enum DisputeReason {
  NOT_RECEIVED = 'not_received',
  NOT_AS_DESCRIBED = 'not_as_described',
  DAMAGED = 'damaged',
  INCOMPLETE = 'incomplete',
  OTHER = 'other',
}

export enum DisputeStatus {
  OPEN = 'open',
  RESPONDED = 'responded',
  RESOLVED = 'resolved',
}

export enum DisputeResolution {
  BUYER = 'buyer',
  SELLER = 'seller',
  SPLIT = 'split',
}

export enum NotificationType {
  TX_ACCEPTED = 'TX_ACCEPTED',
  TX_PAID = 'TX_PAID',
  TX_SHIPPED = 'TX_SHIPPED',
  TX_DELIVERED = 'TX_DELIVERED',
  TX_COMPLETED = 'TX_COMPLETED',
  TX_DISPUTED = 'TX_DISPUTED',
  TX_EXPIRING = 'TX_EXPIRING',
  TX_SHIPPING_ALERT = 'TX_SHIPPING_ALERT',
}
