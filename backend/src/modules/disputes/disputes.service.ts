import { Injectable } from '@nestjs/common';

@Injectable()
export class DisputesService {
  async open(_txId: string, _body: any, _userId: string) {
    // TODO: validar estado EN_TRÁNSITO/ENTREGADO, congelar pago, set respond_before
    return { message: 'dispute opened' };
  }

  async respond(_id: string, _body: any, _userId: string) {
    // TODO: validar que es el vendedor, cambiar status a responded
    return { message: 'responded' };
  }

  async findById(_id: string) {
    // TODO: retornar disputa con evidencia fotográfica
    return { message: 'dispute' };
  }

  async resolve(_id: string, _body: any, _userId: string) {
    // TODO: solo admin, emitir fallo, trigger pago/reembolso
    return { message: 'resolved' };
  }
}
