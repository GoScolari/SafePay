import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { TransactionCard } from '@/components/TransactionCard';
import { Transaction, useTransactionStore } from '@/stores/transaction.store';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.fullName?.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>Tus transacciones</Text>
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
        <FlatList
          data={data ?? []}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => <TransactionCard tx={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Sin transacciones aún</Text>
              <Text style={styles.emptySubtitle}>Creá tu primera transacción segura</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/transactions/new')}>
                <Text style={styles.emptyBtnText}>Crear transacción</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={data?.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
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
