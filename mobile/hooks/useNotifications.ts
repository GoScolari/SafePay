import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNotificationStore, AppNotification } from '@/stores/notification.store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const queryClient = useQueryClient();
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const markLocalRead    = useNotificationStore((s) => s.markAsRead);
  const setDeviceToken   = useNotificationStore((s) => s.setDeviceToken);

  const { data, isLoading, refetch } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await api.get<AppNotification[]>('/notifications/my');
      setNotifications(r.data);
      return r.data;
    },
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onMutate: (id: string) => markLocalRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    if (Platform.OS === 'web') return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const deviceToken = tokenData.data;
      setDeviceToken(deviceToken);
      await api.post('/notifications/register-device', { deviceToken });
    } catch {
      // En simulador o sin projectId de EAS puede fallar; no es bloqueante
    }
  };

  return { notifications: data ?? [], isLoading, refetch, markRead };
}
