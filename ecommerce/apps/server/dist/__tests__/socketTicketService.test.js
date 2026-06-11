import { describe, expect, it } from 'vitest';
import { socketTicketService } from '../services/socketTicketService.js';
describe('socketTicketService', () => {
    it('issues short-lived tickets that can be consumed once for a user room', () => {
        const { ticket, expiresIn } = socketTicketService.issue({
            id: 'user-1',
            role: 'customer',
            sessionId: 'session-1'
        });
        const consumed = socketTicketService.consume(ticket, 'user');
        expect(expiresIn).toBe(30);
        expect(consumed).toMatchObject({
            id: 'user-1',
            role: 'customer',
            sessionId: 'session-1',
            scopes: ['user']
        });
        expect(() => socketTicketService.consume(ticket, 'user')).toThrow('Invalid socket ticket');
    });
    it('allows admin-capable tickets to join admin rooms', () => {
        const { ticket } = socketTicketService.issue({
            id: 'admin-1',
            role: 'staff',
            sessionId: 'session-2'
        });
        expect(socketTicketService.consume(ticket, 'admin')).toMatchObject({
            id: 'admin-1',
            scopes: ['user', 'admin']
        });
    });
    it('rejects customer tickets for admin rooms', () => {
        const { ticket } = socketTicketService.issue({
            id: 'user-2',
            role: 'customer',
            sessionId: 'session-3'
        });
        expect(() => socketTicketService.consume(ticket, 'admin')).toThrow('Socket ticket is not allowed for this room');
        expect(() => socketTicketService.consume(ticket, 'user')).toThrow('Invalid socket ticket');
    });
});
