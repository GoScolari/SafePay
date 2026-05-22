/**
 * SafePay · TxDetailScreen · app/(app)/transactions/[id].tsx
 *
 * Pantalla central de una transacción. Estructura:
 *
 *   ┌─ AppHeader (back + share)
 *   ├─ Hero card · monto + StatusBadge
 *   ├─ NextActionCard · qué hace el usuario AHORA (status × rol)
 *   ├─ StatusStepper · timeline visual
 *   └─ Detail rows · contraparte, fee, tracking
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/chrome/ScreenContainer';
import { AppHeader } from '@/components/chrome/AppHeader';
import { EmptyState } from '@/components/chrome/EmptyState';
import { ActionButton } from '@/components/ActionButton';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusStepper } from '@/components/StatusStepper';
import { useToast } from '@/components/chrome/Toast';

import { useTransaction } from '@/hooks/useTransaction';
import { useFiles, type UploadedFile } from '@/hooks/useFiles';
import { PhotoViewer } from '@/components/PhotoViewer';
import { useAuthStore } from '@/stores/auth.store';

import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { TxStatus } from '@/constants/txStatus';
import { formatCLP } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export default function TxDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    tx, isLoading, isError, refetch,
    accept, accepting,
    cancel, cancelling,
    releasePayment, releasing,
    deliver, delivering,
    devDeliver, devDelivering,
    archive, archiving,
    copyLink,
  } = useTransaction(id);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !tx) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" title="Cargando…" onBack={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (isError || !tx) {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="back" title="Transacción" onBack={() => router.back()} />
        <EmptyState
          tone="danger"
          icon="alert-circle"
          title="No se pudo cargar"
          body="Verificá tu conexión y volvé a intentar."
          action={{ label: 'Reintentar', icon: 'refresh-cw', onPress: () => refetch() }}
        />
      </ScreenContainer>
    );
  }

  const isInitiator   = tx.initiatorId === userId;
  const isCounterpart = tx.counterpartId === userId;
  const isSeller =
    (tx.initiatorId === userId && tx.initiatorRole === 'seller') ||
    (tx.counterpartId === userId && tx.initiatorRole === 'buyer');

  const counterpartyName = isSeller
    ? (tx.initiatorRole === 'seller' ? tx.counterpart?.fullName : tx.initiator?.fullName) ?? null
    : (tx.initiatorRole === 'buyer'  ? tx.counterpart?.fullName : tx.initiator?.fullName) ?? null;

  const handleShare = async () => {
    await copyLink();
    toast.success('Link copiado al portapapeles', 'Compartilo por WhatsApp para que pague');
  };

  const nextAction = computeNextAction({
    status: tx.status,
    isInitiator,
    isCounterpart,
    isSeller,
    mode: tx.modality,
    txId: tx.id,
    paymentId: tx.payment?.id,
    disputeId: tx.dispute?.id,
  });

  return (
    <ScreenContainer padding={false} edges={['top']}>
      <AppHeader
        variant="back"
        subtitle="Transacción"
        title={tx.description}
        onBack={() => router.back()}
        actionIcon="share-2"
        onActionPress={handleShare}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero */}
        <HeroCard
          status={tx.status}
          amount={tx.amount}
          isSeller={isSeller}
        />

        {/* Next action */}
        {nextAction && (
          <NextActionCard
            action={nextAction}
            onShare={handleShare}
            onAccept={() => accept()}
            onCancel={() => {
              const isPagado = tx.status === 'PAGADO';
              Alert.alert(
                isPagado ? 'Cancelar transacción' : 'Cancelar propuesta',
                isPagado
                  ? 'El pago será reembolsado al comprador. Esta acción no se puede deshacer.'
                  : '¿Seguro que querés cancelar esta propuesta?',
                [
                  { text: 'Volver', style: 'cancel' },
                  { text: 'Cancelar', style: 'destructive', onPress: () => cancel() },
                ],
              );
            }}
            onRelease={() => releasePayment(tx.payment?.id ?? id)}
            onDeliver={() => deliver()}
            onDevDeliver={() => devDeliver()}
            accepting={accepting}
            cancelling={cancelling}
            releasing={releasing}
            delivering={delivering}
            devDelivering={devDelivering}
            router={router}
            toast={toast}
          />
        )}

        {/* Fotos del producto — siempre visibles mientras no terminal */}
        {!isTerminal(tx.status) && (
          <PhotoStrip
            txId={tx.id}
            router={router}
            fileType="publication"
            canEdit={isSeller}
            label="FOTOS DEL PRODUCTO"
          />
        )}

        {/* Fotos de evidencia — solo en ENTREGADO */}
        {tx.status === 'ENTREGADO' && (
          <PhotoStrip
            txId={tx.id}
            router={router}
            fileType="reception"
            canEdit={!isSeller}
            label={isSeller ? 'EVIDENCIA DEL COMPRADOR' : 'SUBÍ EVIDENCIA DE RECEPCIÓN'}
          />
        )}

        {/* Stepper */}
        <Text style={styles.sectionLabel}>Progreso</Text>
        <StatusStepper
          status={tx.status}
          flow={tx.modality}
        />

        {/* Detail */}
        <Text style={styles.sectionLabel}>Detalle</Text>
        <View style={styles.detail}>
          <DetailRow
            label={isSeller ? 'Comprador' : 'Vendedor'}
            value={counterpartyName ?? '— pendiente de aceptación'}
          />
          <DetailRow
            label="Modo"
            value={tx.modality === 'shipping' ? 'Envío por courier' : 'Presencial'}
          />
          <DetailRow
            label="Fee SafePay"
            value={`${formatCLP(tx.fee)} · ${feePayerLabel(tx.feePayer)}`}
          />
          {isSeller && (
            <DetailRow
              label="Vas a recibir"
              value={formatCLP(netSellerAmount(tx.amount, tx.fee, tx.feePayer))}
            />
          )}
          <DetailRow label="Slug" value={tx.slug} mono last />
        </View>

        {/* Terminal: archivar */}
        {isTerminal(tx.status) && (
          <View style={styles.archiveWrap}>
            <ActionButton
              variant="outline"
              label="Archivar transacción"
              fullWidth
              loading={archiving}
              onPress={() => archive()}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NextAction
// ═══════════════════════════════════════════════════════════════════════════

type NextActionKey =
  | 'pay' | 'accept-or-reject' | 'register-shipping' | 'view-tracking'
  | 'confirm-reception' | 'open-dispute' | 'cancel' | 'waiting-counterparty'
  | 'waiting-confirmation' | 'view-dispute';

interface NextAction {
  key: NextActionKey;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconTone: 'primary' | 'warning' | 'success' | 'danger';
  title: string;
  body: string;
  urgent?: boolean;
  devAction?: { label: string; action: 'devDeliver' };
  primary: { label: string; action: 'share' | 'route' | 'accept' | 'cancel' | 'release' | 'deliver'; route?: string };
  secondary?: { label: string; variant: 'outline' | 'danger'; action: 'share' | 'route' | 'cancel'; route?: string };
}

function computeNextAction(p: {
  status: TxStatus;
  isInitiator: boolean;
  isCounterpart: boolean;
  isSeller: boolean;
  mode: 'shipping' | 'presential';
  txId: string;
  paymentId?: string;
  disputeId?: string;
}): NextAction | null {
  const { status, isInitiator, isCounterpart, isSeller, mode, txId, disputeId } = p;

  switch (status) {
    case 'PROPUESTA':
      // El iniciador espera — sea vendedor o comprador
      if (isInitiator) {
        return {
          key: 'waiting-counterparty',
          icon: 'clock',
          iconTone: 'primary',
          title: 'Esperando a la contraparte',
          body: 'Compartí el link de la propuesta. Cuando la contraparte acepte, podrán avanzar al pago.',
          primary: { label: 'Copiar link', action: 'share' },
          secondary: { label: 'Cancelar', variant: 'outline', action: 'cancel' },
        };
      }
      // La contraparte puede aceptar o rechazar
      if (isCounterpart) {
        return {
          key: 'accept-or-reject',
          icon: 'check-circle',
          iconTone: 'primary',
          title: 'Te invitaron a una transacción',
          body: isSeller
            ? 'El comprador quiere comprar de forma protegida. Aceptá para avanzar.'
            : 'El vendedor inició una propuesta. Aceptá para avanzar al pago protegido.',
          primary: { label: 'Aceptar propuesta', action: 'accept' },
          secondary: { label: 'Rechazar', variant: 'outline', action: 'cancel' },
        };
      }
      return null;

    case 'CONFIRMADA':
      if (!isSeller) {
        return {
          key: 'pay',
          icon: 'credit-card',
          iconTone: 'primary',
          title: 'Listo para pagar',
          body: 'Confirmaste los términos. Procedé a pagar para que SafePay retenga el dinero.',
          primary: { label: 'Ir a pagar', action: 'route', route: `/transactions/pay?txId=${txId}` },
        };
      }
      return {
        key: 'waiting-confirmation',
        icon: 'clock',
        iconTone: 'primary',
        title: 'Esperando el pago del comprador',
        body: 'La propuesta fue aceptada. El comprador puede proceder con el pago en cualquier momento.',
        primary: { label: 'Compartir link', action: 'share' },
      };

    case 'PAGADO':
      if (isSeller) {
        return {
          key: 'register-shipping',
          icon: mode === 'shipping' ? 'truck' : 'map-pin',
          iconTone: 'warning',
          urgent: true,
          title: mode === 'shipping' ? 'Tu turno · registrar envío' : 'Coordinar encuentro',
          body: mode === 'shipping'
            ? 'El comprador ya pagó. Despachá el producto y subí el código de tracking.'
            : 'El comprador ya pagó. Coordinen el encuentro y confirmá la entrega.',
          primary: mode === 'shipping'
            ? { label: 'Registrar envío', action: 'route', route: `/transactions/tracking?txId=${txId}` }
            : { label: 'Marcar como entregado', action: 'deliver' },
          secondary: { label: 'Cancelar transacción', variant: 'outline', action: 'cancel' },
        };
      }
      return {
        key: 'waiting-confirmation',
        icon: 'clock',
        iconTone: 'primary',
        title: 'Esperando al vendedor',
        body: 'Tu pago está retenido. El vendedor debe despachar o coordinar el encuentro.',
        primary: { label: 'Cancelar transacción', action: 'cancel' },
      };

    case 'EN_TRANSITO':
      return {
        key: 'view-tracking',
        icon: 'package',
        iconTone: 'primary',
        title: 'Paquete en camino',
        body: 'SafePay rastrea el envío automáticamente. Te avisamos al confirmarse la entrega.',
        primary: { label: 'Ver estado del envío', action: 'route', route: `/transactions/tracking?txId=${txId}` },
        devAction: isSeller ? { label: '🧪 Simular entrega', action: 'devDeliver' } : undefined,
      };

    case 'ENTREGADO':
      if (!isSeller) {
        return {
          key: 'confirm-reception',
          icon: 'check-circle',
          iconTone: 'success',
          title: '¿Recibiste lo acordado?',
          body: 'Si está todo bien, confirmá y liberamos el pago. Si hay un problema, abrí disputa antes de las 48h.',
          primary: { label: 'Confirmar recepción', action: 'release' },
          secondary: { label: 'Abrir disputa', variant: 'danger', action: 'route', route: `/disputes/new?txId=${txId}` },
        };
      }
      return {
        key: 'waiting-confirmation',
        icon: 'clock',
        iconTone: 'primary',
        title: 'Esperando confirmación',
        body: 'El comprador tiene 48h para confirmar. Si no responde, el pago se libera automáticamente.',
        primary: { label: 'Compartir transacción', action: 'share' },
      };

    case 'EN_DISPUTA':
      return {
        key: 'view-dispute',
        icon: 'alert-triangle',
        iconTone: 'danger',
        urgent: true,
        title: 'Disputa abierta',
        body: isSeller
          ? 'El comprador reportó un problema. Tenés 48h para responder con tu versión y evidencia.'
          : 'Estamos revisando la disputa. Te avisamos cuando haya resolución.',
        primary: {
          label: 'Ver disputa',
          action: 'route',
          route: disputeId ? `/disputes/${disputeId}` : `/disputes/by-tx/${txId}`,
        },
      };

    case 'COMPLETADO':
    case 'CANCELADO':
    case 'REEMBOLSADO':
    case 'EXPIRADO':
      return null;
  }
}

// ─── NextActionCard ─────────────────────────────────────────────────────────

interface NextActionCardProps {
  action: NextAction;
  onShare: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onRelease: () => void;
  onDeliver: () => void;
  onDevDeliver: () => void;
  accepting: boolean;
  cancelling: boolean;
  releasing: boolean;
  delivering: boolean;
  devDelivering: boolean;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>;
}

function NextActionCard({
  action, onShare, onAccept, onCancel, onRelease, onDeliver, onDevDeliver,
  accepting, cancelling, releasing, delivering, devDelivering, router,
}: NextActionCardProps) {
  const dispatch = (act: NextAction['primary']['action'], route?: string) => {
    switch (act) {
      case 'share':   return onShare();
      case 'accept':  return onAccept();
      case 'cancel':  return onCancel();
      case 'release': return onRelease();
      case 'deliver': return onDeliver();
      case 'route':   return route ? router.push(route as never) : undefined;
    }
  };

  const primaryLoading =
    (action.primary.action === 'accept'  && accepting)  ||
    (action.primary.action === 'cancel'  && cancelling) ||
    (action.primary.action === 'release' && releasing)  ||
    (action.primary.action === 'deliver' && delivering);

  const secondaryLoading =
    (action.secondary?.action === 'cancel' && cancelling);

  return (
    <View style={[styles.nextCard, action.urgent && styles.nextCardUrgent]}>
      <View style={styles.nextHeader}>
        <View style={[styles.nextIcon, toneStyle(action.iconTone)]}>
          <Feather name={action.icon} size={14} color={toneColor(action.iconTone)} />
        </View>
        <Text style={styles.nextTitle} numberOfLines={2}>{action.title}</Text>
      </View>
      <Text style={styles.nextBody}>{action.body}</Text>

      <ActionButton
        variant="primary"
        label={action.primary.label}
        fullWidth
        loading={primaryLoading}
        onPress={() => dispatch(action.primary.action, action.primary.route)}
      />
      {action.secondary && (
        <View style={{ marginTop: Spacing.xs }}>
          <ActionButton
            variant={action.secondary.variant === 'danger' ? 'danger' : 'outline'}
            label={action.secondary.label}
            fullWidth
            loading={secondaryLoading}
            onPress={() => dispatch(action.secondary!.action, action.secondary!.route)}
          />
        </View>
      )}
      {action.devAction && (
        <View style={{ marginTop: Spacing.xs }}>
          <ActionButton
            variant="outline"
            label={action.devAction.label}
            fullWidth
            loading={devDelivering}
            onPress={onDevDeliver}
          />
        </View>
      )}
    </View>
  );
}

// ─── PhotoStrip ─────────────────────────────────────────────────────────────

function PhotoStrip({
  txId,
  router,
  fileType,
  canEdit,
  label,
}: {
  txId: string;
  router: ReturnType<typeof useRouter>;
  fileType: 'publication' | 'reception';
  canEdit: boolean;
  label: string;
}) {
  const { files, deleteFile } = useFiles(txId, fileType);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex]     = useState(0);

  const uris = files.map((f) => f.localUri ?? '').filter(Boolean);
  const visible = files.slice(0, 4);

  if (!canEdit && files.length === 0) return null;

  const goToPhotos = () =>
    router.push(
      `/(app)/transactions/photos?txId=${txId}&fileType=${fileType}${!canEdit ? '&readOnly=true' : ''}` as never,
    );

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleDelete = (index: number) => {
    const file = files[index];
    if (!file) return;
    setViewerVisible(false);
    deleteFile(file.id);
  };

  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.photoRow}>
        {visible.map((f, index) => (
          <Pressable
            key={f.id}
            style={styles.photoThumb}
            onPress={() => f.localUri ? openViewer(index) : undefined}
          >
            {f.localUri ? (
              <Image source={{ uri: f.localUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Feather name="image" size={20} color={Colors.textMuted} />
            )}
          </Pressable>
        ))}
        {canEdit && (
          <Pressable style={[styles.photoThumb, styles.photoAdd]} onPress={goToPhotos}>
            <Feather name="plus" size={20} color={Colors.textMuted} />
          </Pressable>
        )}
        {!canEdit && files.length > 4 && (
          <Pressable style={[styles.photoThumb, styles.photoAdd]} onPress={goToPhotos}>
            <Text style={styles.photoMoreText}>+{files.length - 4}</Text>
          </Pressable>
        )}
      </View>

      <PhotoViewer
        uris={uris}
        initialIndex={viewerIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        canDelete={canEdit}
        onDelete={handleDelete}
      />
    </>
  );
}

// ─── HeroCard ───────────────────────────────────────────────────────────────

function HeroCard({ status, amount, isSeller }: { status: TxStatus; amount: number; isSeller: boolean }) {
  const label = buildAmountLabel(status, isSeller);
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlow} pointerEvents="none" />
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroAmount}>{formatCLP(amount)}</Text>
      <View style={{ marginTop: Spacing.xs }}>
        <StatusBadge status={status} size="md" />
      </View>
    </View>
  );
}

