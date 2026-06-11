import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card } from '@njstore/ui';
import { downloadBlob } from '@njstore/utils';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { ManualOrderModal } from './orders/ManualOrderModal';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { OrderReceiptPreviewModal } from './orders/OrderReceiptPreviewModal';
import {
  AdminControlPanel,
  AdminPageHeader,
  AdminStatGrid,
  adminCompactFieldClassName,
  adminFilterSelectClassName
} from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import { buildPackingSlipHtml } from './orders/packingSlip';
import {
  createManualOrderForm,
  formatCurrency,
  formatFulfilmentType,
  formatStatusAge,
  getManualOrderLinePrice,
  getMergePreview,
  getOrderStatusVariant,
  getPaymentStatusVariant,
  getProductOptionId,
  getProductStock,
  getQuickFilterLabel,
  getSlaStatus,
  matchesQuickFilter,
  parseOptionalAmount,
  parseOrderStatusFilter,
  parsePaymentStatusFilter,
  parseQuickOrderFilter,
  type BulkStatusValue,
  type ListQueryResult,
  type ManualOrderFormState,
  type ManualOrderItemForm,
  type ManualOrderProductOption,
  type OrderRecord,
  type OrderStatusFilter,
  type PaymentStatusFilter,
  type QuickOrderFilter,
  type UserRecord
} from './orders/orderAdminUtils';
import type { ReceiptPreviewState } from './orders/orderModalTypes';
import { printHtmlDocument } from './orders/receiptPreviewActions';

const ordersTableGridClass =
  'grid min-w-[1060px] grid-cols-[28px_minmax(0,1.05fr)_minmax(0,0.78fr)_minmax(0,1.18fr)_minmax(0,0.72fr)_minmax(0,1.14fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[28px_minmax(0,1fr)_minmax(0,0.76fr)_minmax(0,1.1fr)_minmax(0,0.66fr)_minmax(0,1.08fr)] lg:gap-3';
const filterSelectClassName = adminFilterSelectClassName;
const compactFieldClassName = adminCompactFieldClassName;
const parsePositivePage = (value: string | null): number => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 1;
};

