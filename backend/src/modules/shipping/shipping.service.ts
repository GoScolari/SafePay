import { Injectable } from '@nestjs/common';

@Injectable()
export class ShippingService {
  async registerTracking(_body: any) {
    // TODO: guardar tracking, cambiar tx a EN_TRANSITO, iniciar polling
    return { message: 'tracking registered' };
  }

  async getStatus(_txId: string) {
    // TODO: retornar estado actual del shipment
    return { message: 'status' };
  }

  async handleWebhook(_body: any, _signature: string) {
    // TODO: validar firma courier, actualizar shipment.status
    return { message: 'webhook' };
  }
}