function buildAmountLabel(status: TxStatus, isSeller: boolean): string {
  switch (status) {
    case 'PROPUESTA':   return 'Precio acordado';
    case 'CONFIRMADA':  return 'A pagar';
    case 'PAGADO':
    case 'EN_TRANSITO':
    case 'ENTREGADO':
    case 'EN_DISPUTA':  return isSeller ? 'Monto retenido' : 'Total pagado';
    case 'COMPLETADO':  return isSeller ? 'Liberado' : 'Total pagado';
    case 'CANCELADO':   return 'Cancelado';
    case 'REEMBOLSADO': return 'Reembolsado';
    case 'EXPIRADO':    return 'Sin cargo';
  }
}

// ─── DetailRow ──────────────────────────────────────────────────────────────

function DetailRow({
  label, value, mono, last,
}: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function feePayerLabel(fp: 'buyer' | 'seller' | 'split'): string {
  switch (fp) {
    case 'buyer':  return 'asume el comprador';
    case 'seller': return 'asume el vendedor';
    case 'split':  return 'dividido 50/50';
  }
}

function netSellerAmount(amount: number, fee: number, feePayer: 'buyer' | 'seller' | 'split'): number {
  if (feePayer === 'seller') return amount - fee;
  if (feePayer === 'split')  return amount - Math.ceil(fee / 2);
  return amount;
}

function isTerminal(status: TxStatus): boolean {
  return ['COMPLETADO', 'CANCELADO', 'REEMBOLSADO', 'EXPIRADO'].includes(status);
}

// ─── Tone helpers ────────────────────────────────────────────────────────────

function toneStyle(tone: NextAction['iconTone']): ViewStyle {
  switch (tone) {
    case 'primary': return { backgroundColor: Colors.primaryMuted };
    case 'warning': return { backgroundColor: Colors.warningMuted };
    case 'success': return { backgroundColor: Colors.successMuted };
    case 'danger':  return { backgroundColor: Colors.dangerMuted };
  }
}

function toneColor(tone: NextAction['iconTone']): string {
  switch (tone) {
    case 'primary': return '#3B82F6';
    case 'warning': return '#FCD34D';
    case 'success': return '#6EE7B7';
    case 'danger':  return '#FCA5A5';
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },

  hero: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -40, right: -40,
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    opacity: 0.5,
  },
  heroLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textMuted,
  },
  heroAmount: {
    ...Typography.displayLg,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.textPrimary,
    marginTop: 4,
  },

  nextCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  nextCardUrgent: {
    borderColor: 'rgba(245, 158, 11, 0.40)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 4,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  nextIcon: {
    width: 28, height: 28,
    borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  nextTitle: {
    ...Typography.h3,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  nextBody: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },

  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  detail: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    ...Typography.bodySm,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rowValue: {
    ...Typography.bodySm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12,
    fontWeight: '500',
  },

  archiveWrap: {
    marginTop: Spacing.lg,
  },

  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  photoThumb: {
    width: 60, height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  photoMoreText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
