import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input, Modal, SectionHeading, Textarea } from '@njstore/ui';
import toast from 'react-hot-toast';
import type { AdminReturnRequestDto } from '@njstore/types';
import { adminService } from '../../services/adminService';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

type ReturnStatusFilter = 'all' | AdminReturnRequestDto['status'];
type PendingAction =
  | {
      request: AdminReturnRequestDto;
      status: 'approved' | 'rejected' | 'refunded';
    }
  | null;

const statusBadgeVariant = (status: AdminReturnRequestDto['status']): 'default' | 'warning' | 'success' | 'danger' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'default';
    case 'rejected':
      return 'danger';
    case 'refunded':
      return 'success';
  }
};

export const Returns = (): JSX.Element => {
  const queryClient = useQueryClient();
  const { hasPermissions } = useAdminPermissions();
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionSelectedSkus, setActionSelectedSkus] = useState<string[]>([]);
  const [actionQuantities, setActionQuantities] = useState<Record<string, string>>({});
  const [refundMode, setRefundMode] = useState<'amount' | 'percent'>('amount');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundPercent, setRefundPercent] = useState('100');
  const [uploadingEvidenceFor, setUploadingEvidenceFor] = useState<string | null>(null);
  const canManageReturns = hasPermissions('order:write');

  const returnsQuery = useQuery({
    queryKey: ['admin', 'returns', statusFilter, search],
    queryFn: () =>
      adminService.returnRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 50
      }),
    staleTime: 15_000
  });

  const requests = returnsQuery.data?.data ?? [];
  const summary = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'pending').length,
      approved: requests.filter((request) => request.status === 'approved').length,
      rejected: requests.filter((request) => request.status === 'rejected').length,
      refunded: requests.filter((request) => request.status === 'refunded').length
    }),
    [requests]
  );

  const resetActionDraft = (): void => {
    setPendingAction(null);
    setAdminNote('');
    setActionSelectedSkus([]);
    setActionQuantities({});
    setRefundMode('amount');
    setRefundAmount('');
    setRefundPercent('100');
  };

  const openAction = (request: AdminReturnRequestDto, status: 'approved' | 'rejected' | 'refunded'): void => {
    setPendingAction({ request, status });
    setAdminNote(request.adminNote ?? '');
    setActionSelectedSkus(request.items.map((item) => item.sku));
    setActionQuantities(Object.fromEntries(request.items.map((item) => [item.sku, String(item.quantity)])));
    setRefundMode('amount');
    setRefundAmount(String(request.refundAmount));
    setRefundPercent(String(request.refundPercent));
  };

  const handleAction = async (): Promise<void> => {
    if (!pendingAction) {
      return;
    }

    try {
      const selectedItems = pendingAction.request.items
        .filter((item) => actionSelectedSkus.includes(item.sku))
        .map((item) => ({
          sku: item.sku,
          quantity: Math.max(1, Math.min(item.quantity, Math.trunc(Number(actionQuantities[item.sku]) || item.quantity)))
        }));

      if (pendingAction.status !== 'rejected' && selectedItems.length === 0) {
        toast.error('Select at least one item for this refund.');
        return;
      }

      await adminService.updateReturnRequest(pendingAction.request.id, {
        status: pendingAction.status,
        adminNote: adminNote.trim() || undefined,
        ...(pendingAction.status === 'rejected'
          ? {}
          : {
              items: selectedItems,
              ...(refundMode === 'amount'
                ? { refundAmount: Number(refundAmount || pendingAction.request.refundAmount) }
                : { refundPercent: Number(refundPercent || pendingAction.request.refundPercent) })
            })
      });
      toast.success(`Return request ${pendingAction.status}`);
      resetActionDraft();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-notifications', 'center'] })
      ]);
    } catch {
      toast.error('Unable to update this return request right now.');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Returns"
        description="Review customer return requests, approve or reject them, upload evidence, and complete item-level refunds."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {([
          ['Pending', summary.pending],
          ['Approved', summary.approved],
          ['Rejected', summary.rejected],
          ['Refunded', summary.refunded]
        ] as const).map(([label, value]) => (
          <Card key={label} className="rounded-[26px]">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">{label}</p>
            <p className="mt-3 font-display text-[2rem] text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-[30px]">
        <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
          <label className="space-y-2 text-sm text-gray-300">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReturnStatusFilter)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            >
              <option value="all" className="bg-[#07101c] text-white">All statuses</option>
              <option value="pending" className="bg-[#07101c] text-white">Pending</option>
              <option value="approved" className="bg-[#07101c] text-white">Approved</option>
              <option value="rejected" className="bg-[#07101c] text-white">Rejected</option>
              <option value="refunded" className="bg-[#07101c] text-white">Refunded</option>
            </select>
          </label>
          <Input
            label="Search by order number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ORD-20260413-000123"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {returnsQuery.isPending ? (
          <Card className="rounded-[28px] text-sm text-gray-400">Loading return requests...</Card>
        ) : requests.length ? (
          requests.map((request) => (
            <Card key={request.id} className="rounded-[30px]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-[1.35rem] text-white">{request.orderNumber}</p>
                    <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">
                    {request.customer.name} · {request.customer.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Refund Amount</p>
                  <p className="mt-2 text-lg font-semibold text-white">LKR {request.refundAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-gray-300">
                    <p className="font-medium text-white">Customer reason</p>
                    <p className="mt-2">{request.reason}</p>
                    {request.adminNote ? (
                      <>
                        <p className="mt-4 font-medium text-white">Admin note</p>
                        <p className="mt-2">{request.adminNote}</p>
                      </>
                    ) : null}
                    {request.evidence.length ? (
                      <>
                        <p className="mt-4 font-medium text-white">Evidence</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {request.evidence.map((asset, index) => (
                            <a
                              key={`${asset.publicId}-${index}`}
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gold hover:border-gold/30"
                            >
                              {asset.uploadedBy === 'admin' ? 'Admin' : 'Customer'} evidence {index + 1}
                            </a>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300">
                    <p className="font-medium text-white">Returned items</p>
                    <div className="mt-3 space-y-2">
                      {request.items.map((item) => (
                        <div key={`${request.id}-${item.sku}`} className="flex items-center justify-between rounded-xl bg-black/10 px-3 py-2">
                          <div>
                            <p className="text-white">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </div>
                          <span className="text-sm text-gray-300">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300">
                  <p className="font-medium text-white">Request metadata</p>
                  <div className="mt-3 space-y-2">
                    <p>Created: {new Date(request.createdAt).toLocaleString()}</p>
                    {request.approvedAt ? <p>Approved: {new Date(request.approvedAt).toLocaleString()}</p> : null}
                    {request.rejectedAt ? <p>Rejected: {new Date(request.rejectedAt).toLocaleString()}</p> : null}
                    {request.refundedAt ? <p>Refunded: {new Date(request.refundedAt).toLocaleString()}</p> : null}
                    {request.handledBy ? <p>Handled by: {request.handledBy.name}</p> : null}
                  </div>

                  {canManageReturns ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {request.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => openAction(request, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openAction(request, 'rejected')}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {request.status === 'approved' ? (
                        <Button size="sm" onClick={() => openAction(request, 'refunded')}>
                          Mark Refunded
                        </Button>
                      ) : null}
                      {request.status !== 'refunded' ? (
                        <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white hover:border-gold/30">
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            className="sr-only"
                            disabled={uploadingEvidenceFor === request.id}
                            onChange={async (event) => {
                              const files = Array.from(event.target.files ?? []);
                              event.target.value = '';
                              if (!files.length) {
                                return;
                              }

                              try {
                                setUploadingEvidenceFor(request.id);
                                await adminService.uploadReturnEvidence(request.id, files);
                                toast.success('Evidence uploaded');
                                await queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] });
                              } catch {
                                toast.error('Unable to upload evidence right now.');
                              } finally {
                                setUploadingEvidenceFor(null);
                              }
                            }}
                          />
                          {uploadingEvidenceFor === request.id ? 'Uploading...' : 'Upload Evidence'}
                        </label>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-5 text-xs text-gray-500">This account can review returns but cannot change their status.</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="rounded-[28px] text-sm text-gray-400">No return requests match the current filters.</Card>
        )}
      </div>

      <Modal
        isOpen={pendingAction !== null}
        onClose={() => {
          resetActionDraft();
        }}
        title={pendingAction ? `Confirm ${pendingAction.status}` : 'Update return request'}
        bodyClassName="space-y-4"
      >
        {pendingAction ? (
          <>
            <p className="text-sm leading-6 text-gray-300">
              Update return request for <span className="font-medium text-white">{pendingAction.request.orderNumber}</span> to{' '}
              <span className="font-medium text-white">{pendingAction.status}</span>.
            </p>
            {pendingAction.status !== 'rejected' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Refunded items</p>
                {pendingAction.request.items.map((item) => {
                  const checked = actionSelectedSkus.includes(item.sku);

                  return (
                    <div key={item.sku} className="grid gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center">
                      <label className="flex min-w-0 items-start gap-3 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-gold"
                          checked={checked}
                          onChange={(event) => {
                            setActionSelectedSkus((current) =>
                              event.target.checked ? [...new Set([...current, item.sku])] : current.filter((sku) => sku !== item.sku)
                            );
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-white">{item.name}</span>
                          <span className="block text-xs text-gray-500">{item.sku} · requested x{item.quantity}</span>
                        </span>
                      </label>
                      <Input
                        label="Qty"
                        type="number"
                        min={1}
                        max={item.quantity}
                        disabled={!checked}
                        value={actionQuantities[item.sku] ?? String(item.quantity)}
                        onChange={(event) => setActionQuantities((current) => ({ ...current, [item.sku]: event.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            {pendingAction.status !== 'rejected' ? (
              <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                <label className="space-y-2 text-sm text-gray-300">
                  <span>Refund mode</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
                    value={refundMode}
                    onChange={(event) => setRefundMode(event.target.value as 'amount' | 'percent')}
                  >
                    <option value="amount" className="bg-[#07101c] text-white">Amount</option>
                    <option value="percent" className="bg-[#07101c] text-white">Percent</option>
                  </select>
                </label>
                {refundMode === 'amount' ? (
                  <Input label="Refund amount" type="number" min={0} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
                ) : (
                  <Input label="Refund percent" type="number" min={0} max={100} value={refundPercent} onChange={(event) => setRefundPercent(event.target.value)} />
                )}
              </div>
            ) : null}
            <Textarea
              label="Admin note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Optional note for the customer"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleAction()}>
                Confirm
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetActionDraft();
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
};
