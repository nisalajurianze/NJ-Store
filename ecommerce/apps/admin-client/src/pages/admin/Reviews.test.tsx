import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  errorToastMock: vi.fn(),
  useQueryMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  moderateReviewMock: vi.fn(),
  refetchMock: vi.fn(),
  successToastMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueriesMock
  })
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    reviews: vi.fn(),
    moderateReview: mocks.moderateReviewMock
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.successToastMock,
    error: mocks.errorToastMock
  }
}));

import { Reviews } from './Reviews';

describe('Admin Reviews page', () => {
  beforeEach(() => {
    mocks.errorToastMock.mockReset();
    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'review-1',
            title: 'Excellent phone',
            rating: 5,
            comment: 'Very happy with the battery life.',
            productName: 'Galaxy Pro',
            user: {
              id: 'user-1',
              name: 'Alicia'
            },
            order: 'order-1',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: false,
            helpfulVotes: 0,
            createdAt: new Date('2026-03-28T10:00:00.000Z').toISOString()
          }
        ]
      },
      refetch: mocks.refetchMock
    });
    mocks.invalidateQueriesMock.mockReset();
    mocks.invalidateQueriesMock.mockResolvedValue(undefined);
    mocks.moderateReviewMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.successToastMock.mockReset();
  });

  it('shows a read-only moderation state without product write permission', () => {
    mocks.hasPermissionsMock.mockReturnValue(false);

    render(<Reviews />);

    expect(screen.getByText('Read Only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only access/i)).toBeInTheDocument();
  });

  it('approves a review and refreshes the moderation queue', async () => {
    const user = userEvent.setup();

    mocks.moderateReviewMock.mockResolvedValue(undefined);

    render(<Reviews />);

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(mocks.moderateReviewMock).toHaveBeenCalledWith('review-1', true);
    await waitFor(() => {
      expect(mocks.successToastMock).toHaveBeenCalledWith('Review approved');
      expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the API error toast when review rejection fails', async () => {
    const user = userEvent.setup();

    mocks.moderateReviewMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Review moderation failed'
        }
      }
    });

    render(<Reviews />);

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(mocks.errorToastMock).toHaveBeenCalledWith('Review moderation failed');
    });
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });

  it('bulk-approves the selected reviews and refreshes the queue once', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'review-1',
            title: 'Excellent phone',
            rating: 5,
            comment: 'Very happy with the battery life.',
            productName: 'Galaxy Pro',
            user: {
              id: 'user-1',
              name: 'Alicia'
            },
            order: 'order-1',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: false,
            helpfulVotes: 0,
            createdAt: new Date('2026-03-28T10:00:00.000Z').toISOString()
          },
          {
            id: 'review-2',
            title: 'Great charger',
            rating: 4,
            comment: 'Compact and dependable.',
            productName: 'Travel Charger',
            user: {
              id: 'user-2',
              name: 'Nimal'
            },
            order: 'order-2',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: false,
            helpfulVotes: 1,
            createdAt: new Date('2026-03-28T11:00:00.000Z').toISOString()
          }
        ]
      },
      refetch: mocks.refetchMock
    });
    mocks.moderateReviewMock.mockResolvedValue(undefined);

    render(<Reviews />);

    await user.click(screen.getByRole('button', { name: 'Select visible (2)' }));
    await user.click(screen.getByRole('button', { name: 'Approve selected (2)' }));

    await waitFor(() => {
      expect(mocks.moderateReviewMock).toHaveBeenCalledWith('review-1', true);
      expect(mocks.moderateReviewMock).toHaveBeenCalledWith('review-2', true);
      expect(mocks.successToastMock).toHaveBeenCalledWith('2 reviews approved');
      expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
