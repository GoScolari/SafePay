import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, Platform, Pressable, RefreshControl, StyleSheet, Text, UIManager, View } from 'react-native';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { EmptyState } from '@/components/chrome/EmptyState';
import { FAB } from '@/components/chrome/FAB';
import { TransactionCard, TxCardData } from '@/components/TransactionCard';

import { api } from '@/lib/api';
import { Transaction, useTransactionStore } from '@/stores/transaction.store';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { formatDate } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type TabKey = 'activas' | 'esperando' | 'completadas';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function classifyTab(tx: Transaction, userId: string): TabKey {
  const TERMINAL = ['COMPLETADO', 'CANCELADO', 'REEMBOLSADO', 'EXPIRADO'];
  if (TERMINAL.includes(tx.status)) return 'completadas';

  const isSeller =
    (tx.initiatorId === userId && tx.initiatorRole === 'seller') ||
    (tx.counterpartId === userId && tx.initiatorRole === 'buyer');

  switch (tx.status) {
    case 'PROPUESTA':
      return tx.counterpartId === userId ? 'activas' : 'esperando';
    case 'CONFIRMADA':
      return !isSeller ? 'activas' : 'esperando';
    case 'PAGADO':
      return isSeller ? 'activas' : 'esperando';
    case 'EN_TRANSITO':
      return 'esperando';
    case 'ENTREGADO':
      return !isSeller ? 'activas' : 'esperando';
    case 'EN_DISPUTA':
      return 'activas';
    default:
      return 'completadas';
  }
}

function getAvatarLabel(fullName?: string): string {
  if (!fullName) return '?';
  return fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const setTransactions = useTransactionStore((s) => s.setTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('activas');
  const [fabExpanded, setFabExpanded] = useState(false);
  const fabTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(fabTimerRef.current), []);

  const collapseFab = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFabExpanded(false);
    clearTimeout(fabTimerRef.current);
  };

  const handleFabPress = () => {
    if (fabExpanded) {
      collapseFab();
      router.push('/(app)/transactions/new' as never);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFabExpanded(true);
      fabTimerRef.current = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFabExpanded(false);
      }, 4000);
    }
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<Transaction[]>('/transactions/my');
      setTransactions(res.data);
      return res.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const userId = user?.id ?? '';
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  const counts = { activas: 0, esperando: 0, completadas: 0 };
  const tabItems: Transaction[] = [];

  if (data && userId) {
    for (const tx of data) {
      const tab = classifyTab(tx, userId);
      counts[tab]++;
      if (tab === activeTab) tabItems.push(tx);
    }
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'activas',     label: 'Activas',    count: counts.activas },
    { key: 'esperando',   label: 'Esperando',  count: counts.esperando },
    { key: 'completadas', label: 'Completadas', count: counts.completadas },
  ];

  // Usuario nuevo: cero transacciones en total
  if (!isLoading && !isError && data?.length === 0) {
    return (
      <ScreenContainer padding={false} edges={['top']}>
        <AppHeader
          variant="home"
          greeting={`Hola, ${firstName}`}
          title="Transacciones"
          avatarLabel={getAvatarLabel(user?.fullName)}
          onAvatarPress={() => router.push('/(app)/profile' as never)}
        />
        <EmptyState
          icon="shield"
          title="Todavía no tenés transacciones"
          body="Creá tu primera transacción segura"
          action={{
            label: 'Crear mi primera transacción',
            onPress: () => router.push('/(app)/transactions/new' as never),
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="home"
        greeting={`Hola, ${firstName}`}
        title="Transacciones"
        avatarLabel={getAvatarLabel(user?.fullName)}
        onAvatarPress={() => router.push('/(app)/profile' as never)}
      />

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
                {tab.count > 0 ? (
                  <Text style={[styles.tabCount, active && styles.tabCountActive]}>
                    {' '}{tab.count}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && !data ? (
        <View style={styles.loadingWrap}>
          <EmptyState icon="clock" title="Cargando…" compact />
        </View>
      ) : isError ? (
        <EmptyState
          tone="danger"
          icon="wifi-off"
          title="Sin conexión"
          body="No pudimos cargar tus transacciones."
          action={{ label: 'Reintentar', icon: 'refresh-cw', onPress: () => void refetch() }}
        />
      ) : tabItems.length === 0 ? (
        <EmptyState
          icon={activeTab === 'completadas' ? 'check-circle' : 'shield'}
          title={
            activeTab === 'activas'     ? 'Sin transacciones activas' :
            activeTab === 'esperando'   ? 'Nada esperando por ahora' :
            'Sin transacciones completadas'
          }
          body={
            activeTab === 'activas'
              ? 'Creá tu primera transacción para empezar a vender o comprar de forma protegida.'
              : undefined
          }
          action={undefined}
        />
      ) : (
        <FlatList
          data={tabItems}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => (
            <TransactionCard
              tx={toCardData(item, userId)}
              onPress={(card) => router.push(`/(app)/transactions/${card.id}` as never)}
              style={styles.card}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {fabExpanded && (
        <Pressable style={styles.fabOverlay} onPress={collapseFab} />
      )}

      <FAB
        icon="plus"
        label="Crear transacción"
        extended={fabExpanded}
        onPress={handleFabPress}
        accessibilityLabel="Crear transacción"
      />
    </ScreenContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabLabel: {
    ...Typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabCount: {
    color: Colors.textMuted,
    fontWeight: '700',
  },
  tabCountActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  list: {
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