export const Orders = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [quickFilter, setQuickFilter] = useState<QuickOrderFilter>(() => parseQuickOrderFilter(searchParams.get('quick')));
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(() => parseOrderStatusFilter(searchParams.get('status')));
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>(() => parsePaymentStatusFilter(searchParams.get('payment')));
  const [orderPage, setOrderPage] = useState(() => parsePositivePage(searchParams.get('page')));
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const orders = useQuery<ListQueryResult<OrderRecord>>({
    queryKey: ['admin', 'orders', orderPage, deferredSearchTerm, statusFilter, paymentFilter],
    queryFn: async () =>
      (await adminService.orders({
        page: orderPage,
        limit: 20,
        search: deferredSearchTerm.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        paymentStatus: paymentFilter === 'all' ? undefined : paymentFilter
      })) as ListQueryResult<OrderRecord>,
    refetchInterval: () => (document.visibilityState === 'visible' ? 30_000 : false),
    refetchIntervalInBackground: false
  });
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewState | null>(null);
  const [activeReceiptAction, setActiveReceiptAction] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<BulkStatusValue>('processing');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkTrackingNumber, setBulkTrackingNumber] = useState('');
  const [isApplyingBulkUpdate, setIsApplyingBulkUpdate] = useState(false);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualOrderForm, setManualOrderForm] = useState<ManualOrderFormState>(() => createManualOrderForm());
  const [isCreatingManualOrder, setIsCreatingManualOrder] = useState(false);
  const previousOrderFiltersRef = useRef({ search: deferredSearchTerm, statusFilter, paymentFilter });
  const canWriteOrders = hasPermissions('order:write');
  const canDeleteOrders = hasPermissions('order:delete');
  const userDirectory = useQuery<ListQueryResult<UserRecord>>({
    queryKey: ['admin', 'users', 'all'],
    queryFn: async () => (await adminService.users<UserRecord>({ role: 'workspace', limit: 50 })) as ListQueryResult<UserRecord>,
    enabled: canWriteOrders,
    staleTime: 60_000
  });
  const manualOrderProducts = useQuery<ListQueryResult<ManualOrderProductOption>>({
    queryKey: ['admin', 'manual-order-products'],
    queryFn: async () => (await adminService.products<ManualOrderProductOption>({ includeInactive: false, limit: 50 })) as ListQueryResult<ManualOrderProductOption>,
    enabled: canWriteOrders && isManualOrderOpen,
    staleTime: 60_000
  });
  const orderItems = orders.data?.data ?? [];
  const staffOptions = useMemo(
    () => (userDirectory.data?.data ?? []).filter((user) => (user.role === 'admin' || user.role === 'staff') && user.isActive !== false),
    [userDirectory.data]
  );
  const customerOptions = useMemo(
    () => (userDirectory.data?.data ?? []).filter((user) => user.role === 'customer' && user.isActive !== false),
    [userDirectory.data]
  );
  const manualProductOptions = useMemo(
    () => (manualOrderProducts.data?.data ?? []).filter((product) => product.isActive !== false && getProductStock(product) > 0),
    [manualOrderProducts.data]
  );
  const manualProductsById = useMemo(() => {
    const products = new Map<string, ManualOrderProductOption>();
    manualProductOptions.forEach((product) => {
      products.set(getProductOptionId(product), product);
    });
    return products;
  }, [manualProductOptions]);
  const manualOrderPreview = useMemo(() => {
    const subtotal = manualOrderForm.items.reduce((sum, item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      return sum + getManualOrderLinePrice(manualProductsById.get(item.productId), item.variantIndex) * quantity;
    }, 0);
    const shippingFee = parseOptionalAmount(manualOrderForm.shippingFee) ?? 0;
    const discount = parseOptionalAmount(manualOrderForm.discount) ?? 0;
    return {
      subtotal,
      shippingFee,
      discount,
      totalBeforeTax: Math.max(subtotal + shippingFee - discount, 0)
    };
  }, [manualOrderForm.discount, manualOrderForm.items, manualOrderForm.shippingFee, manualProductsById]);
  const filteredOrders = useMemo(() => {
    return orderItems.filter((order) => {
      if (quickFilter !== 'all' && !matchesQuickFilter(order, quickFilter)) {
        return false;
      }

      return true;
    });
  }, [orderItems, quickFilter]);
  const orderPagination = orders.data?.pagination;
  const orderTotalCount = orderPagination?.total ?? filteredOrders.length;
  const orderTotalPages = orderPagination?.totalPages ?? 1;
  const currentOrderPage = orderPagination?.page ?? orderPage;
  const currentOrderLimit = orderPagination?.limit ?? 20;
  const orderPageStart = orderTotalCount > 0 ? (currentOrderPage - 1) * currentOrderLimit + 1 : 0;
  const orderPageEnd = orderTotalCount > 0 ? Math.min(orderPageStart + filteredOrders.length - 1, orderTotalCount) : 0;

  const selectedOrders = useMemo(
    () => orderItems.filter((order) => selectedOrderIds.includes(order.id)),
    [orderItems, selectedOrderIds]
  );
  const selectedOrderCount = selectedOrderIds.length;
  const allVisibleSelected = filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrderIds.includes(order.id));
  const mergePreview = useMemo(() => getMergePreview(selectedOrders), [selectedOrders]);

  const orderSummaryCards = useMemo(
    () => [
      {
        key: 'all' as const,
        title: 'Current batch',
        count: orderItems.length,
        support: 'Everything loaded on the current page of the admin query.'
      },
      {
        key: 'payment_review' as const,
        title: 'Receipts to review',
        count: orderItems.filter((order) => order.paymentStatus === 'receipt_uploaded').length,
        support: 'Uploaded receipts waiting for admin approval'
      },
      {
        key: 'active_fulfilment' as const,
        title: 'In fulfilment',
        count: orderItems.filter((order) => order.status === 'processing' || order.status === 'shipped').length,
        support: 'Orders still moving through the workflow'
      },
      {
        key: 'delivered' as const,
        title: 'Delivered',
        count: orderItems.filter((order) => order.status === 'delivered').length,
        support: 'Completed orders in the visible list'
      },
      {
        key: 'cancelled' as const,
        title: 'Cancelled',
        count: orderItems.filter((order) => order.status === 'cancelled').length,
        support: 'Orders closed without fulfilment'
      }
    ],
    [orderItems]
  );

  useEffect(() => {
    const nextSearchTerm = searchParams.get('q') ?? '';
    const nextQuickFilter = parseQuickOrderFilter(searchParams.get('quick'));
    const nextStatusFilter = parseOrderStatusFilter(searchParams.get('status'));
    const nextPaymentFilter = parsePaymentStatusFilter(searchParams.get('payment'));
    const nextOrderPage = parsePositivePage(searchParams.get('page'));

    setSearchTerm((current) => (current === nextSearchTerm ? current : nextSearchTerm));
    setQuickFilter((current) => (current === nextQuickFilter ? current : nextQuickFilter));
    setStatusFilter((current) => (current === nextStatusFilter ? current : nextStatusFilter));
    setPaymentFilter((current) => (current === nextPaymentFilter ? current : nextPaymentFilter));
    setOrderPage((current) => (current === nextOrderPage ? current : nextOrderPage));
  }, [searchParams]);

  useEffect(() => {
    const previousFilters = previousOrderFiltersRef.current;

    if (
      previousFilters.search !== deferredSearchTerm ||
      previousFilters.statusFilter !== statusFilter ||
      previousFilters.paymentFilter !== paymentFilter
    ) {
      setOrderPage(1);
      previousOrderFiltersRef.current = {
        search: deferredSearchTerm,
        statusFilter,
        paymentFilter
      };
    }
  }, [deferredSearchTerm, paymentFilter, statusFilter]);

  useEffect(() => {
    if (!receiptPreview) {
      return;
    }

    return () => {
      window.URL.revokeObjectURL(receiptPreview.url);
    };
  }, [receiptPreview]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    const refreshedOrder = orderItems.find((order) => order.id === selectedOrder.id);
    if (!refreshedOrder) {
      setSelectedOrder(null);
      return;
    }

    if (refreshedOrder !== selectedOrder) {
      setSelectedOrder(refreshedOrder);
    }
  }, [orderItems, selectedOrder]);

  useEffect(() => {
    setSelectedOrderIds((current) => {
      const nextSelection = current.filter((orderId) => orderItems.some((order) => order.id === orderId));
      if (nextSelection.length === current.length && nextSelection.every((orderId, index) => orderId === current[index])) {
        return current;
      }

      return nextSelection;
    });
  }, [orderItems]);

  const refreshAdminOrders = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
    ]);
  };

  const openReceiptPreview = async (orderId: string, receiptId: string): Promise<void> => {
    try {
      setActiveReceiptAction(`${orderId}:${receiptId}`);
      const asset = await adminService.getOrderReceiptAsset(orderId, receiptId);
      setReceiptPreview((current) => {
        if (current) {
          window.URL.revokeObjectURL(current.url);
        }

        return {
          url: window.URL.createObjectURL(asset.blob),
          filename: asset.filename,
          mimeType: asset.blob.type || 'application/octet-stream'
        };
      });
    } catch {
      toast.error('Unable to open the receipt right now.');
    } finally {
      setActiveReceiptAction(null);
    }
  };

  const printPackingSlip = (order: OrderRecord): void => {
    if (!printHtmlDocument(buildPackingSlipHtml(order))) {
      toast.error('Unable to prepare the packing slip for printing.');
    }
  };

  const handleAssignOrder = async (order: OrderRecord, nextAssignedToId: string): Promise<void> => {
    try {
      await adminService.updateOrder(order.id, { assignedToId: nextAssignedToId || null });
      toast.success(nextAssignedToId ? 'Order assigned' : 'Order unassigned');
      await refreshAdminOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update the order assignment right now.'));
    }
  };

  const handleApplyBulkStatus = async (): Promise<void> => {
    if (selectedOrders.length === 0) {
      return;
    }

    const sharedTrackingNumber = bulkTrackingNumber.trim();
    if (bulkStatus === 'shipped' && selectedOrders.some((order) => !(sharedTrackingNumber || order.trackingNumber))) {
      toast.error('Add a shared tracking number or ship only orders that already have one.');
      return;
    }

    setIsApplyingBulkUpdate(true);
    try {
      const results = await Promise.allSettled(
        selectedOrders.map((order) =>
          adminService.updateOrder(order.id, {
            status: bulkStatus,
            trackingNumber: bulkStatus === 'shipped' ? sharedTrackingNumber || order.trackingNumber : undefined,
            reason: bulkNote.trim() || undefined
          })
        )
      );

      const failedOrderIds = selectedOrders
        .filter((_, index) => results[index]?.status === 'rejected')
        .map((order) => order.id);
      const successCount = results.length - failedOrderIds.length;

      if (successCount > 0) {
        toast.success(
          `${successCount} order${successCount === 1 ? '' : 's'} updated to ${bulkStatus}${failedOrderIds.length ? ` (${failedOrderIds.length} failed)` : ''}`
        );
      }

      if (failedOrderIds.length > 0) {
        const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (successCount === 0) {
          toast.error(getApiErrorMessage(firstFailure?.reason, 'Unable to update these orders right now.'));
        }
        setSelectedOrderIds(failedOrderIds);
      } else {
        setSelectedOrderIds([]);
        setBulkNote('');
        setBulkTrackingNumber('');
      }

      if (successCount > 0) {
        await refreshAdminOrders();
      }
    } finally {
      setIsApplyingBulkUpdate(false);
    }
  };

  const handleSendShippingNotification = async (order: OrderRecord): Promise<void> => {
    try {
      await adminService.sendOrderShippingNotification(order.id);
      toast.success('Shipping notification sent');
      await refreshAdminOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to send the shipping notification right now.'));
    }
  };

  const handleMergeSelectedOrders = async (): Promise<void> => {
    if (!mergePreview.enabled || !mergePreview.keepOrder || !mergePreview.mergeOrder) {
      toast.error(mergePreview.message);
      return;
    }

    const confirmed = window.confirm(
      `Merge ${mergePreview.mergeOrder.orderNumber} into ${mergePreview.keepOrder.orderNumber}? The newer order will be hidden from the admin list afterward.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await adminService.mergeOrders({
        keepOrderId: mergePreview.keepOrder.id,
        mergeOrderId: mergePreview.mergeOrder.id
      });
      toast.success(`Merged into ${mergePreview.keepOrder.orderNumber}`);
      setSelectedOrderIds([mergePreview.keepOrder.id]);
      await refreshAdminOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to merge these orders right now.'));
    }
  };

  const updateManualOrderAddress = (field: keyof ManualOrderFormState['shippingAddress'], value: string): void => {
    setManualOrderForm((current) => ({
      ...current,
      shippingAddress: {
        ...current.shippingAddress,
        [field]: value
      }
    }));
  };

  const updateManualOrderItem = (index: number, updates: Partial<ManualOrderItemForm>): void => {
    setManualOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item))
    }));
  };

  const handleManualOrderProductChange = (index: number, productId: string): void => {
    const product = manualProductsById.get(productId);
    const defaultVariantIndex = product?.productType !== 'bundle' && (product?.variants?.length ?? 0) > 0 ? '0' : '';
    updateManualOrderItem(index, {
      productId,
      variantIndex: defaultVariantIndex
    });
  };

  const handleManualCustomerSelect = (customerId: string): void => {
    const customer = customerOptions.find((entry) => entry.id === customerId);
    setManualOrderForm((current) => ({
      ...current,
      customerId,
      customerName: customer?.name ?? current.customerName,
      customerEmail: customer?.email ?? current.customerEmail,
      customerPhone: customer?.phone ?? current.customerPhone,
      shippingAddress: {
        ...current.shippingAddress,
        fullName: customer?.name ?? current.shippingAddress.fullName,
        phone: customer?.phone ?? current.shippingAddress.phone
      }
    }));
  };

  const readManualAmount = (label: string, value: string): number | undefined => {
    if (!value.trim()) {
      return undefined;
    }

    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(`${label} must be a valid amount.`);
      return Number.NaN;
    }

    return amount;
  };

  const handleCreateManualOrder = async (): Promise<void> => {
    const customerName = manualOrderForm.customerName.trim();
    const customerEmail = manualOrderForm.customerEmail.trim();
    const customerPhone = manualOrderForm.customerPhone.trim();

    if (!customerName || !customerEmail) {
      toast.error('Add the customer name and email before creating the order.');
      return;
    }

    const items = manualOrderForm.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      variantIndex: item.variantIndex.trim() ? Number(item.variantIndex) : undefined
    }));

    if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      toast.error('Choose a product and quantity for every manual order item.');
      return;
    }

    const missingVariant = items.some((item) => {
      const product = manualProductsById.get(item.productId);
      return product?.productType !== 'bundle' && (product?.variants?.length ?? 0) > 0 && item.variantIndex === undefined;
    });
    if (missingVariant) {
      toast.error('Choose a variant for each variant-based product.');
      return;
    }

    if (manualOrderForm.type === 'delivery') {
      const address = manualOrderForm.shippingAddress;
      if (!address.fullName.trim() || !address.phone.trim() || !address.line1.trim() || !address.city.trim() || !address.district.trim() || !address.postalCode.trim()) {
        toast.error('Complete the delivery address before creating the order.');
        return;
      }
    }

    if (manualOrderForm.status === 'shipped' && !manualOrderForm.trackingNumber.trim()) {
      toast.error('Add a tracking number before creating a shipped order.');
      return;
    }

    const shippingFee = readManualAmount('Shipping fee', manualOrderForm.shippingFee);
    if (Number.isNaN(shippingFee)) {
      return;
    }
    const discount = readManualAmount('Discount', manualOrderForm.discount);
    if (Number.isNaN(discount)) {
      return;
    }

    setIsCreatingManualOrder(true);
    try {
      await adminService.createOrder({
        customerId: manualOrderForm.customerId || undefined,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        items,
        paymentMethod: manualOrderForm.paymentMethod,
        type: manualOrderForm.type,
        paymentStatus: manualOrderForm.paymentStatus,
        status: manualOrderForm.status,
        trackingNumber: manualOrderForm.trackingNumber.trim() || undefined,
        assignedToId: manualOrderForm.assignedToId || undefined,
        shippingFee,
        discount,
        notes: manualOrderForm.notes.trim() || undefined,
        deliveryNotes: manualOrderForm.type === 'delivery' ? manualOrderForm.deliveryNotes.trim() || undefined : undefined,
        pickupSlot: manualOrderForm.type === 'pickup' ? manualOrderForm.pickupSlot.trim() || undefined : undefined,
        shippingAddress:
          manualOrderForm.type === 'delivery'
            ? {
                label: manualOrderForm.shippingAddress.label.trim() || 'Delivery',
                fullName: manualOrderForm.shippingAddress.fullName.trim(),
                phone: manualOrderForm.shippingAddress.phone.trim(),
                line1: manualOrderForm.shippingAddress.line1.trim(),
                line2: manualOrderForm.shippingAddress.line2.trim() || undefined,
                city: manualOrderForm.shippingAddress.city.trim(),
                district: manualOrderForm.shippingAddress.district.trim(),
                postalCode: manualOrderForm.shippingAddress.postalCode.trim(),
                country: manualOrderForm.shippingAddress.country.trim() || 'Sri Lanka'
              }
            : undefined
      });
      toast.success('Manual order created');
      setManualOrderForm(createManualOrderForm());
      setIsManualOrderOpen(false);
      await refreshAdminOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create the manual order right now.'));
    } finally {
      setIsCreatingManualOrder(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Operations"
        title="Orders"
        description="Review customer orders, payment proof, fulfilment details, and operational hand-offs in one workspace."
        action={
          <div className="flex flex-wrap gap-2">
            {canWriteOrders ? (
              <Button type="button" onClick={() => setIsManualOrderOpen(true)}>
                Add Order
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const blob = await adminService.exportOrders();
                downloadBlob(blob, 'njstore-orders.csv');
              }}
            >
              Export CSV
            </Button>
          </div>
        }
        meta={[
          {
            label: 'Loaded orders',
            value: orderItems.length.toLocaleString(),
            support: `Showing page ${currentOrderPage} of ${orderTotalPages} from the admin orders query.`,
            tone: 'blue'
          },
          {
            label: 'Receipt review',
            value: orderSummaryCards.find((card) => card.key === 'payment_review')?.count.toLocaleString() ?? '0',
            support: 'Uploaded payment proof that still needs admin review.',
            tone: 'gold'
          }
        ]}
      />
      <AdminStatGrid
        className="xl:grid-cols-5"
        items={orderSummaryCards.map((card) => ({
          label: card.title,
          value: card.count.toLocaleString(),
          support: card.support,
          tone:
            card.key === 'payment_review'
              ? 'gold'
              : card.key === 'active_fulfilment'
                ? 'blue'
                : card.key === 'delivered'
                  ? 'emerald'
                  : card.key === 'cancelled'
                    ? 'rose'
                    : 'slate',
          active: quickFilter === card.key,
          onClick: () => setQuickFilter(card.key)
        }))}
      />
      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(220px,0.45fr)_minmax(220px,0.45fr)_minmax(220px,0.42fr)]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by order number, customer, status, fulfilment, payment, or tracking"
            label="Search orders"
            resultCount={filteredOrders.length}
            totalCount={orderTotalCount}
          />
          <Card className="rounded-[24px] p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Order status</p>
            <select
              aria-label="Filter by order status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Card>
          <Card className="rounded-[24px] p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Payment state</p>
            <select
              aria-label="Filter by payment status"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as PaymentStatusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">All payment states</option>
              <option value="unpaid">Unpaid</option>
              <option value="receipt_uploaded">Receipt uploaded</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </Card>
          <Card className="rounded-[24px] p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Current view</p>
            <p className="mt-2.5 text-sm font-medium text-white">{getQuickFilterLabel(quickFilter)}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'} are loaded on this page. {orderTotalCount.toLocaleString()} match the
              current server-side filters overall.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setQuickFilter('all');
                setStatusFilter('all');
                setPaymentFilter('all');
                setSearchTerm('');
              }}
            >
              Clear filters
            </Button>
          </Card>
        </div>
      </AdminControlPanel>

      {selectedOrderCount > 0 && canWriteOrders ? (
        <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">{selectedOrderCount} selected</p>
              <p className="text-xs text-gray-500">Apply one status update across the current selection with an optional internal note.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const visibleOrderIds = filteredOrders.map((order) => order.id);
                  setSelectedOrderIds((current) =>
                    allVisibleSelected
                      ? current.filter((orderId) => !visibleOrderIds.includes(orderId))
                      : Array.from(new Set([...current, ...visibleOrderIds]))
                  );
                }}
              >
                {allVisibleSelected ? 'Clear visible' : `Select visible (${filteredOrders.length})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedOrderIds([])}>
                Clear selection
              </Button>
            </div>
          </div>
          <div className={`grid gap-3 ${bulkStatus === 'shipped' ? 'xl:grid-cols-[minmax(180px,0.45fr)_minmax(260px,1fr)_minmax(220px,0.75fr)_auto]' : 'xl:grid-cols-[minmax(180px,0.45fr)_minmax(260px,1fr)_auto]'}`}>
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-gold">Next status</span>
              <select
                aria-label="Bulk order status"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as BulkStatusValue)}
                className={compactFieldClassName}
              >
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-gold">Timeline note</span>
              <input
                aria-label="Bulk update note"
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder="Optional note saved to each order timeline"
                className={compactFieldClassName}
              />
            </label>
            {bulkStatus === 'shipped' ? (
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-gold">Shared tracking</span>
                <input
                  aria-label="Bulk tracking number"
                  value={bulkTrackingNumber}
                  onChange={(event) => setBulkTrackingNumber(event.target.value)}
                  placeholder="Applies when selected orders do not already have tracking"
                  className={compactFieldClassName}
                />
              </label>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                isLoading={isApplyingBulkUpdate}
                loadingLabel="Applying..."
                onClick={() => {
                  void handleApplyBulkStatus();
                }}
              >
                Apply bulk update
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Order merge</p>
              <p className="mt-1 text-sm text-gray-300">{mergePreview.message}</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!mergePreview.enabled}
              onClick={() => {
                void handleMergeSelectedOrders();
              }}
            >
              Merge selected orders
            </Button>
          </div>
        </div>
      ) : null}

      <AdminDataGrid
        headers={['', 'Order & Customer', 'Fulfilment & Status', 'Payment & Receipts', 'Total', 'Actions']}
        gridClassName={ordersTableGridClass}
        hasRows={filteredOrders.length > 0}
        emptyMessage="No orders matched that search."
      >
        {filteredOrders.map((order) => {
          const isCancelled = order.status === 'cancelled';
          const receipts = order.receipts ?? [];
          const hasReceipts = receipts.length > 0;
          const isPaid = order.paymentStatus === 'paid';
          const isCashOnDelivery = order.paymentMethod === 'cash_on_delivery';
          const slaStatus = getSlaStatus(order);

          return (
            <div key={order.id} className={`${ordersTableGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
              {/* Bulk select checkbox */}
              <div className="pt-1">
                <input
                  type="checkbox"
                  aria-label={`Select order ${order.orderNumber}`}
                  className="h-4 w-4 rounded border-white/20 bg-dark-light text-gold accent-gold focus:ring-gold/30"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={(event) => {
                    setSelectedOrderIds((current) => {
                      if (event.target.checked) {
                        return current.includes(order.id) ? current : [...current, order.id];
                      }

                      return current.filter((orderId) => orderId !== order.id);
                    });
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{order.orderNumber}</p>
                <p className="text-sm text-gray-300">{order.customer?.name ?? 'Customer unavailable'}</p>
                <p className="text-xs text-gray-500">{order.customer?.email ?? 'No customer email available'}</p>
                {slaStatus !== 'ok' ? (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                    slaStatus === 'overdue'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}>
                    {`${order.status === 'processing' ? 'In processing' : 'In pending'} for ${formatStatusAge(order)}${slaStatus === 'overdue' ? ' overdue' : ''}`}
                  </span>
                ) : null}
              </div>
              <div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={order.type === 'delivery' ? 'info' : 'default'} className="capitalize">
                      {formatFulfilmentType(order.type)}
                    </Badge>
                    <Badge variant={getOrderStatusVariant(order.status)} className="capitalize">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.shippingAddress?.label
                      ? `${order.shippingAddress.label} • ${order.shippingAddress.city}`
                      : order.pickupSlot
                        ? `Pickup slot: ${order.pickupSlot}`
                        : order.type === 'pickup'
                          ? 'Store pickup'
                          : 'Address not assigned'}
                  </p>
                  <p className="text-xs text-gray-500">{order.trackingNumber ? `Tracking ${order.trackingNumber}` : 'No tracking yet'}</p>
                  <p className="text-xs text-gray-500">
                    {order.assignedTo ? `Assigned to ${order.assignedTo.name}` : 'Unassigned'}
                  </p>
                  {canWriteOrders ? (
                    <label className="block">
                      <span className="sr-only">Assign staff for {order.orderNumber}</span>
                      <select
                        aria-label={`Assign staff for ${order.orderNumber}`}
                        value={order.assignedTo?.id ?? ''}
                        disabled={userDirectory.isLoading || staffOptions.length === 0}
                        onChange={(event) => {
                          void handleAssignOrder(order, event.target.value);
                        }}
                        className={`${compactFieldClassName} h-9 px-3 text-xs`}
                      >
                        <option value="">{userDirectory.isLoading ? 'Loading staff...' : 'Unassigned'}</option>
                        {staffOptions.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getPaymentStatusVariant(order.paymentStatus)} className="capitalize">
                    {order.paymentStatus.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {isCashOnDelivery
                      ? 'Cash on Delivery'
                      : hasReceipts
                        ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`
                        : 'No receipts'}
                  </span>
                </div>
                {hasReceipts ? (
                  <div className="flex flex-wrap gap-2">
                    {receipts.map((receipt, index) => (
                      <Button
                        key={receipt.id}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs font-medium text-gold hover:text-gold-light"
                        isLoading={activeReceiptAction === `${order.id}:${receipt.id}`}
                        loadingLabel="Opening..."
                        onClick={() => {
                          void openReceiptPreview(order.id, receipt.id);
                        }}
                      >
                        View {receipts.length > 1 ? `#${index + 1}` : 'receipt'}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <p className="font-medium text-white">{formatCurrency(order.total)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-w-[112px] justify-center"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-w-[112px] justify-center"
                    onClick={() => printPackingSlip(order)}
                  >
                    Packing Slip
                  </Button>
                  {canWriteOrders && !isCancelled && !isPaid ? (
                    <Button
                      size="sm"
                      className="min-w-[108px] justify-center"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          hasReceipts
                            ? `Mark ${order.orderNumber} as paid after reviewing the uploaded receipt?`
                            : `Mark ${order.orderNumber} as paid without an uploaded receipt? Use this only when payment was received physically in store.`
                        );
                        if (!confirmed) {
                          return;
                        }

                        try {
                          await adminService.updateOrder(order.id, { paymentStatus: 'paid' });
                          toast.success('Order marked as paid');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to update this order right now.'));
                        }
                      }}
                    >
                      Mark Paid
                    </Button>
                  ) : null}
                  {canWriteOrders && !isCancelled && isCashOnDelivery && order.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-w-[128px] justify-center"
                      onClick={async () => {
                        try {
                          await adminService.updateOrder(order.id, { status: 'processing' });
                          toast.success('COD order moved to processing');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to move this COD order to processing right now.'));
                        }
                      }}
                    >
                      Process COD
                    </Button>
                  ) : null}
                  {canWriteOrders && !isCancelled && order.status === 'processing' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-w-[84px] justify-center"
                      onClick={async () => {
                        const trackingNumber = window.prompt('Enter tracking number');
                        if (!trackingNumber) {
                          return;
                        }
                        try {
                          await adminService.updateOrder(order.id, { status: 'shipped', trackingNumber });
                          toast.success('Order marked as shipped');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to mark this order as shipped right now.'));
                        }
                      }}
                    >
                      Ship
                    </Button>
                  ) : null}
                  {canWriteOrders && !isCancelled && order.status === 'shipped' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-w-[84px] justify-center"
                      onClick={async () => {
                        try {
                          await adminService.updateOrder(order.id, { status: 'delivered' });
                          toast.success('Order marked as delivered');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to mark this order as delivered right now.'));
                        }
                      }}
                    >
                      Deliver
                    </Button>
                  ) : null}
                  {canWriteOrders && order.type === 'delivery' && order.status === 'shipped' && order.customer?.email ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-w-[156px] justify-center"
                      onClick={() => {
                        void handleSendShippingNotification(order);
                      }}
                    >
                      Send Shipping Email
                    </Button>
                  ) : null}
                  {canWriteOrders && !isCancelled && order.paymentStatus === 'receipt_uploaded' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      className="min-w-[124px] justify-center"
                      onClick={async () => {
                        const reason = window.prompt('Enter rejection reason');
                        if (!reason) {
                          return;
                        }
                        try {
                          await adminService.updateOrder(order.id, { paymentStatus: 'rejected', reason });
                          toast.success('Receipt rejected');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to reject this receipt right now.'));
                        }
                      }}
                    >
                      Reject Receipt
                    </Button>
                  ) : null}
                  {canDeleteOrders ? (
                    <Button
                      size="sm"
                      variant="danger"
                      className="min-w-[96px] justify-center"
                      onClick={async () => {
                        if (!window.confirm(`Delete order ${order.orderNumber}?`)) {
                          return;
                        }
                        try {
                          await adminService.deleteOrder(order.id);
                          toast.success('Order deleted');
                          await refreshAdminOrders();
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, 'Unable to delete this order right now.'));
                        }
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                {!canWriteOrders && !canDeleteOrders ? <p className="text-xs text-gray-500">Read-only access</p> : null}
                {canWriteOrders && isCancelled ? <p className="text-xs text-gray-500">Cancelled orders are locked for status and payment updates.</p> : null}
                {canWriteOrders && !isCancelled && !hasReceipts && !isPaid && !isCashOnDelivery ? (
                  <p className="text-xs text-gray-500">No receipt uploaded. You can still mark paid after receiving payment physically in store.</p>
                ) : null}
                {canWriteOrders && !isCancelled && !isPaid && isCashOnDelivery ? (
                  <p className="text-xs text-gray-500">COD order: you can process and ship before payment, then mark paid after collection.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </AdminDataGrid>
      {orderTotalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {currentOrderPage} of {orderTotalPages} · {orderPageStart}-{orderPageEnd} of {orderTotalCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentOrderPage <= 1 || orders.isFetching}
              onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentOrderPage >= orderTotalPages || orders.isFetching}
              onClick={() => setOrderPage((page) => Math.min(orderTotalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
      <ManualOrderModal
        isOpen={isManualOrderOpen}
        isCreatingManualOrder={isCreatingManualOrder}
        manualOrderForm={manualOrderForm}
        setManualOrderForm={setManualOrderForm}
        customerOptions={customerOptions}
        staffOptions={staffOptions}
        manualProductOptions={manualProductOptions}
        manualProductsById={manualProductsById}
        isManualOrderProductsLoading={manualOrderProducts.isLoading}
        manualOrderPreview={manualOrderPreview}
        onClose={() => setIsManualOrderOpen(false)}
        onSubmit={() => void handleCreateManualOrder()}
        onManualCustomerSelect={handleManualCustomerSelect}
        onManualOrderProductChange={handleManualOrderProductChange}
        onUpdateManualOrderItem={updateManualOrderItem}
        onUpdateManualOrderAddress={updateManualOrderAddress}
      />
      <OrderReceiptPreviewModal receiptPreview={receiptPreview} onClose={() => setReceiptPreview(null)} />
      <OrderDetailModal
        selectedOrder={selectedOrder}
        canWriteOrders={canWriteOrders}
        activeReceiptAction={activeReceiptAction}
        onClose={() => setSelectedOrder(null)}
        onOpenReceiptPreview={(orderId, receiptId) => {
          void openReceiptPreview(orderId, receiptId);
        }}
        onSendShippingNotification={(order) => {
          void handleSendShippingNotification(order);
        }}
        onPrintPackingSlip={printPackingSlip}
      />
    </div>
  );
};
