import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import { AppNotification } from '@/stores/notification.store';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/lib/utils';

const TYPE_EMOJI: Record<string, string> = {
  TX_PROPOSED:      '📋',
  TX_ACCEPTED:      '✅',
  TX_PAID:          '💰',
  TX_SHIPPED:       '📦',
  TX_DELIVERED:     '🏠',
  TX_COMPLETED:     '🎉',
  TX_CANCELLED:     '✖️',
  TX_DISPUTED:      '⚠️',
  TX_SHIPPING_ALERT:'🚨',
};

export default function NotificationsScreen() {
  const { notifications, isLoading, refetch, markRead } = useNotifications();
  const notificationList = notifications as AppNotification[];

  const handlePress = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id);
    if (n.transactionId) {
      router.push(`/(app)/transactions/${n.transactionId}` as never);
    }
  };

  const renderItem = ({ item: n }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !n.isRead && styles.itemUnread]}
      onPress={() => handlePress(n)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{TYPE_EMOJI[n.type] ?? '🔔'}</Text>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, !n.isRead && styles.itemTitleUnread]}>{n.title}</Text>
        <Text style={styles.itemMsg} numberOfLines={2}>{n.body}</Text>
        <Text style={styles.itemDate}>{formatDate(n.createdAt)}</Text>
      </View>
      {!n.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={notificationList}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={notificationList.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptySub}>Acá aparecerán las alertas de tus transacciones.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  title:          { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item:           { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12, backgroundColor: Colors.surface },
  itemUnread:     { backgroundColor: Colors.primary + '08' },
  emoji:          { fontSize: 24, marginTop: 2 },
  itemBody:       { flex: 1, gap: 2 },
  itemTitle:      { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  itemTitleUnread:{ fontWeight: '700' },
  itemMsg:        { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  itemDate:       { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  unreadDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  separator:      { height: 1, backgroundColor: Colors.border },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 80 },
  emptyEmoji:     { fontSize: 48 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub:       { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
