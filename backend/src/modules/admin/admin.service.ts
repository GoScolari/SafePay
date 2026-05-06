import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async getDisputes() {
    return [];
  }

  async getDisputeDetail(_id: string) {
    return {};
  }

  async resolveDispute(_id: string, _body: any) {
    // TODO: emitir fallo, trigger pago/reembolso según resolution
    return { message: 'resolved' };
  }

  async getTransactions() {
    return [];
  }

  async getTransactionDetail(_id: string) {
    return {};
  }

  async forceStatus(_id: string, _status: string) {
    // Solo para casos edge — registrar en log de auditoría
    return { message: 'status forced' };
  }

  async getUsers() {
    return [];
  }

  async getUserDetail(_id: string) {
    return {};
  }

  async banUser(_id: string) {
    // TODO: marcar usuario como baneado
    return { message: 'banned' };
  }
}
