import type { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { isAllowedOrigin } from '../utils/origin.js';
import { socketTicketService } from './socketTicketService.js';

let io: Server | undefined;
const allowedOrigins = new Set([env.CLIENT_URL, env.ADMIN_URL]);
const MAX_JOIN_ADMIN_ATTEMPTS_PER_SOCKET = 5;
const MAX_JOIN_USER_ATTEMPTS_PER_SOCKET = 5;

type AdminSocketEvents = {
  new_order: {
    id: string;
    orderNumber: string;
    total: number;
    type: string;
  };
  product_question_created: {
    id: string;
    productId: string;
    productName: string;
    customerName: string;
    question: string;
    createdAt: string;
  };
  review_created: {
    id: string;
    productId: string;
    productName: string;
    customerName: string;
    rating: number;
    title: string;
    createdAt: string;
  };
};

type UserSocketEvents = {
  order_updated: {
    id: string;
    orderNumber: string;
    status: string;
  };
  notification_created: {
    type: string;
    title: string;
    body: string;
    link?: string;
  };
};

type StorefrontSocketEvents = {
  product_stock_updated: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    inStock: boolean;
    productType: 'standard' | 'bundle';
    variants: Array<{
      sku: string;
      color?: string;
      storage?: string;
      model?: string;
      stock: number;
    }>;
  };
};

export const socketService = {
  init: (httpServer: HttpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin, allowedOrigins, env.NODE_ENV)) {
            callback(null, true);
            return;
          }

          callback(new Error('Origin not allowed'), false);
        },
        credentials: true
      }
    });

    io.on('connection', (socket: Socket) => {
      logger.info(`WebSocket Client connected: ${socket.id}`);
      let joinAdminAttempts = 0;
      let joinUserAttempts = 0;
      let joinStorefrontAttempts = 0;

      // Clients can explicitly request to join an admin room
      socket.on('join_admin', async (ticket: string) => {
        joinAdminAttempts += 1;
        if (joinAdminAttempts > MAX_JOIN_ADMIN_ATTEMPTS_PER_SOCKET) {
          logger.warn(`Socket ${socket.id} exceeded join_admin rate limit and was disconnected.`);
          socket.disconnect(true);
          return;
        }

        try {
          const decoded = socketTicketService.consume(ticket, 'admin');
          const user = await User.findById(decoded.id).select('role isActive');

          if (!user || !user.isActive) return;
          if (user.role === 'admin' || user.role === 'staff') {
            void socket.join('admin');
            logger.info(`Socket ${socket.id} joined admin room.`);
          }
        } catch (error) {
          logger.warn(`Auth failed for join_admin on socket ${socket.id}`);
        }
      });

      // Clients can request to join their personal room
      socket.on('join_user', async (ticket: string) => {
        joinUserAttempts += 1;
        if (joinUserAttempts > MAX_JOIN_USER_ATTEMPTS_PER_SOCKET) {
          logger.warn(`Socket ${socket.id} exceeded join_user rate limit and was disconnected.`);
          socket.disconnect(true);
          return;
        }

        try {
          const decoded = socketTicketService.consume(ticket, 'user');
          const user = await User.findById(decoded.id).select('isActive');

          if (!user || !user.isActive) return;
          void socket.join(`user_${user._id.toString()}`);
          logger.debug(`Socket ${socket.id} joined a user room.`);
        } catch (error) {
          logger.warn(`Auth failed for join_user on socket ${socket.id}`);
        }
      });

      socket.on('join_storefront', () => {
        joinStorefrontAttempts += 1;
        if (joinStorefrontAttempts > 5) {
          logger.warn(`Socket ${socket.id} exceeded join_storefront rate limit and was disconnected.`);
          socket.disconnect(true);
          return;
        }

        void socket.join('storefront');
        logger.debug(`Socket ${socket.id} joined storefront room.`);
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket Client disconnected: ${socket.id}`);
      });
    });
  },

  emitToAdmin: <EventName extends keyof AdminSocketEvents>(event: EventName, payload: AdminSocketEvents[EventName]) => {
    if (!io) return;
    io.to('admin').emit(event, payload);
  },

  emitToUser: <EventName extends keyof UserSocketEvents>(
    userId: string,
    event: EventName,
    payload: UserSocketEvents[EventName]
  ) => {
    if (!io) return;
    io.to(`user_${userId}`).emit(event, payload);
  },

  emitToStorefront: <EventName extends keyof StorefrontSocketEvents>(
    event: EventName,
    payload: StorefrontSocketEvents[EventName]
  ) => {
    if (!io) return;
    io.to('storefront').emit(event, payload);
  }
};
