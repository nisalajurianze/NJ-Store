import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { resolveSocketOrigin } from '../utils/apiConfig';
import { authService } from '../services/authService';
import { toast } from '../utils/lazyToast';

let socketInstance: Socket | null = null;
let activeHookCount = 0;
let joinedUserId: string | null = null;
const SOCKET_STARTUP_FALLBACK_DELAY_MS = 800;

const isMobileRuntime = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  (window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches);

const showOrderUpdatedToast = (payload: { orderNumber: string; status: string }): void => {
  toast.success(`Order ${payload.orderNumber} is now ${payload.status}!`, {
    duration: 6000,
    position: 'top-right',
    style: {
      background: 'linear-gradient(to right, #111827, #1f2937)',
      color: '#D4AF37',
      border: '1px solid rgba(212, 175, 55, 0.3)'
    },
    iconTheme: { primary: '#D4AF37', secondary: '#111827' }
  });
};

const disconnectSocket = (): void => {
  if (!socketInstance) {
    joinedUserId = null;
    return;
  }

  socketInstance.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
  joinedUserId = null;
};

export const useSocket = () => {
  const { accessToken, user, loading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isReadyToConnect, setIsReadyToConnect] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    activeHookCount += 1;

    return () => {
      activeHookCount = Math.max(0, activeHookCount - 1);
      if (activeHookCount === 0) {
        disconnectSocket();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReadyToConnect(true);
      return undefined;
    }

    let isCancelled = false;
    let startupTimer: number | null = null;
    let idleCallbackId: number | null = null;

    const markReady = (): void => {
      if (!isCancelled) {
        setIsReadyToConnect(true);
      }
    };

    const scheduleReady = (): void => {
      const mobileRuntime = isMobileRuntime();

      if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(markReady, { timeout: mobileRuntime ? 7_000 : 2_000 });
        return;
      }

      startupTimer = window.setTimeout(markReady, mobileRuntime ? 5_000 : SOCKET_STARTUP_FALLBACK_DELAY_MS);
    };

    if (document.readyState === 'complete') {
      scheduleReady();
    } else {
      window.addEventListener('load', scheduleReady, { once: true });
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('load', scheduleReady);

      if (startupTimer !== null) {
        window.clearTimeout(startupTimer);
      }

      if (idleCallbackId !== null && 'cancelIdleCallback' in window && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, []);

  useEffect(() => {
    if (loading || !isReadyToConnect) {
      return;
    }

    let isEffectActive = true;

    const connectSocket = async (): Promise<void> => {
      if (!socketInstance) {
        const { io } = await import('socket.io-client');

        if (!isEffectActive) {
          return;
        }

        socketInstance = io(resolveSocketOrigin(import.meta.env.VITE_API_URL), {
          transports: ['websocket'],
          withCredentials: true
        });
      }

      const socket = socketInstance;
      if (!socket) {
        return;
      }

      const joinUserRoom = async (): Promise<void> => {
        if (!accessToken || !user) {
          joinedUserId = null;
          return;
        }

        if (joinedUserId === user.id) {
          return;
        }

        try {
          const { ticket } = await authService.issueSocketTicket();
          if (!isEffectActive || !socket.connected) {
            return;
          }

          socket.emit('join_user', ticket);
          joinedUserId = user.id;
        } catch {
          joinedUserId = null;
        }
      };

      const handleConnect = (): void => {
        setIsConnected(true);
        socket.emit('join_storefront');
        void joinUserRoom();
      };

      const handleDisconnect = (): void => {
        setIsConnected(false);
        joinedUserId = null;
      };

      const handleOrderUpdated = (payload: { id: string; orderNumber: string; status: string }): void => {
        showOrderUpdatedToast(payload);

        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['order', payload.id] });
      };

      const handleProductStockUpdated = (payload: { id: string; slug: string }): void => {
        void queryClient.invalidateQueries({ queryKey: ['product-detail', payload.slug] });
        void queryClient.invalidateQueries({ queryKey: ['shop'] });
        void queryClient.invalidateQueries({ queryKey: ['home-banner'] });
        void queryClient.invalidateQueries({ queryKey: ['home-featured'] });
        void queryClient.invalidateQueries({ queryKey: ['home-latest'] });
        void queryClient.invalidateQueries({ queryKey: ['home-flash-deals'] });
        void queryClient.invalidateQueries({ queryKey: ['home-feed'] });
        void queryClient.invalidateQueries({ queryKey: ['home-recently-viewed'] });
      };

      const handleNotificationCreated = (payload: { title: string; body: string }): void => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast.success(`${payload.title}\n${payload.body}`, {
          duration: 6000,
          position: 'top-right'
        });
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('order_updated', handleOrderUpdated);
      socket.on('product_stock_updated', handleProductStockUpdated);
      socket.on('notification_created', handleNotificationCreated);

      if (socket.connected) {
        setIsConnected(true);
        socket.emit('join_storefront');
        void joinUserRoom();
      } else {
        socket.connect();
      }

      cleanupSocketListeners = () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('order_updated', handleOrderUpdated);
        socket.off('product_stock_updated', handleProductStockUpdated);
        socket.off('notification_created', handleNotificationCreated);
      };
    };

    let cleanupSocketListeners: (() => void) | null = null;

    void connectSocket();

    return () => {
      isEffectActive = false;
      cleanupSocketListeners?.();
    };
  }, [accessToken, user, loading, isReadyToConnect, queryClient]);

  return { isConnected, socket: socketInstance };
};
