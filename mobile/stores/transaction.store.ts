import { create } from 'zustand';
import { TxStatus } from '@/constants/txStatus';

export interface Transaction {
  id: string;
  slug: string;
  status: TxStatus;
  amount: number;
  fee: number;
  feePayer: 'buyer' | 'seller' | 'split';
  description: string;
  initiatorId: string;
  initiatorRole: 'seller' | 'buyer';
  counterpartId: string | null;
  modality: 'shipping' | 'in_person';
  expiresAt: string;
  createdAt: string;
  initiator?: { fullName: string };
  counterpart?: { fullName: string } | null;
}

interface TransactionState {
  transactions: Transaction[];
  activeTransaction: Transaction | null;
  setTransactions: (txs: Transaction[]) => void;
  setActive: (tx: Transaction | null) => void;
  updateStatus: (id: string, status: TxStatus) => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions:       [],
  activeTransaction:  null,

  setTransactions: (transactions) => set({ transactions }),

  setActive: (activeTransaction) => set({ activeTransaction }),

  updateStatus: (id, status) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, status } : tx,
      ),
      activeTransaction:
        state.activeTransaction?.id === id
          ? { ...state.activeTransaction, status }
          : state.activeTransaction,
    })),
}));
