import { useDeferredValue, useMemo, useState } from 'react';
import type { AdminProductQuestionDto } from '@njstore/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Modal, Textarea } from '@njstore/ui';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { adminService } from '../../services/adminService';
import { getApiErrorMessage } from '../../utils/apiError';

type QuestionStatusFilter = 'all' | AdminProductQuestionDto['status'];

interface ListQueryResult<T> {
  data: T[];
}

const questionsGridClass =
  'grid min-w-[1140px] grid-cols-[minmax(0,0.86fr)_minmax(0,0.74fr)_minmax(0,1.44fr)_minmax(0,0.42fr)_minmax(0,0.72fr)_minmax(220px,0.82fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,0.7fr)_minmax(0,1.38fr)_minmax(0,0.4fr)_minmax(0,0.7fr)_minmax(220px,0.82fr)] lg:gap-3';

export const ProductQuestions = (): JSX.Element => {
  const queryClient = useQueryClient();
  const { hasPermissions } = useAdminPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuestionStatusFilter>('all');
  const [answeringQuestion, setAnsweringQuestion] = useState<AdminProductQuestionDto | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const canAnswerQuestions = hasPermissions('product:write');

  const questions = useQuery<ListQueryResult<AdminProductQuestionDto>>({
    queryKey: ['admin', 'product-questions'],
    queryFn: async () => (await adminService.productQuestions()) as ListQueryResult<AdminProductQuestionDto>,
    staleTime: 10_000,
    refetchInterval: () => (typeof document === 'undefined' || document.visibilityState === 'visible' ? 30_000 : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true
  });

  const questionItems = questions.data?.data ?? [];
  const pendingCount = questionItems.filter((question) => question.status === 'pending').length;
  const answeredCount = questionItems.filter((question) => question.status === 'answered').length;

  const filteredQuestions = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return questionItems.filter((question) => {
      if (statusFilter !== 'all' && question.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        question.product.name,
        question.product.slug,
        question.customer.name,
        question.customer.email,
        question.question,
        question.answer ?? '',
        question.status
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [deferredSearchTerm, questionItems, statusFilter]);

  const openAnswerModal = (question: AdminProductQuestionDto): void => {
    if (!canAnswerQuestions) {
      return;
    }

    setAnsweringQuestion(question);
    setAnswerDraft(question.answer ?? '');
  };

  const closeAnswerModal = (): void => {
    setAnsweringQuestion(null);
    setAnswerDraft('');
  };

  const submitAnswer = async (): Promise<void> => {
    if (!answeringQuestion || !answerDraft.trim()) {
      toast.error('Type an answer before saving.');
      return;
    }

    try {
      setIsSubmittingAnswer(true);
      await adminService.answerProductQuestion(answeringQuestion.id, {
        answer: answerDraft.trim()
      });
      toast.success('Answer published');
      closeAnswerModal();
      await Promise.all([
        questions.refetch(),
        queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] })
      ]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save this answer right now.'));
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Operations"
        title="Product Q&A"
        description="Keep the catalog informative by answering customer product questions and publishing the best answers back onto the storefront."
        action={
          !canAnswerQuestions ? (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          ) : undefined
        }
        meta={[
          {
            label: 'Questions loaded',
            value: questionItems.length.toLocaleString(),
            support: 'All customer questions currently returned by the live admin feed.',
            tone: 'blue'
          },
          {
            label: 'Response access',
            value: canAnswerQuestions ? 'Answer enabled' : 'Read only',
            support: canAnswerQuestions ? 'This account can answer and publish product questions.' : 'This account can review the queue but cannot reply.',
            tone: canAnswerQuestions ? 'gold' : 'slate'
          }
        ]}
      />

      <AdminStatGrid
        className="xl:grid-cols-4"
        items={[
          {
            label: 'All questions',
            value: questionItems.length.toLocaleString(),
            support: 'Every question currently visible in this workspace.',
            tone: 'slate'
          },
          {
            label: 'Pending',
            value: pendingCount.toLocaleString(),
            support: pendingCount ? 'Customer questions still waiting for an admin reply.' : 'No unanswered product questions right now.',
            tone: pendingCount ? 'rose' : 'emerald'
          },
          {
            label: 'Answered',
            value: answeredCount.toLocaleString(),
            support: 'Questions already published with an admin answer.',
            tone: answeredCount ? 'emerald' : 'slate'
          },
          {
            label: 'Queue focus',
            value: statusFilter === 'all' ? 'All' : statusFilter === 'pending' ? 'Pending only' : 'Answered only',
            support: 'Switch between unanswered work and published answers without leaving the page.',
            tone: statusFilter === 'pending' ? 'rose' : statusFilter === 'answered' ? 'blue' : 'gold'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by product, customer, email, question text, or answer"
            label="Search product questions"
            resultCount={filteredQuestions.length}
            totalCount={questionItems.length}
          />
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button type="button" size="sm" variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'answered' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('answered')}
            >
              Answered
            </Button>
          </div>
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {filteredQuestions.length ? 'Queue ready' : 'No matching questions'}
          </span>
          <p>
            New product questions arrive here via socket notifications, and answering one publishes it to the product page for future shoppers.
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <AdminDataGrid
        headers={['Product', 'Customer', 'Question', 'Status', 'Timeline', 'Actions']}
        gridClassName={questionsGridClass}
        hasRows={filteredQuestions.length > 0}
        emptyMessage="No product questions matched the current filters."
      >
        {filteredQuestions.map((question) => (
          <div key={question.id} className={`${questionsGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
            <div className="min-w-0 space-y-1">
              <p className="break-words font-medium text-white [overflow-wrap:anywhere]">{question.product.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">/{question.product.slug}</span>
                <Link className="text-blue-200 transition hover:text-blue-100" to={`/dashboard/products?edit=${question.product.id}`}>
                  Open in products
                </Link>
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-words font-medium text-white [overflow-wrap:anywhere]">{question.customer.name}</p>
              <p className="break-words text-xs text-gray-500 [overflow-wrap:anywhere]">{question.customer.email}</p>
            </div>
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Question</p>
                <p className="mt-1 break-words leading-6 text-gray-200 [overflow-wrap:anywhere]">{question.question}</p>
              </div>
              {question.answer ? (
                <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Published answer</p>
                  <div className="admin-scrollbar mt-1 max-h-36 overflow-y-auto pr-1">
                    <p className="whitespace-pre-wrap break-words leading-6 text-white [overflow-wrap:anywhere]">{question.answer}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <Badge variant={question.status === 'answered' ? 'success' : 'warning'} className="capitalize">
                {question.status}
              </Badge>
            </div>
            <div className="min-w-0 space-y-1 text-xs text-gray-500">
              <p className="break-words [overflow-wrap:anywhere]">Asked {new Date(question.createdAt).toLocaleString()}</p>
              {question.answeredAt ? (
                <p className="break-words [overflow-wrap:anywhere]">
                  Answered {new Date(question.answeredAt).toLocaleString()}
                  {question.answeredBy?.name || question.answeredBy?.email ? ` by ${question.answeredBy?.name ?? question.answeredBy?.email}` : ''}
                </p>
              ) : (
                <p>Waiting for response</p>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {canAnswerQuestions ? (
                <Button size="sm" onClick={() => openAnswerModal(question)}>
                  {question.answer ? 'Edit Answer' : 'Answer'}
                </Button>
              ) : (
                <span className="text-xs text-gray-500">Read-only access</span>
              )}
            </div>
          </div>
        ))}
      </AdminDataGrid>

      <Modal isOpen={Boolean(answeringQuestion)} title="Answer Product Question" onClose={closeAnswerModal}>
        <div className="space-y-4">
          {answeringQuestion ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Question</p>
              <h3 className="mt-2 break-words font-display text-[1.35rem] text-white [overflow-wrap:anywhere]">{answeringQuestion.product.name}</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-200 [overflow-wrap:anywhere]">{answeringQuestion.question}</p>
              <p className="mt-2 break-words text-xs text-gray-500 [overflow-wrap:anywhere]">
                From {answeringQuestion.customer.name} • {answeringQuestion.customer.email}
              </p>
            </div>
          ) : null}

          <Textarea
            label="Answer"
            placeholder="Share a clear answer that will help future shoppers too."
            className="min-h-[160px]"
            value={answerDraft}
            onChange={(event) => setAnswerDraft(event.target.value)}
          />

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-1">
            {canAnswerQuestions ? (
              <Button onClick={() => void submitAnswer()} isLoading={isSubmittingAnswer}>
                Save Answer
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={closeAnswerModal}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
