import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, DatePicker, Input, Modal, Textarea } from '@njstore/ui';
import type { ExternalExpenseDto } from '@njstore/types';
import { formatCurrency } from '@njstore/utils';
import { CalendarDays, Download, PencilLine, ReceiptText, Trash2, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminInlineNotice, AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import { fallbackSalesAnalysis } from './salesAnalysis/salesAnalysisDefaults';
import { exportSalesAnalysisWorkbook } from './salesAnalysis/exportSalesAnalysisWorkbook';
import {
  RevenueForecastPanel,
  SalesCadenceExplorer
} from './salesAnalysis/SalesAnalysisPanels';
import {
  formatExpenseDate,
  type SalesCadenceKey,
  wholeNumberFormatter
} from './salesAnalysis/salesAnalysisShared';

interface ExpenseFormState {
  label: string;
  amount: string;
  incurredOn: string;
  category: string;
  notes: string;
}

const createInitialExpenseForm = (): ExpenseFormState => ({
  label: '',
  amount: '',
  incurredOn: new Date().toISOString().slice(0, 10),
  category: 'Operations',
  notes: ''
});

const percentFormatter = new Intl.NumberFormat('en-LK', {
  style: 'percent',
  maximumFractionDigits: 1
});

export const SalesAnalysis = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(createInitialExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [activeExpenseAction, setActiveExpenseAction] = useState<string | null>(null);
  const [isExpenseLedgerOpen, setIsExpenseLedgerOpen] = useState(false);
  const [activeCadence, setActiveCadence] = useState<SalesCadenceKey>('daily');
  const [isExportingWorkbook, setIsExportingWorkbook] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const canManageExpenses = hasPermissions('setting:write');

  const salesAnalysisQuery = useQuery({
    queryKey: ['admin', 'sales-analysis'],
    queryFn: () => adminService.salesAnalysis(),
    refetchInterval: () => (document.visibilityState === 'visible' ? 60_000 : false),
    refetchIntervalInBackground: false
  });

  const salesAnalysis = salesAnalysisQuery.data?.data ?? fallbackSalesAnalysis;
  const totalTrackedExpenses = salesAnalysis.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthRevenue = salesAnalysis.snapshots.monthToDate.revenue;
  const monthNetMargin = monthRevenue > 0 ? salesAnalysis.snapshots.monthToDate.net / monthRevenue : 0;
  const strongestMonthMargin =
    salesAnalysis.strongestMonth && salesAnalysis.strongestMonth.revenue > 0
      ? salesAnalysis.strongestMonth.net / salesAnalysis.strongestMonth.revenue
      : monthNetMargin;

  const resetExpenseForm = (): void => {
    setEditingExpenseId(null);
    setExpenseForm(createInitialExpenseForm());
  };

  const refreshSalesAnalysis = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'sales-analysis'] });
  };

  const fillExpenseForm = (expense: ExternalExpenseDto): void => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      label: expense.label,
      amount: String(expense.amount),
      incurredOn: expense.incurredOn.slice(0, 10),
      category: expense.category,
      notes: expense.notes ?? ''
    });
  };

  const handleExportWorkbook = async (): Promise<void> => {
    try {
      setIsExportingWorkbook(true);
      await exportSalesAnalysisWorkbook(salesAnalysis);
      toast.success('Sales analysis exported to Excel.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export this sales analysis right now.'));
    } finally {
      setIsExportingWorkbook(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    try {
      setIsExportingPdf(true);
      await adminService.exportSalesAnalysisPdf();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export the sales analysis PDF right now.'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveExpense = async (): Promise<void> => {
    const amount = Number(expenseForm.amount);

    if (!expenseForm.label.trim()) {
      toast.error('Enter an expense label.');
      return;
    }

    if (!expenseForm.incurredOn) {
      toast.error('Choose the expense date.');
      return;
    }

    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid expense amount.');
      return;
    }

    try {
      setIsSavingExpense(true);

      const payload = {
        label: expenseForm.label.trim(),
        amount,
        incurredOn: expenseForm.incurredOn,
        category: expenseForm.category.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined
      };

      if (editingExpenseId) {
        await adminService.updateExternalExpense(editingExpenseId, payload);
        toast.success('Expense updated.');
      } else {
        await adminService.createExternalExpense(payload);
        toast.success('Expense added to sales analysis.');
      }

      resetExpenseForm();
      await refreshSalesAnalysis();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save this expense right now.'));
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: ExternalExpenseDto): Promise<void> => {
    if (!window.confirm(`Delete "${expense.label}" from manual expenses?`)) {
      return;
    }

    try {
      setActiveExpenseAction(expense.id);
      await adminService.deleteExternalExpense(expense.id);
      toast.success('Expense removed from analysis.');
      if (editingExpenseId === expense.id) {
        resetExpenseForm();
      }
      await refreshSalesAnalysis();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete this expense right now.'));
    } finally {
      setActiveExpenseAction(null);
    }
  };

  if (salesAnalysisQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow="Analytics"
          title="Sales Analysis"
          description="Loading the latest sales, forecast, and expense insights."
        />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-[156px] animate-pulse rounded-[24px] bg-white/5" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="h-[320px] animate-pulse rounded-[24px] bg-white/5" />
          <Card className="h-[320px] animate-pulse rounded-[24px] bg-white/5" />
        </div>
      </div>
    );
  }

  if (salesAnalysisQuery.isError) {
    const message =
      salesAnalysisQuery.error instanceof Error ? salesAnalysisQuery.error.message : 'Unable to load sales analysis right now.';

    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow="Analytics"
          title="Sales Analysis"
          description="The dedicated sales workspace could not load its current data."
        />
        <Card className="rounded-[24px] p-6">
          <p className="text-sm text-red-300">{message}</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void salesAnalysisQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdminPageHeader
        eyebrow="Analytics"
        title="Sales Analysis"
        description="Daily, monthly, and yearly sales with net profit, forecasts, and tracked outgoing costs."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/customer-analysis')}>
              <UsersRound className="h-4 w-4" />
              Customer Analysis
            </Button>
            <Button type="button" variant="secondary" aria-label="Export PDF" isLoading={isExportingPdf} onClick={() => void handleExportPdf()}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button type="button" variant="secondary" aria-label="Export Excel" isLoading={isExportingWorkbook} onClick={() => void handleExportWorkbook()}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        }
      />

      <AdminInlineNotice className="justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold">
          Net analysis
        </span>
        <p className="max-w-4xl">
          Paid-order revenue minus manual outgoing costs, with the customer behavior, retention, and RFM views available in the dedicated Customer Analysis page.
        </p>
      </AdminInlineNotice>

      <AdminStatGrid
        className="xl:grid-cols-5"
        items={[
          {
            label: salesAnalysis.snapshots.today.label,
            value: formatCurrency(salesAnalysis.snapshots.today.net),
            support: `${formatCurrency(salesAnalysis.snapshots.today.revenue)} revenue · ${formatCurrency(salesAnalysis.snapshots.today.expenses)} expenses · ${wholeNumberFormatter.format(salesAnalysis.snapshots.today.orderCount)} orders`,
            tone: 'gold'
          },
          {
            label: salesAnalysis.snapshots.monthToDate.label,
            value: formatCurrency(salesAnalysis.snapshots.monthToDate.net),
            support: `${formatCurrency(salesAnalysis.snapshots.monthToDate.revenue)} revenue · ${formatCurrency(salesAnalysis.snapshots.monthToDate.expenses)} expenses · ${wholeNumberFormatter.format(salesAnalysis.snapshots.monthToDate.orderCount)} orders`,
            tone: 'blue'
          },
          {
            label: salesAnalysis.snapshots.yearToDate.label,
            value: formatCurrency(salesAnalysis.snapshots.yearToDate.net),
            support: `${formatCurrency(salesAnalysis.snapshots.yearToDate.revenue)} revenue · ${formatCurrency(salesAnalysis.snapshots.yearToDate.expenses)} expenses · ${wholeNumberFormatter.format(salesAnalysis.snapshots.yearToDate.orderCount)} orders`,
            tone: 'emerald'
          },
          {
            label: 'Strongest month',
            value: salesAnalysis.strongestMonth?.label ?? 'N/A',
            support: salesAnalysis.strongestMonth
              ? `${formatCurrency(salesAnalysis.strongestMonth.net)} net · ${percentFormatter.format(strongestMonthMargin)} margin`
              : 'No paid monthly sales have been captured yet.',
            tone: 'blue'
          },
          {
            label: 'Tracked expenses',
            value: formatCurrency(totalTrackedExpenses),
            support: `${wholeNumberFormatter.format(salesAnalysis.expenses.length)} manual expense records currently included in net sales.`,
            tone: 'slate'
          }
        ]}
      />

      <SalesCadenceExplorer
        activeCadence={activeCadence}
        onCadenceChange={setActiveCadence}
        dailySales={salesAnalysis.dailySales}
        monthlySales={salesAnalysis.monthlySales}
        yearlySales={salesAnalysis.yearlySales}
      />

      <RevenueForecastPanel dailySales={salesAnalysis.dailySales} />

      <div className="grid items-start gap-4">
        <Card className="rounded-[24px] p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-gold">Expenses</p>
                <h3 className="mt-2 font-display text-[1.6rem] text-white">Manual Outgoing Costs</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">Track rent, transport, utilities, salaries, and any offline costs that should reduce the net sales view.</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  aria-label="Open tracked expenses"
                  title="Open tracked expenses"
                  onClick={() => setIsExpenseLedgerOpen(true)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gold transition-colors duration-200 hover:border-gold/30 hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <ReceiptText className="h-5 w-5" />
                </button>
                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right sm:block">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">Tracked</p>
                  <p className="mt-1 font-display text-[1rem] leading-tight text-white">{wholeNumberFormatter.format(salesAnalysis.expenses.length)}</p>
                </div>
              </div>
            </div>

            {canManageExpenses ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Expense Label"
                    placeholder="Warehouse rent"
                    value={expenseForm.label}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, label: event.target.value }))}
                  />
                  <Input
                    label="Amount"
                    type="number"
                    placeholder="45000"
                    value={expenseForm.amount}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                  <DatePicker
                    label="Date"
                    value={expenseForm.incurredOn}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, incurredOn: event.target.value }))}
                  />
                  <Input
                    label="Category"
                    placeholder="Operations"
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
                  />
                </div>
                <Textarea
                  label="Notes"
                  className="min-h-[112px]"
                  placeholder="Optional detail about why this expense should be counted in the analysis."
                  value={expenseForm.notes}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))}
                />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" isLoading={isSavingExpense} onClick={() => void handleSaveExpense()}>
                    {editingExpenseId ? 'Update Expense' : 'Add Expense'}
                  </Button>
                  {editingExpenseId ? (
                    <Button type="button" variant="secondary" onClick={resetExpenseForm}>
                      Cancel Edit
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-6 text-sm leading-6 text-gray-400">
                This account can view the sales analysis, but only admins with settings write access can add or edit manual outgoing expenses.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal isOpen={isExpenseLedgerOpen} title="Tracked Expenses" onClose={() => setIsExpenseLedgerOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Expense ledger</p>
              <h3 className="mt-2 font-display text-[1.55rem] text-white">Tracked Expenses</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">Every manual outgoing cost that is currently included in the net sales analysis.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Total tracked</p>
              <p className="mt-2 font-display text-2xl text-white">{formatCurrency(totalTrackedExpenses)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {salesAnalysis.expenses.length ? (
              salesAnalysis.expenses.map((expense) => (
                <div key={expense.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{expense.label}</p>
                        <Badge variant="info">{expense.category}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4 text-gold" />
                          {formatExpenseDate(expense.incurredOn)}
                        </span>
                        <span className="font-mono text-white">{formatCurrency(expense.amount)}</span>
                      </div>
                      {expense.notes ? <p className="mt-2 text-sm leading-6 text-gray-400">{expense.notes}</p> : null}
                    </div>

                    {canManageExpenses ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            fillExpenseForm(expense);
                            setIsExpenseLedgerOpen(false);
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          isLoading={activeExpenseAction === expense.id}
                          onClick={() => void handleDeleteExpense(expense)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm leading-6 text-gray-400">
                No manual outgoing expenses are being counted yet.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
