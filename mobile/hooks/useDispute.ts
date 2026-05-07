import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DisputeReason   = 'not_received' | 'not_as_described' | 'damaged' | 'incomplete' | 'other';
export type DisputeStatus   = 'open' | 'responded' | 'resolved';
export type DisputeResolution = 'buyer' | 'seller' | 'split';

export interface Dispute {
  id: string;
  transactionId: string;
  openedById: string;
  reason: DisputeReason;
  description?: string;
  vendorResponse?: string;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolutionNote?: string;
  respondBefore: string;
  resolvedAt?: string;
  createdAt: string;
}

export function useDispute(disputeId: string) {
  const queryClient = useQueryClient();

  const { data: dispute, isLoading, isError, refetch } = useQuery<Dispute>({
    queryKey: ['dispute', disputeId],
    queryFn: () => api.get<Dispute>(`/disputes/${disputeId}`).then((r) => r.data),
    enabled: !!disputeId,
  });

  const { mutate: respond, isPending: responding } = useMutation({
    mutationFn: (response: string) => api.post(`/disputes/${disputeId}/respond`, { response }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] }),
  });

  return { dispute, isLoading, isError, refetch, respond, responding };
}

export function useOpenDispute() {
  const { mutate: open, isPending: isOpening, isSuccess, data } = useMutation({
    mutationFn: ({ txId, reason, description }: { txId: string; reason: DisputeReason; description?: string }) =>
      api.post<{ disputeId: string; respondBefore: string; status: string }>(`/disputes/${txId}/open`, { reason, description })
        .then((r) => r.data),
  });

  return { open, isOpening, isSuccess, result: data };
}
