import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction } from '@/stores/transaction.store';

export function useTransaction(id: string) {
  const queryClient = useQueryClient();

  const { data: tx, isLoading, isError, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transaction', id] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => api.post(`/transactions/${id}/accept`),
    onSuccess: invalidate,
  });

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: () => api.post(`/transactions/${id}/cancel`),
    onSuccess: invalidate,
  });

  const { mutate: releasePayment, isPending: releasing } = useMutation({
    mutationFn: (paymentId: string) => api.post(`/payments/release/${paymentId}`),
    onSuccess: invalidate,
  });

  const copyLink = async () => {
    if (!tx) return;
    await Clipboard.setStringAsync(`https://safepay.cl/tx/${tx.slug}`);
  };

  return { tx, isLoading, isError, refetch, accept, accepting, cancel, cancelling, releasePayment, releasing, copyLink };
}
