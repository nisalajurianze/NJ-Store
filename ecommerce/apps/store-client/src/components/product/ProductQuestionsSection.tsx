import type { ProductQuestionDto } from '@njstore/types';
import { Card, EmptyState, SectionHeading, Skeleton } from '@njstore/ui';
import { formatDate } from '@njstore/utils/formatters';
import { useTranslation } from 'react-i18next';

interface ProductQuestionsSectionProps {
  questions: ProductQuestionDto[];
  isLoading: boolean;
}

export const ProductQuestionsSection = ({
  questions,
  isLoading
}: ProductQuestionsSectionProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className="mt-10">
      <Card className="rounded-[32px]">
        <SectionHeading eyebrow={t('product.questions.eyebrow')} title={t('product.questions.title')} description={t('product.questions.description')} size="compact" />
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-[24px]" />
              <Skeleton className="h-24 rounded-[24px]" />
            </>
          ) : questions.length ? (
            questions.map((question) => (
              <div key={question.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{question.askedBy.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{formatDate(question.createdAt)}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-200">{question.question}</p>
                <div className="mt-4 rounded-[20px] border border-gold/15 bg-gold/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gold">
                    {t('product.questions.answeredBy', { name: question.answeredBy?.name ?? 'NJ Store' })}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-gray-200">{question.answer}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title={t('product.questions.emptyTitle')} description={t('product.questions.emptyDescription')} />
          )}
        </div>
      </Card>
    </section>
  );
};
