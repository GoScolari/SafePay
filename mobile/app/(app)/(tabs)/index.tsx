import React, { useCallback, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
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
import { Spacing, Typography } from '@/constants/theme';
import { formatDate } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Section = { title: string; emoji: string; data: Transaction[] };

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
  if (attention.length)  sections.push({ emoji: '⚡', title: 'REQUIEREN TU ATENCIÓN', data: attention });
  if (inProgress.length) sections.push({ emoji: '🔄', title: 'EN PROGRESO',           data: inProgress });
  if (recent.length)     sections.push({ emoji: '📋', title: 'RECIENTES',             data: recent.slice(0, 5) });
  return sections;
}

function getAvatarLabel(fullName?: string): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const setTransactions = useTransactionStore((s) => s.setTransactions);
  const [refreshing, setRefreshing] = useState(false);

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

  const sections = data && user?.id ? classifyTransactions(data, user.id) : [];
  const attentionCount = sections.find((s) => s.title.includes('ATENCIÓN'))?.data.length ?? 0;
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="home"
        greeting={`Hola, ${firstName}`}
        title="Transacciones"
        avatarLabel={getAvatarLabel(user?.fullName)}
        onAvatarPress={() => router.push('/(app)/profile' as never)}
      />

      {isLoading && !data ? (
        <View style={styles.loadingWrap}>
          <EmptyState
            icon="clock"
            title="Cargando…"
            compact
          />
        </View>
      ) : isError ? (
        <EmptyState
          tone="danger"
          icon="wifi-off"
          title="Sin conexión"
          body="No pudimos cargar tus transacciones."
          action={{ label: 'Reintentar', icon: 'refresh-cw', onPress: () => void refetch() }}
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="shield"
          title="Sin transacciones aún"
          body="Creá tu primera transacción para empezar a vender o comprar de forma protegida."
          action={{
            label: '+ Crear transacción',
            onPress: () => router.push('/(app)/transactions/new' as never),
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(tx) => tx.id}
          renderItem={({ item }) => (
            <TransactionCard
              tx={toCardData(item, user?.id ?? '')}
              onPress={(card) => router.push(`/(app)/transactions/${card.id}` as never)}
              style={styles.card}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{section.emoji}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
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
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        label="Nueva transacción"
        extended={attentionCount === 0 && sections.length === 0}
        onPress={() => router.push('/(app)/transactions/new' as never)}
        accessibilityLabel="Crear transacción"
      />
    </ScreenContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionEmoji: {
    fontSize: 13,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
