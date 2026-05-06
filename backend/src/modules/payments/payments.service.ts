import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  async initiate(_body: any) {
    // TODO: crear preferencia MP con marketplace_fee según fee_payer
    return { message: 'initiate' };
  }

  async release(_paymentId: string) {
    // TODO: liberar fondos retenidos al vendedor via MP API
    return { message: 'release' };
  }

  async refund(_paymentId: string) {
    // TODO: emitir reembolso completo al comprador via MP API
    return { message: 'refund' };
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string) {
    // TODO: validar HMAC-SHA256, procesar evento MP, actualizar estado transacción
    void rawBody;
    void signature;
    return { message: 'webhook' };
  }
}
