import { useDeferredValue, useMemo, useState } from 'react';
import type { ReviewDto } from '@njstore/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Textarea } from '@njstore/ui';
import toast from 'react-hot-toast';
import { MessageSquareReply } from 'lucide-react';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';

type ReviewRecord = ReviewDto;

interface ListQueryResult<T> {
  data: T[];
}

const reviewsGridClass =
  'grid min-w-[1048px] grid-cols-[40px_minmax(0,0.92fr)_minmax(0,0.38fr)_minmax(0,1.34fr)_minmax(196px,0.72fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[40px_minmax(0,0.9fr)_minmax(0,0.36fr)_minmax(0,1.3fr)_minmax(196px,0.72fr)] lg:gap-3';

export const Reviews = (): JSX.Element => {
  const queryClient = useQueryClient();
  const { hasPermissions } = useAdminPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const canModerateReviews = hasPermissions('product:write');
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  /* Per-review reply draft map: reviewId -> draft string */
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  /* Which reviews have the reply form open */
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  /* Which replies are currently submitting */
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});
  const reviews = useQuery<ListQueryResult<ReviewRecord>>({
    queryKey: ['admin', 'reviews'],
    queryFn: adminService.reviews,
    staleTime: 10_000,
    refetchInterval: () => (typeof document === 'undefined' || document.visibilityState === 'visible' ? 30_000 : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true
  });
  const reviewItems = reviews.data?.data ?? [];
  const filteredReviews = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    if (!query) {
      return reviewItems;
    }

    return reviewItems.filter((review) =>
      [
        review.title,
        review.comment,
        review.productName ?? '',
        review.user?.name ?? '',
        review.adminReply ?? '',
        String(review.rating),
        review.rating === 5 ? 'five star' : ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [deferredSearchTerm, reviewItems]);
  const fiveStarCount = reviewItems.filter((review) => review.rating === 5).length;
  const lowRatingCount = reviewItems.filter((review) => review.rating <= 2).length;
  const verifiedBuyerCount = reviewItems.filter((review) => review.isVerifiedBuyer).length;
  const selectedReviews = useMemo(
    () => reviewItems.filter((review) => selectedReviewIds.has(review.id)),
    [reviewItems, selectedReviewIds]
  );
  const selectedReviewCount = selectedReviews.length;
  const allVisibleSelected = filteredReviews.length > 0 && filteredReviews.every((review) => selectedReviewIds.has(review.id));

  const moderateReview = async (reviewId: string, isApproved: boolean): Promise<void> => {
    try {
      await adminService.moderateReview(reviewId, isApproved);
      toast.success(isApproved ? 'Review approved' : 'Review rejected');
      await Promise.all([
        reviews.refetch(),
        queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] })
      ]);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isApproved ? 'Unable to approve this review right now.' : 'Unable to reject this review right now.')
      );
    }
  };

  const submitReply = async (reviewId: string): Promise<void> => {
    const reply = replyDrafts[reviewId]?.trim();
    if (!reply) {
      toast.error('Type a reply before submitting');
      return;
    }
    setReplySubmitting((current) => ({ ...current, [reviewId]: true }));
    try {
      await adminService.replyToReview(reviewId, reply);
      toast.success('Reply saved');
      setReplyOpen((current) => ({ ...current, [reviewId]: false }));
      setReplyDrafts((current) => ({ ...current, [reviewId]: '' }));
      await Promise.all([
        reviews.refetch(),
        queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] })
      ]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the reply right now.'));
    } finally {
      setReplySubmitting((current) => ({ ...current, [reviewId]: false }));
    }
  };

  const handleApproveSelected = async (): Promise<void> => {
    if (selectedReviews.length === 0) {
      return;
    }

    const reviewsToApprove = [...selectedReviews];
    setIsBulkApproving(true);
    try {
      const results = await Promise.allSettled(reviewsToApprove.map((review) => adminService.moderateReview(review.id, true)));
      const failedReviewIds = reviewsToApprove
        .filter((_, index) => results[index]?.status === 'rejected')
        .map((review) => review.id);
      const successCount = results.length - failedReviewIds.length;

      if (successCount > 0) {
        toast.success(`${successCount} review${successCount === 1 ? '' : 's'} approved${failedReviewIds.length ? ` (${failedReviewIds.length} failed)` : ''}`);
      }

      if (failedReviewIds.length > 0) {
        const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (successCount === 0) {
          toast.error(getApiErrorMessage(firstFailure?.reason, 'Unable to approve these reviews right now.'));
        }
        setSelectedReviewIds(new Set(failedReviewIds));
      } else {
        setSelectedReviewIds(new Set());
      }

      if (successCount > 0) {
        await Promise.all([
          reviews.refetch(),
          queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] })
        ]);
      }
    } finally {
      setIsBulkApproving(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Operations"
        title="Reviews Moderation"
        description="Approve or reject customer reviews before they affect public product ratings."
        action={
          !canModerateReviews ? (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          ) : undefined
        }
        meta={[
          {
            label: 'Queue loaded',
            value: reviewItems.length.toLocaleString(),
            support: 'Reviews currently returned by the moderation queue.',
            tone: 'blue'
          },
          {
            label: 'Moderation mode',
            value: canModerateReviews ? 'Approve + reject' : 'Read only',
            support: canModerateReviews ? 'This account can take moderation actions.' : 'This account can review content but cannot change it.',
            tone: canModerateReviews ? 'gold' : 'slate'
          }
        ]}
      />

      <AdminStatGrid
        className="xl:grid-cols-4"
        items={[
          {
            label: 'Review queue',
            value: reviewItems.length.toLocaleString(),
            support: 'All reviews currently waiting in this admin view.',
            tone: 'slate'
          },
          {
            label: 'Five star',
            value: fiveStarCount.toLocaleString(),
            support: 'High-rating reviews in the current moderation set.',
            tone: 'gold'
          },
          {
            label: 'Low rating',
            value: lowRatingCount.toLocaleString(),
            support: lowRatingCount > 0 ? 'Lower ratings that may need closer moderation attention.' : 'No low-rating reviews in the current queue.',
            tone: lowRatingCount > 0 ? 'rose' : 'emerald'
          },
          {
            label: 'Verified buyers',
            value: verifiedBuyerCount.toLocaleString(),
            support: verifiedBuyerCount > 0 ? 'Reviews tied to delivered orders and ready for buyer-verification badging.' : 'No verified-buyer badges are available in this queue yet.',
            tone: verifiedBuyerCount > 0 ? 'blue' : 'slate'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search reviews by title, comment, product, reviewer, or rating"
            label="Search reviews"
            resultCount={filteredReviews.length}
            totalCount={reviewItems.length}
          />
        </div>
        {canModerateReviews ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3">
            <div>
              <p className="font-medium text-white">{selectedReviewCount ? `${selectedReviewCount} selected` : 'Bulk approval ready'}</p>
              <p className="text-xs text-gray-500">Select visible reviews, approve them together, and keep any failures selected for a quick retry.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedReviewIds((current) => {
                    const next = new Set(current);
                    if (allVisibleSelected) {
                      filteredReviews.forEach((review) => next.delete(review.id));
                    } else {
                      filteredReviews.forEach((review) => next.add(review.id));
                    }
                    return next;
                  });
                }}
                disabled={!filteredReviews.length}
              >
                {allVisibleSelected ? 'Clear visible' : `Select visible (${filteredReviews.length})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedReviewIds(new Set())} disabled={!selectedReviewCount}>
                Clear selection
              </Button>
              <Button
                size="sm"
                isLoading={isBulkApproving}
                loadingLabel="Approving"
                onClick={() => {
                  void handleApproveSelected();
                }}
                disabled={!selectedReviewCount}
              >
                Approve selected{selectedReviewCount ? ` (${selectedReviewCount})` : ''}
              </Button>
            </div>
          </div>
        ) : null}
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {filteredReviews.length ? 'Moderation queue ready' : 'No matching reviews'}
          </span>
          <p>
            {verifiedBuyerCount
              ? `${verifiedBuyerCount} review${verifiedBuyerCount === 1 ? '' : 's'} can show a Verified Buyer badge after approval.`
              : 'Approved reviews can still carry an admin reply onto the product detail page.'}
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <AdminDataGrid
        headers={['', 'Review', 'Rating', 'Comment', 'Actions']}
        gridClassName={reviewsGridClass}
        hasRows={filteredReviews.length > 0}
        emptyMessage="No reviews matched that search."
      >
        {filteredReviews.map((review) => (
          <div key={review.id} className={`${reviewsGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
            <div className="pt-1">
              {canModerateReviews ? (
                <input
                  type="checkbox"
                  aria-label={`Select review ${review.title}`}
                  className="h-4 w-4 rounded border-white/20 bg-dark-light text-gold accent-gold focus:ring-gold/30"
                  checked={selectedReviewIds.has(review.id)}
                  onChange={(event) => {
                    setSelectedReviewIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) {
                        next.add(review.id);
                      } else {
                        next.delete(review.id);
                      }
                      return next;
                    });
                  }}
                />
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white">{review.title}</p>
              <p className="text-xs text-gray-500">{review.productName ?? 'Product context unavailable'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-400">{review.user?.name ?? 'Customer unavailable'}</span>
                {review.isVerifiedBuyer ? <Badge variant="success">Verified Buyer</Badge> : null}
                {review.adminReply ? <Badge variant="warning">Has reply</Badge> : null}
              </div>
            </div>
            <div>
              <Badge variant={review.rating >= 4 ? 'success' : review.rating <= 2 ? 'danger' : 'warning'}>{review.rating} / 5</Badge>
            </div>
            <div>
              <p className="leading-6 text-gray-300">{review.comment}</p>
              {/* Existing admin reply */}
              {review.adminReply ? (
                <div className="mt-3 rounded-2xl border border-gold/15 bg-gold/5 px-3 py-2 text-xs text-gray-300">
                  <span className="font-medium text-gold">Admin reply: </span>
                  {review.adminReply}
                </div>
              ) : null}
              {/* Inline reply form */}
              {canModerateReviews && replyOpen[review.id] ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    label="Reply"
                    value={replyDrafts[review.id] ?? ''}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                    placeholder="Write a professional, helpful reply..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      isLoading={replySubmitting[review.id]}
                      onClick={() => void submitReply(review.id)}
                    >
                      Post Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setReplyOpen((current) => ({ ...current, [review.id]: false }))}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              {canModerateReviews ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={async () => { await moderateReview(review.id, true); }}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={async () => { await moderateReview(review.id, false); }}>Reject</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Reply to review ${review.title}`}
                    title="Reply to this review"
                    onClick={() => setReplyOpen((current) => ({ ...current, [review.id]: !current[review.id] }))}
                  >
                    <MessageSquareReply className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">Read-only access</span>
              )}
            </div>
          </div>
        ))}
      </AdminDataGrid>
    </div>
  );
};
