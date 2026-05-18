import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { TransactionCard } from '@/components/TransactionCard';
import { Transaction } from '@/stores/transaction.store';
import { Colors } from '@/constants/colors';
import { TxStatus } from '@/constants/txStatus';

type Filter = TxStatus | null;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Todas',        value: null },
  { label: 'Completadas',  value: 'COMPLETADO' },
  { label: 'Canceladas',   value: 'CANCELADO' },
  { label: 'Reembolsadas', value: 'REEMBOLSADO' },
  { label: 'Expiradas',    value: 'EXPIRADO' },
];

export default function ArchivedTransactionsScreen() {
  const [filter, setFilter] = useState<Filter>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['transactions-archived'],
    queryFn: () => api.get<Transaction[]>('/transactions/archived').then((r) => r.data),
  });

  const filtered = filter ? (data ?? []).filter((tx) => tx.status === filter) : (data ?? []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Archivadas</Text>
        <View style={{ minWidth: 32 }} />
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
        <FlatList
          data={filtered}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => <TransactionCard tx={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🗂️</Text>
              <Text style={styles.emptyTitle}>
                {filter ? 'Sin resultados para este filtro' : 'Sin transacciones archivadas'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter
                  ? 'Probá seleccionando otro filtro'
                  : 'Las transacciones completadas o canceladas que archives aparecerán aquí'}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:        { minWidth: 32 },
  backText:       { fontSize: 22, color: Colors.primary },
  title:          { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  filtersRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText:      { color: Colors.textSecondary, fontSize: 15 },
  retryBtn:       { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:      { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji:     { fontSize: 48 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
