export const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  );

export const calculateFee = (amount: number): number => {
  if (amount <= 100_000) return 990;
  if (amount <= 500_000) return 1_490;
  return 1_990;
};
