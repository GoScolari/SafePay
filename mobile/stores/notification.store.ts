import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  transactionId: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  deviceToken: string | null;
  setNotifications: (notifications: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  setDeviceToken: (token: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount:   0,
  deviceToken:   null,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
    }),

  setDeviceToken: (deviceToken) => set({ deviceToken }),
}));
