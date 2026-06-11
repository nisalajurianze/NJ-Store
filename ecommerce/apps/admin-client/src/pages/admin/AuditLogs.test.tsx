import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exportAuditLogsCsvMock: vi.fn(),
  refetchMock: vi.fn(),
  useQueryMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    auditLogs: vi.fn(),
    exportAuditLogsCsv: mocks.exportAuditLogsCsvMock
  }
}));

import { AuditLogs } from './AuditLogs';

const createAuditLog = (overrides: Record<string, unknown> = {}) => ({
  id: 'audit-1',
  createdAt: '2026-03-31T10:15:00.000Z',
  actorEmail: 'admin@njstore.com',
  actorRole: 'admin',
  action: 'auth.login',
  targetLabel: 'Admin account',
  targetType: 'user',
  targetId: 'user-1',
  status: 'success',
  message: 'Admin signed in successfully.',
  metadata: {
    source: 'web',
    rememberMe: false
  },
  ipAddress: '127.0.0.1',
  ...overrides
});

const renderAuditLogs = (): void => {
  render(<AuditLogs />);
};

describe('Admin Audit Logs page', () => {
  beforeEach(() => {
    mocks.exportAuditLogsCsvMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.useQueryMock.mockReset();
    mocks.exportAuditLogsCsvMock.mockResolvedValue(undefined);
    mocks.refetchMock.mockResolvedValue(undefined);
  });

  it('renders audit log rows and refreshes the timeline on demand', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockReturnValue({
      isFetching: false,
      refetch: mocks.refetchMock,
      data: {
        data: [
          createAuditLog(),
          createAuditLog({
            id: 'audit-2',
            action: 'order.cancel',
            targetLabel: 'Order ORD-1001',
            targetType: 'order',
            targetId: 'order-1',
            status: 'blocked',
            message: 'Order cancellation blocked pending payment review.'
          })
        ],
        pagination: {
          total: 2
        }
      }
    });

    renderAuditLogs();

    expect(screen.getByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(screen.getByText('auth / login')).toBeInTheDocument();
    expect(screen.getByText('order / cancel')).toBeInTheDocument();
    expect(screen.getByText('Admin signed in successfully.')).toBeInTheDocument();
    expect(screen.getByText('Order cancellation blocked pending payment review.')).toBeInTheDocument();
    expect(screen.getByText('No suspicious bursts or repeated denied actions were detected in the current query window.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-queries audit logs when status and actor filters change', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const [, , search, status, actorRole] = queryKey;

      if (status === 'blocked' && actorRole === 'customer') {
        return {
          isFetching: false,
          refetch: mocks.refetchMock,
          data: {
            data: [
              createAuditLog({
                id: 'audit-filtered',
                actorEmail: 'buyer@example.com',
                actorRole: 'customer',
                action: 'order.cancel',
                status: 'blocked',
                message: `Filtered result for ${String(search ?? '') || 'all logs'}.`
              })
            ],
            pagination: {
              total: 1
            }
          }
        };
      }

      return {
        isFetching: false,
        refetch: mocks.refetchMock,
        data: {
          data: [createAuditLog()],
          pagination: {
            total: 1
          }
        }
      };
    });

    renderAuditLogs();

    await user.selectOptions(screen.getByLabelText('Status'), 'blocked');
    await user.selectOptions(screen.getByLabelText('Actor role'), 'customer');

    expect(await screen.findByText('buyer@example.com')).toBeInTheDocument();
    expect(screen.getByText('Filtered result for all logs.')).toBeInTheDocument();
    expect(mocks.useQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ['admin', 'audit-logs', '', 'blocked', 'customer']
      })
    );
  });

  it('surfaces anomaly alerts when a burst of audit activity is detected', () => {
    mocks.useQueryMock.mockReturnValue({
      isFetching: false,
      refetch: mocks.refetchMock,
      data: {
        data: [
          createAuditLog({ id: 'audit-burst-1', action: 'auth.login', createdAt: '2026-03-31T10:15:00.000Z' }),
          createAuditLog({ id: 'audit-burst-2', action: 'auth.login', createdAt: '2026-03-31T10:16:00.000Z' }),
          createAuditLog({ id: 'audit-burst-3', action: 'auth.login', createdAt: '2026-03-31T10:17:00.000Z' }),
          createAuditLog({ id: 'audit-burst-4', action: 'auth.login', createdAt: '2026-03-31T10:18:00.000Z' }),
          createAuditLog({ id: 'audit-burst-5', action: 'auth.login', createdAt: '2026-03-31T10:19:00.000Z' })
        ],
        pagination: {
          total: 5
        }
      }
    });

    renderAuditLogs();

    expect(screen.getByText('Anomaly watch')).toBeInTheDocument();
    expect(screen.getByText('1 alert active in the current query window.')).toBeInTheDocument();
    expect(screen.getByText('Burst activity')).toBeInTheDocument();
    expect(screen.getByText('5 actions from admin@njstore.com in 5 minutes')).toBeInTheDocument();
  });

  it('exports audit logs with the active filters', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockReturnValue({
      isFetching: false,
      refetch: mocks.refetchMock,
      data: {
        data: [createAuditLog()],
        pagination: {
          total: 1
        }
      }
    });

    renderAuditLogs();

    await user.type(screen.getByLabelText('Search audit logs'), 'admin');

    await waitFor(() => {
      expect(mocks.useQueryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: ['admin', 'audit-logs', 'admin', 'all', 'all']
        })
      );
    });

    await user.selectOptions(screen.getByLabelText('Status'), 'blocked');
    await user.selectOptions(screen.getByLabelText('Actor role'), 'customer');

    await waitFor(() => {
      expect(mocks.useQueryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: ['admin', 'audit-logs', 'admin', 'blocked', 'customer']
        })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(mocks.exportAuditLogsCsvMock).toHaveBeenCalledWith({
      search: 'admin',
      status: 'blocked',
      actorRole: 'customer'
    });
  });
});
