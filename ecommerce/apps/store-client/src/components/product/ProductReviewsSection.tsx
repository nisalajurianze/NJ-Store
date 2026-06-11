import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ReviewDto } from '@njstore/types';
import { Badge, Button, Card, EmptyState, Input, SectionHeading, Skeleton, StarRating, Textarea } from '@njstore/ui';
import { formatDate } from '@njstore/utils/formatters';
import { Check, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReviewFormState, ReviewSortOption } from './productDetailTypes';

interface ProductReviewsSectionProps {
  currentReviews: ReviewDto[];
  isLoading: boolean;
  isSignedIn: boolean;
  reviewSort: ReviewSortOption;
  pendingHelpfulReviewId: string | null;
  reviewForm: ReviewFormState;
  isSubmittingReview: boolean;
  onReviewSortChange: (value: ReviewSortOption) => void;
  onHelpfulVote: (review: ReviewDto) => void;
  onReviewFormChange: Dispatch<SetStateAction<ReviewFormState>>;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const ProductReviewsSection = ({
  currentReviews,
  isLoading,
  isSignedIn,
  reviewSort,
  pendingHelpfulReviewId,
  reviewForm,
  isSubmittingReview,
  onReviewSortChange,
  onHelpfulVote,
  onReviewFormChange,
  onReviewSubmit
}: ProductReviewsSectionProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <Card className="rounded-[32px]">
        <SectionHeading eyebrow={t('product.reviews.eyebrow')} title={t('product.reviews.title')} description={t('product.reviews.description')} size="compact" />

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { value: 'helpful' as const, label: t('product.reviews.sortHelpful') },
            { value: 'recent' as const, label: t('product.reviews.sortNewest') }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onReviewSortChange(option.value)}
              className={`rounded-full border px-4 py-2 text-sm transition-[border-color,background-color,color,box-shadow] duration-200 ${
                reviewSort === option.value ? 'border-gold bg-gold/12 text-gold' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white'
              }`}
              aria-pressed={reviewSort === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-36 rounded-[28px]" />
              <Skeleton className="h-36 rounded-[28px]" />
            </>
          ) : currentReviews.length ? (
            currentReviews.map((reviewItem) => (
              <div key={reviewItem.id} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-white">{reviewItem.title}</p>
                      {reviewItem.isVerifiedBuyer ? (
                        <Badge variant="success" className="gap-1">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          {t('product.reviews.verifiedBuyer')}
                        </Badge>
                      ) : reviewItem.isVerified ? (
                        <Badge variant="success" className="gap-1">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          {t('product.reviews.verified')}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <StarRating value={reviewItem.rating} size="sm" />
                      <span className="text-sm text-gray-400">{reviewItem.user.name}</span>
                      <span className="text-sm text-gray-500">{formatDate(reviewItem.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void onHelpfulVote(reviewItem)}
                    isLoading={pendingHelpfulReviewId === reviewItem.id}
                    loadingLabel={t('product.actions.saving')}
                  >
                    {t('product.reviews.helpful', { count: reviewItem.helpfulVotes })}
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-7 text-gray-300">{reviewItem.comment}</p>
                {reviewItem.adminReply ? (
                  <div className="mt-4 rounded-[22px] border border-gold/15 bg-gold/5 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('product.reviews.adminReply')}</span>
                      {reviewItem.adminRepliedAt ? <span className="text-gray-500">{formatDate(reviewItem.adminRepliedAt)}</span> : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-gray-200">{reviewItem.adminReply}</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState title={t('product.reviews.emptyTitle')} description={t('product.reviews.emptyDescription')} />
          )}
        </div>
      </Card>

      <Card className="rounded-[32px]">
        <SectionHeading
          eyebrow={t('product.reviewForm.eyebrow')}
          title={t('product.reviewForm.title')}
          description={isSignedIn ? t('product.reviewForm.descriptionSignedIn') : t('product.reviewForm.descriptionSignedOut')}
          size="compact"
        />

        <form className="mt-6 space-y-5" onSubmit={onReviewSubmit}>
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-200">{t('product.reviewForm.rating')}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const selected = value === reviewForm.rating;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onReviewFormChange((current) => ({ ...current, rating: value }))}
                    className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-[border-color,background-color,color,box-shadow] duration-200 ${
                      selected ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white'
                    }`}
                    aria-pressed={selected}
                  >
                    {t('product.reviewForm.stars', { count: value })}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            id="product-review-title"
            label={t('product.reviewForm.titleLabel')}
            value={reviewForm.title}
            onChange={(event) => onReviewFormChange((current) => ({ ...current, title: event.target.value }))}
            placeholder={t('product.reviewForm.titlePlaceholder')}
            maxLength={80}
            required
          />

          <Textarea
            id="product-review-comment"
            label={t('product.reviewForm.commentLabel')}
            value={reviewForm.comment}
            onChange={(event) => onReviewFormChange((current) => ({ ...current, comment: event.target.value }))}
            placeholder={t('product.reviewForm.commentPlaceholder')}
            maxLength={600}
            required
          />

          <Button type="submit" className="w-full sm:w-auto" isLoading={isSubmittingReview} loadingLabel={t('product.actions.sending')}>
            {t('product.reviewForm.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
};
