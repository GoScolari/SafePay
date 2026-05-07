import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface MpStatus {
  connected: boolean;
  mpUserId?: string;
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { logout, loading: loggingOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: mpStatus, isLoading: mpLoading } = useQuery<MpStatus>({
    queryKey: ['mp-status'],
    queryFn: () => api.get<MpStatus>('/users/mp/status').then((r) => r.data),
  });

  const { mutate: disconnectMp, isPending: disconnecting } = useMutation({
    mutationFn: () => api.delete('/users/mp/disconnect'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mp-status'] }),
    onError: () => Alert.alert('Error', 'No se pudo desconectar Mercado Pago.'),
  });

  const { mutate: connectMp, isPending: connecting } = useMutation({
    mutationFn: () => api.get<{ redirectUrl: string }>('/users/mp/connect').then((r) => r.data),
    onSuccess: (data) => {
      if (data.redirectUrl) Linking.openURL(data.redirectUrl);
    },
    onError: () => Alert.alert('Error', 'No se pudo iniciar la conexión con Mercado Pago.'),
  });

  const confirmDisconnect = () => {
    Alert.alert(
      'Desconectar Mercado Pago',
      '¿Seguro? No podrás recibir pagos hasta que lo vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desconectar', style: 'destructive', onPress: () => disconnectMp() },
      ],
    );
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>

        {/* Mercado Pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mercado Pago</Text>
          {mpLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.mpRow}>
              <View style={styles.mpStatus}>
                <View style={[styles.mpDot, { backgroundColor: mpStatus?.connected ? '#16A34A' : Colors.textMuted }]} />
                <Text style={styles.mpStatusText}>
                  {mpStatus?.connected ? 'Conectado' : 'No conectado'}
                </Text>
              </View>
              {mpStatus?.connected ? (
                <TouchableOpacity
                  style={styles.mpBtnOutline}
                  onPress={confirmDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting
                    ? <ActivityIndicator color={Colors.danger} size="small" />
                    : <Text style={styles.mpBtnOutlineText}>Desconectar</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.mpBtn}
                  onPress={() => connectMp()}
                  disabled={connecting}
                >
                  {connecting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.mpBtnText}>Conectar</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}
          {!mpLoading && !mpStatus?.connected && (
            <Text style={styles.mpHint}>
              Conectá tu cuenta de Mercado Pago para poder recibir pagos como vendedor.
            </Text>
          )}
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          disabled={loggingOut}
        >
          {loggingOut
            ? <ActivityIndicator color={Colors.danger} size="small" />
            : <Text style={styles.logoutText}>Cerrar sesión</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  title:         { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  content:       { padding: 16, gap: 4, paddingBottom: 32 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:    { fontSize: 28, fontWeight: '700', color: '#fff' },
  name:          { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  phone:         { fontSize: 14, color: Colors.textSecondary },
  section:       { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 12 },
  mpRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mpStatus:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mpDot:         { width: 10, height: 10, borderRadius: 5 },
  mpStatusText:  { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  mpBtn:         { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  mpBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  mpBtnOutline:  { borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  mpBtnOutlineText: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
  mpHint:        { fontSize: 12, color: Colors.textMuted, marginTop: 10, lineHeight: 17 },
  logoutBtn:     { borderWidth: 1.5, borderColor: Colors.danger, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  logoutText:    { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
