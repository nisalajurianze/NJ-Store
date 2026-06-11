import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@njstore/utils';
import { resolveSocketOrigin } from '../utils/apiConfig';
import { authService } from '../services/authService';

let socketInstance: Socket | null = null;
let activeHookCount = 0;
let joinedAdminUserId: string | null = null;

const adminToastOptions = {
  duration: 6000,
  position: 'top-right' as const,
  style: {
    background: 'linear-gradient(to right, #111827, #1f2937)',
    color: '#D4AF37',
    border: '1px solid rgba(212, 175, 55, 0.3)'
  },
  iconTheme: {
    primary: '#D4AF37',
    secondary: '#111827'
  }
};

const disconnectSocket = (): void => {
  if (!socketInstance) {
    joinedAdminUserId = null;
    return;
  }

  socketInstance.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
  joinedAdminUserId = null;
};

export const useSocket = () => {
  const { accessToken, user, loading } = useAdminAuth();
  const [isConnected, setIsConnected] = useState(false);
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
    if (loading) {
      return;
    }

    if (!accessToken || !user) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    if (!socketInstance) {
      socketInstance = io(resolveSocketOrigin(import.meta.env.VITE_API_URL), {
        transports: ['websocket'],
        withCredentials: true
      });
    }

    const socket = socketInstance;
    let isEffectActive = true;

    const joinAdminRoom = async (): Promise<void> => {
      if (joinedAdminUserId === user.id) {
        return;
      }

      try {
        const { ticket } = await authService.issueSocketTicket();
        if (!isEffectActive || !socket.connected) {
          return;
        }

        socket.emit('join_admin', ticket);
        joinedAdminUserId = user.id;
      } catch {
        joinedAdminUserId = null;
      }
    };

    const handleConnect = (): void => {
      setIsConnected(true);
      void joinAdminRoom();
    };

    const handleDisconnect = (): void => {
      setIsConnected(false);
      joinedAdminUserId = null;
    };

    const handleNewOrder = (payload: { id: string; orderNumber: string; total: number; type: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] });
      toast.success(`New ${payload.type} order received!\n${payload.orderNumber} - ${formatCurrency(payload.total)}`, adminToastOptions);
    };

    const handleNewProductQuestion = (payload: { productName: string; customerName: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product-questions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] });
      toast.success(`New product question from ${payload.customerName} on ${payload.productName}`, {
        ...adminToastOptions,
        duration: 5000
      });
    };

    const handleNewReview = (payload: { productName: string; customerName: string; rating: number }): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] });
      toast.success(`New ${payload.rating}/5 review from ${payload.customerName} on ${payload.productName}`, {
        ...adminToastOptions,
        duration: 5000
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_order', handleNewOrder);
    socket.on('product_question_created', handleNewProductQuestion);
    socket.on('review_created', handleNewReview);

    if (socket.connected) {
      setIsConnected(true);
      void joinAdminRoom();
    } else {
      socket.connect();
    }

    return () => {
      isEffectActive = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_order', handleNewOrder);
      socket.off('product_question_created', handleNewProductQuestion);
      socket.off('review_created', handleNewReview);
    };
  }, [accessToken, user, loading, queryClient]);

  return { isConnected, socket: socketInstance };
};
