import type { Role } from '@njstore/types';
import { AppError } from '../utils/AppError.js';
import { createRandomToken, hashValue } from '../utils/crypto.js';

export type SocketTicketScope = 'user' | 'admin';

export interface SocketTicketPrincipal {
  id: string;
  role: Role;
  sessionId: string;
}

export interface ConsumedSocketTicket extends SocketTicketPrincipal {
  scopes: SocketTicketScope[];
}

interface StoredSocketTicket extends ConsumedSocketTicket {
  expiresAt: number;
}

const SOCKET_TICKET_TTL_MS = 30_000;
const MAX_STORED_SOCKET_TICKETS = 5_000;

const tickets = new Map<string, StoredSocketTicket>();

const resolveScopes = (role: Role): SocketTicketScope[] =>
  role === 'admin' || role === 'staff' ? ['user', 'admin'] : ['user'];

const cleanupExpiredTickets = (): void => {
  const now = Date.now();

  for (const [ticketHash, ticket] of tickets) {
    if (ticket.expiresAt <= now) {
      tickets.delete(ticketHash);
    }
  }

  if (tickets.size <= MAX_STORED_SOCKET_TICKETS) {
    return;
  }

  for (const ticketHash of tickets.keys()) {
    tickets.delete(ticketHash);
    if (tickets.size <= MAX_STORED_SOCKET_TICKETS) {
      break;
    }
  }
};

export const socketTicketService = {
  issue: (principal: SocketTicketPrincipal): { ticket: string; expiresIn: number } => {
    cleanupExpiredTickets();

    const ticket = createRandomToken();
    tickets.set(hashValue(ticket), {
      ...principal,
      scopes: resolveScopes(principal.role),
      expiresAt: Date.now() + SOCKET_TICKET_TTL_MS
    });

    return {
      ticket,
      expiresIn: SOCKET_TICKET_TTL_MS / 1000
    };
  },

  consume: (ticket: string, scope: SocketTicketScope): ConsumedSocketTicket => {
    cleanupExpiredTickets();

    const ticketHash = hashValue(ticket);
    const storedTicket = tickets.get(ticketHash);
    tickets.delete(ticketHash);

    if (!storedTicket || storedTicket.expiresAt <= Date.now()) {
      throw new AppError('Invalid socket ticket', 401);
    }

    if (!storedTicket.scopes.includes(scope)) {
      throw new AppError('Socket ticket is not allowed for this room', 403);
    }

    return storedTicket;
  }
};
