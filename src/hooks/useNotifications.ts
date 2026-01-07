'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return 'denied' as NotificationPermission;
    }
  }, [isSupported]);

  const sendNotification = useCallback(async ({
    title,
    body,
    icon = '/favicon.ico',
    tag,
    requireInteraction = false,
    onClick,
  }: NotificationOptions) => {
    if (!isSupported) return null;
    
    // Request permission if not granted
    let currentPermission = permission;
    if (permission === 'default') {
      currentPermission = await requestPermission();
    }
    
    if (currentPermission !== 'granted') return null;
    
    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag,
        requireInteraction,
      });
      
      if (onClick) {
        notification.onclick = () => {
          onClick();
          notification.close();
        };
      }
      
      return notification;
    } catch {
      return null;
    }
  }, [isSupported, permission, requestPermission]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
}

// Utilitaire pour planifier une notification
export function scheduleNotification(
  sendFn: (opts: NotificationOptions) => Promise<Notification | null>,
  eventDate: Date,
  minutesBefore: number,
  options: NotificationOptions
) {
  const notificationTime = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  
  if (notificationTime <= now) return null;
  
  const delay = notificationTime.getTime() - now.getTime();
  
  const timeoutId = setTimeout(() => {
    sendFn(options);
  }, delay);
  
  return timeoutId;
}
