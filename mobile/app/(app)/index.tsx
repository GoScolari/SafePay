import { View, Text, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { TransactionCard, TxCardData } from '@/components/TransactionCard';
import { Transaction, useTransactionStore } from '@/stores/transaction.store';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/lib/utils';

type Section = { title: string; data: Transaction[] };

function toCardData(tx: Transaction, userId: string): TxCardData {
  const isInitiator = tx.initiatorId === userId;
  const userRole: 'buyer' | 'seller' = isInitiator
    ? tx.initiatorRole
    : tx.initiatorRole === 'seller' ? 'buyer' : 'seller';
  const counterpart = isInitiator ? tx.counterpart : tx.initiator;
  return {
    id:               tx.id,
    status:           tx.status,
    userRole,
    mode:             tx.modality,
    title:            tx.description,
    amount:           tx.amount,
    counterpartyName: counterpart?.fullName ?? null,
    timeLabel:        formatDate(tx.createdAt),
  };
}

function classifyTransactions(txs: Transaction[], userId: string): Section[] {
  const attention: Transaction[] = [];
  const inProgress: Transaction[] = [];
  const recent: Transaction[] = [];

  for (const tx of txs) {
    const isInitiator   = tx.initiatorId === userId;
    const isCounterpart = tx.counterpartId === userId;
    const isBuyer = (isInitiator && tx.initiatorRole === 'buyer') ||
                    (isCounterpart && tx.initiatorRole === 'seller');

    if (
      (tx.status === 'PROPUESTA' && isCounterpart) ||
      (tx.status === 'ENTREGADO' && isBuyer)
    ) {
      attention.push(tx);
    } else if (['CONFIRMADA', 'PAGADO', 'EN_TRANSITO', 'EN_DISPUTA'].includes(tx.status)) {
      inProgress.push(tx);
    } else {
      recent.push(tx);
    }
  }

  const sections: Section[] = [];
  if (attention.length)  sections.push({ title: '⚡ Requieren tu atención', data: attention });
  if (inProgress.length) sections.push({ title: '🔄 En progreso',           data: inProgress });
  if (recent.length)     sections.push({ title: '📋 Recientes',             data: recent.slice(0, 5) });
  return sections;
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const setTransactions = useTransactionStore((s) => s.setTransactions);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<Transaction[]>('/transactions/my');
      setTransactions(res.data);
      return res.data;
    },
  });

  const sections = data && user?.id ? classifyTransactions(data, user.id) : [];
  const attentionCount = sections.find((s) => s.title.includes('atención'))?.data.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hola, {user?.fullName?.split(' ')[0]}
            {attentionCount > 0 ? ' 👋' : ' 👋'}
          </Text>
          <Text style={styles.subtitle}>
            {attentionCount > 0
              ? `${attentionCount} ${attentionCount === 1 ? 'transacción requiere' : 'transacciones requieren'} tu atención`
              : 'Tus transacciones'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.archiveBtn} onPress={() => router.push('/(app)/transactions/archived' as never)}>
            <Text style={styles.archiveBtnText}>🗂️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(app)/transactions/new')}>
            <Text style={styles.newBtnText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo cargar. Intenta de nuevo.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <SectionList
          sections={sections}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => (
            <TransactionCard
              tx={toCardData(item, user?.id ?? '')}
              onPress={(card) => router.push(`/(app)/transactions/${card.id}`)}
              style={{ marginHorizontal: 16, marginBottom: 8 }}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🤝</Text>
              <Text style={styles.emptyTitle}>Todavía no tenés transacciones</Text>
              <Text style={styles.emptySubtitle}>Creá tu primera transacción segura</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/transactions/new')}>
                <Text style={styles.emptyBtnText}>Crear mi primera transacción</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : { paddingVertical: 8, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  archiveBtn:     { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  archiveBtnText: { fontSize: 16 },
  greeting:       { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  subtitle:       { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  newBtn:         { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionHeader:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText:      { color: Colors.textSecondary, fontSize: 15 },
  retryBtn:       { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:      { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyEmoji:     { fontSize: 48 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle:  { fontSize: 14, color: Colors.textSecondary },
  emptyBtn:       { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  emptyBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
