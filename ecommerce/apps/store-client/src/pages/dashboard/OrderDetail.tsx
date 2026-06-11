import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Input, Modal, ProgressStepper, SectionHeading, Textarea } from '@njstore/ui';
import { buildTrackingUrl, downloadUrl } from '@njstore/utils/browserActions';
import type { OrderDto, ReturnRequestDto } from '@njstore/types';
import { Banknote, Eye, FileText, Gift, Trash2, UploadCloud, CreditCard, Store, Truck } from 'lucide-react';
import { analytics } from '../../analytics/analytics';
import { useAuth } from '../../context/AuthContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { orderService } from '../../services/orderService';
import { siteConfigService } from '../../services/siteConfigService';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { BankTransferDetailsPanel } from '../../components/payment/BankTransferDetailsPanel';

interface ReceiptPreviewState {
  url: string;
  filename: string;
  mimeType: string;
}

const ORDER_STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const orderStepIndex = (status: OrderDto['status']): number => {
  switch (status) {
    case 'pending': return 0;
    case 'processing': return 1;
    case 'shipped': return 2;
    case 'delivered': return 3;
    default: return 0;
  }
};

const calculateShippingPreview = (
  city: string | undefined,
  subtotal: number,
  config: {
    freeShippingThreshold: number;
    shippingRates: Array<{ city: string; fee: number; days: string }>;
  } | undefined
): { fee: number; days: string; label: string } => {
  if (!config) {
    return { fee: 0, days: '0', label: 'Loading shipping rates' };
  }

  if (subtotal >= config.freeShippingThreshold) {
    return { fee: 0, days: '3-5', label: 'Free Shipping' };
  }

  const rate =
    config.shippingRates.find((entry) => entry.city.toLowerCase() === (city ?? '').toLowerCase()) ??
    config.shippingRates.find((entry) => entry.city === 'default');

  return {
    fee: rate?.fee ?? 600,
    days: rate?.days ?? '4-6',
    label: `Standard Delivery (${rate?.days ?? '4-6'} days)`
  };
};

const receiptStatusLabel = (paymentStatus: OrderDto['paymentStatus']): string => {
  if (paymentStatus === 'paid') {
    return 'Receipts are locked because payment has been confirmed.';
  }

  if (paymentStatus === 'receipt_uploaded') {
    return 'You can still upload more receipts or remove existing ones until admin marks the order as paid.';
  }

  if (paymentStatus === 'rejected') {
    return 'Your previous receipt was rejected. Remove it or upload updated payment proof.';
  }

  return 'You can upload one or many receipts. You can remove them until payment is confirmed.';
};

const paymentMethodLabel = (paymentMethod: OrderDto['paymentMethod']): string =>
  paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer';

export const DashboardOrderDetail = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, addresses, refreshSession } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const returnEvidenceInputRef = useRef<HTMLInputElement | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [returnEvidenceFiles, setReturnEvidenceFiles] = useState<File[]>([]);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewState | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingFulfilmentType, setPendingFulfilmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<'bank_transfer' | 'cash_on_delivery'>('bank_transfer');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedReturnSkus, setSelectedReturnSkus] = useState<string[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnRefundMode, setReturnRefundMode] = useState<'amount' | 'percent'>('amount');
  const [returnRefundAmount, setReturnRefundAmount] = useState('');
  const [returnRefundPercent, setReturnRefundPercent] = useState('100');
  const order = useQuery({
    queryKey: ['dashboard', 'order', id],
    queryFn: () => orderService.detail(id ?? ''),
    refetchInterval: (query) => {
      const nextDetail = query.state.data?.data;
      if (!nextDetail) {
        return 30_000;
      }

      const shouldKeepRefreshing =
        nextDetail.isQuotation ||
        nextDetail.status === 'pending' ||
        nextDetail.status === 'processing' ||
        nextDetail.paymentStatus === 'receipt_uploaded';

      return shouldKeepRefreshing ? 30_000 : false;
    }
  });
  const siteConfig = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get()
  });
  const returnRequestsQuery = useQuery({
    queryKey: ['dashboard', 'order-returns', id],
    queryFn: () => orderService.listReturnRequests(id ?? ''),
    enabled: Boolean(id)
  });

  useEffect(() => {
    if (!receiptPreview) {
      return;
    }

    return () => {
      window.URL.revokeObjectURL(receiptPreview.url);
    };
  }, [receiptPreview]);

  const invalidateOrderQueries = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'order', id] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'order-returns', id] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    ]);
  };

  const detail = order.data?.data;

  useEffect(() => {
    if (!detail?.isQuotation || detail.fulfilmentConfigured !== false) {
      return;
    }

    setPendingFulfilmentType('delivery');
    setSelectedAddressId(addresses[0]?._id ?? '');
    setPickupSlot('');
    setDeliveryNotes('');
  }, [addresses, detail?.fulfilmentConfigured, detail?.id, detail?.isQuotation]);

  useEffect(() => {
    if (!detail?.isQuotation) {
      return;
    }

    setPendingPaymentMethod(detail.paymentMethod ?? 'bank_transfer');
    setLoyaltyPointsToRedeem(detail.loyaltyPointsRedeemed ?? 0);
  }, [detail?.id, detail?.isQuotation, detail?.loyaltyPointsRedeemed, detail?.paymentMethod]);

  useEffect(() => {
    if (pendingFulfilmentType === 'delivery' && !selectedAddressId && addresses[0]?._id) {
      setSelectedAddressId(addresses[0]._id);
    }
  }, [addresses, pendingFulfilmentType, selectedAddressId]);

  useEffect(() => {
    if (pendingFulfilmentType === 'pickup' && pendingPaymentMethod === 'cash_on_delivery') {
      setPendingPaymentMethod('bank_transfer');
    }
  }, [pendingFulfilmentType, pendingPaymentMethod]);

  useEffect(() => {
    if (siteConfig.data?.cashOnDeliveryEnabled === false && pendingPaymentMethod === 'cash_on_delivery') {
      setPendingPaymentMethod('bank_transfer');
    }
  }, [pendingPaymentMethod, siteConfig.data?.cashOnDeliveryEnabled]);

  const requiresFulfilmentSelection = detail?.isQuotation && detail.fulfilmentConfigured === false;
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);
  const shippingPreview = useMemo(
    () =>
      pendingFulfilmentType === 'delivery'
        ? calculateShippingPreview(selectedAddress?.city, detail?.subtotal ?? 0, siteConfig.data)
        : { fee: 0, days: '0', label: 'Store Pickup' },
    [detail?.subtotal, pendingFulfilmentType, selectedAddress?.city, siteConfig.data]
  );
  const confirmationShippingFee = detail
    ? requiresFulfilmentSelection
      ? shippingPreview.fee
      : detail.shippingFee
    : 0;
  const availableLoyaltyPoints = Math.max(0, Math.trunc(Number(user?.loyaltyPoints ?? 0) || 0));
  const maxLoyaltyPoints = Math.min(
    availableLoyaltyPoints,
    Math.floor(Math.max((detail?.subtotal ?? 0) + confirmationShippingFee - (detail?.discount ?? 0), 0))
  );
  const requestedLoyaltyPoints = Math.max(0, Math.trunc(Number(loyaltyPointsToRedeem) || 0));
  const loyaltyDiscount = Math.min(requestedLoyaltyPoints, maxLoyaltyPoints);
  const canConfirmQuotation =
    !requiresFulfilmentSelection ||
    pendingFulfilmentType === 'pickup' ||
    Boolean(selectedAddressId && selectedAddress);
  const isCashOnDeliveryEnabled = siteConfig.data?.cashOnDeliveryEnabled !== false;
  const isCashOnDeliveryAvailable = pendingFulfilmentType === 'delivery' && isCashOnDeliveryEnabled;
  const effectivePaymentMethod = pendingFulfilmentType === 'pickup' || !isCashOnDeliveryEnabled ? 'bank_transfer' : pendingPaymentMethod;
  const bankTransferDetails = siteConfig.data?.bankTransferDetails;

  useEffect(() => {
    if (requestedLoyaltyPoints > maxLoyaltyPoints) {
      setLoyaltyPointsToRedeem(maxLoyaltyPoints);
    }
  }, [maxLoyaltyPoints, requestedLoyaltyPoints]);

  if (!detail) {
    return <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-10 text-sm text-gray-400">Loading order...</div>;
  }

  const receipts = detail.receipts ?? [];
  const returnRequests = Array.isArray(returnRequestsQuery.data?.data) ? returnRequestsQuery.data.data : [];
  const isCancelled = detail.status === 'cancelled';
  const isPaid = detail.paymentStatus === 'paid';
  const usesBankTransfer = detail.paymentMethod === 'bank_transfer';
  const canEditReceipts = usesBankTransfer && !detail.isQuotation && !isCancelled && !isPaid;
  const showInvoiceAction = !detail.isQuotation && !isCancelled && isPaid && Boolean(detail.invoicePdf);
  const hasActiveReturnRequest = returnRequests.some((request) => ['pending', 'approved'].includes(request.status));
  const canRequestReturn = detail.status === 'delivered' && isPaid && !detail.isQuotation && !isCancelled && !hasActiveReturnRequest;
  const selectedReturnItems = detail.items
    .filter((item) => selectedReturnSkus.includes(item.sku))
    .map((item) => ({
      sku: item.sku,
      quantity: Math.max(1, Math.min(item.quantity, Math.trunc(Number(returnQuantities[item.sku]) || item.quantity)))
    }));
  const selectedReturnSubtotal = selectedReturnItems.reduce((sum, selectedItem) => {
    const orderItem = detail.items.find((item) => item.sku === selectedItem.sku);
    return sum + (orderItem?.price ?? 0) * selectedItem.quantity;
  }, 0);

  const resetReturnForm = (): void => {
    setReturnReason('');
    setSelectedReturnSkus([]);
    setReturnQuantities({});
    setReturnRefundMode('amount');
    setReturnRefundAmount('');
    setReturnRefundPercent('100');
    setReturnEvidenceFiles([]);
    if (returnEvidenceInputRef.current) {
      returnEvidenceInputRef.current.value = '';
    }
  };

  const openReturnModal = (): void => {
    setSelectedReturnSkus(detail.items.map((item) => item.sku));
    setReturnQuantities(Object.fromEntries(detail.items.map((item) => [item.sku, String(item.quantity)])));
    setReturnRefundMode('amount');
    setReturnRefundAmount(String(detail.items.reduce((sum, item) => sum + item.price * item.quantity, 0)));
    setReturnRefundPercent('100');
    setReturnEvidenceFiles([]);
    setIsReturnModalOpen(true);
  };

  const renderReturnStatusCopy = (request: ReturnRequestDto): string => {
    if (request.status === 'pending') {
      return 'Your request is waiting for admin review.';
    }
    if (request.status === 'approved') {
      return 'Your request has been approved and is waiting for refund completion.';
    }
    if (request.status === 'rejected') {
      return 'This request was rejected. Review the admin note below before submitting another request.';
    }

    return 'Refund completed.';
  };

  return (
    <div className="space-y-6">
      <SectionHeading title={detail.orderNumber} description={detail.isQuotation ? 'Quotation awaiting confirmation' : 'Detailed order timeline and payment status'} />
      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        {/* Order Progress Bar — only for non-quotation, non-cancelled orders */}
        {!detail.isQuotation && detail.status !== 'cancelled' ? (
          <div className="mb-6">
            <ProgressStepper steps={ORDER_STEPS} currentStep={orderStepIndex(detail.status)} />
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-400">Status</p>
            <p className="text-lg capitalize text-white">{detail.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Payment</p>
            <p className="text-lg text-white">{paymentMethodLabel(detail.paymentMethod)}</p>
            <p className="mt-1 text-sm capitalize text-gray-400">{detail.paymentStatus.replaceAll('_', ' ')}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-gray-300">
            <p className="font-medium text-white">Fulfilment</p>
            {requiresFulfilmentSelection ? (
              <>
                <p className="mt-2">Delivery or store pickup will be selected before you confirm this quotation.</p>
                <p className="mt-1 text-xs text-gray-500">We’ll recalculate the final shipping fee and timeline after you choose the fulfilment option below.</p>
              </>
            ) : (
              <>
                <p className="mt-2">Mode: {detail.type}</p>
                {detail.shippingAddress ? <p className="mt-1">{detail.shippingAddress.line1}, {detail.shippingAddress.city}</p> : null}
                {detail.pickupSlot ? <p className="mt-1">Pickup Slot: {detail.pickupSlot}</p> : null}
                {detail.estimatedDeliveryDate ? <p className="mt-1">Estimated Delivery: {new Date(detail.estimatedDeliveryDate).toLocaleDateString()}</p> : null}
                {detail.trackingNumber ? (
                  <p className="mt-1">
                    Tracking: <a href={buildTrackingUrl(detail.trackingNumber)} target="_blank" rel="noreferrer" className="text-gold hover:underline">{detail.trackingNumber}</a>
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-gray-300">
            <p className="font-medium text-white">Totals</p>
            <p className="mt-2">Subtotal: {formatCurrency(detail.subtotal)}</p>
            <p className="mt-1">Shipping: {formatCurrency(detail.shippingFee)}</p>
            <p className="mt-1">Discount: {formatCurrency(detail.discount)}</p>
            {detail.loyaltyDiscount > 0 ? (
              <p className="mt-1">Loyalty points: -{formatCurrency(detail.loyaltyDiscount)}</p>
            ) : null}
            {detail.taxAmount && detail.taxAmount > 0 ? (
              <p className="mt-1">
                {detail.taxLabel ?? 'Tax'}
                {detail.taxRate ? ` (${detail.taxRate}%)` : ''}: {formatCurrency(detail.taxAmount)}
              </p>
            ) : null}
            <p className="mt-1 text-white">Total: {formatCurrency(detail.total)}</p>
          </div>
        </div>
        {requiresFulfilmentSelection ? (
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5 text-sm text-gray-300">
            <div className="space-y-1">
              <p className="font-medium text-white">Choose fulfilment before confirmation</p>
              <p>Pick delivery or store pickup here. Your final total, delivery window, and invoice are recalculated when you confirm the quotation.</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Button
                type="button"
                variant={pendingFulfilmentType === 'delivery' ? 'primary' : 'secondary'}
                onClick={() => setPendingFulfilmentType('delivery')}
              >
                <Truck className="h-4 w-4" aria-hidden="true" />
                Delivery
              </Button>
              <Button
                type="button"
                variant={pendingFulfilmentType === 'pickup' ? 'primary' : 'secondary'}
                onClick={() => {
                  setPendingFulfilmentType('pickup');
                  setPendingPaymentMethod('bank_transfer');
                }}
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                Store Pickup
              </Button>
            </div>
            {pendingFulfilmentType === 'delivery' ? (
              <div className="mt-5 space-y-4">
                <label className="flex flex-col gap-2 text-sm text-gray-300">
                  <span>Select Address</span>
                  <select
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    disabled={!addresses.length}
                    value={selectedAddressId}
                    onChange={(event) => setSelectedAddressId(event.target.value)}
                  >
                    <option value="">
                      {addresses.length ? 'Select a saved address' : 'No saved addresses available'}
                    </option>
                    {addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {address.label} - {address.city}
                      </option>
                    ))}
                  </select>
                </label>
                {!addresses.length ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4">
                    <p className="text-sm font-medium text-white">Add a delivery address first</p>
                    <p className="mt-1 text-sm leading-6 text-gray-300">
                      Delivery needs a saved address so NJ Store can calculate shipping and prepare the final order correctly.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        navigate('/dashboard/profile?section=addresses');
                      }}
                    >
                      Manage Addresses
                    </Button>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-gray-300">
                  {selectedAddress ? (
                    <>
                      <p className="font-medium text-white">{shippingPreview.label}</p>
                      <p className="mt-1">Estimated shipping fee: {formatCurrency(shippingPreview.fee)}</p>
                      <p className="mt-1">Estimated business days: {shippingPreview.days}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-white">Select an address to continue</p>
                      <p className="mt-1">Choose a saved address so we can prepare the final delivery pricing during confirmation.</p>
                    </>
                  )}
                </div>
                <Textarea label="Delivery Notes" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <Input label="Preferred Pickup Slot" value={pickupSlot} onChange={(event) => setPickupSlot(event.target.value)} placeholder="2026-04-02 10:30" />
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-gray-300">
                  Store pickup skips shipping charges. Our team will confirm the collection timing after you place the order.
                </div>
              </div>
            )}
          </div>
        ) : null}
        {detail.isQuotation && !isCancelled ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
            <div className="space-y-1">
              <p className="font-medium text-white">Choose payment method before confirmation</p>
              <p>
                Payment is selected after the quotation is created. Cash on Delivery is only available for delivery orders; store pickup uses bank transfer.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Button
                type="button"
                variant={effectivePaymentMethod === 'bank_transfer' ? 'primary' : 'secondary'}
                onClick={() => setPendingPaymentMethod('bank_transfer')}
              >
                <Banknote className="h-4 w-4" aria-hidden="true" />
                Bank Transfer
              </Button>
              <Button
                type="button"
                variant={effectivePaymentMethod === 'cash_on_delivery' ? 'primary' : 'secondary'}
                disabled={!isCashOnDeliveryAvailable}
                onClick={() => {
                  if (!isCashOnDeliveryAvailable) {
                    return;
                  }

                  setPendingPaymentMethod('cash_on_delivery');
                }}
              >
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Cash on Delivery
              </Button>
            </div>
            {effectivePaymentMethod === 'bank_transfer' ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3">
                <p className="text-sm leading-6 text-gray-300">
                  Review the bank account before you confirm, then upload the receipt after the order is created.
                </p>
                <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => setIsBankDetailsOpen(true)}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  View bank details
                </Button>
              </div>
            ) : null}
            {!isCashOnDeliveryAvailable ? (
              <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm leading-6 text-gray-300">
                {isCashOnDeliveryEnabled
                  ? 'Cash on Delivery is disabled for store pickup because no courier delivery or doorstep payment is involved.'
                  : 'Cash on Delivery is currently disabled by the store.'}
              </p>
            ) : null}
          </div>
        ) : null}
        {detail.isQuotation && !isCancelled ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                  <Gift className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-white">Use loyalty points</p>
                  <p className="mt-1 text-sm leading-6 text-gray-300">
                    Points are deducted only when this quotation is confirmed as an order.
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm text-gold">{availableLoyaltyPoints} pts</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                type="number"
                min={0}
                max={maxLoyaltyPoints}
                label="Points to redeem"
                value={loyaltyPointsToRedeem}
                disabled={maxLoyaltyPoints <= 0}
                onChange={(event) => setLoyaltyPointsToRedeem(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={maxLoyaltyPoints <= 0}
                onClick={() => setLoyaltyPointsToRedeem(maxLoyaltyPoints)}
              >
                Use max
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {maxLoyaltyPoints > 0
                ? `You can use up to ${maxLoyaltyPoints} points on this order. Current loyalty value: ${formatCurrency(loyaltyDiscount)}.`
                : 'No loyalty points are available for this order yet.'}
            </p>
          </div>
        ) : null}
        <div className="mt-6 space-y-3">
          {detail.items.map((item) => (
            <div key={item.sku} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3.5 text-sm text-gray-300">
              <span>{item.name}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        {detail.receiptRejectionReason ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            Receipt rejected: {detail.receiptRejectionReason}
          </div>
        ) : null}
        {isCancelled ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-gray-300">
            <p className="font-medium text-white">This order is cancelled</p>
            <p className="mt-1">You can review the order details and download the quotation document, but no further order actions are available.</p>
          </div>
        ) : null}
        {detail.isQuotation && !user?.isEmailVerified && !isCancelled ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-gray-300">
            <p className="font-medium text-white">Verify your email before confirmation</p>
            <p className="mt-1">You can review and download this quotation now, but we’ll send you to security verification before we convert it into an order.</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-4"
              onClick={() => {
                navigate('/dashboard/security?section=verification');
              }}
            >
              Open Verification Step
            </Button>
          </div>
        ) : null}

        {!detail.isQuotation && usesBankTransfer ? (
          <div className="receipt-panel mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white text-sm text-slate-700 shadow-none dark:border-white/10 dark:bg-white/[0.045] dark:text-gray-300">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-white/10 sm:px-5">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="receipt-panel-title font-medium text-slate-900 dark:text-white">Bank Transfer Receipts</p>
                  <p className="receipt-panel-copy max-w-3xl text-xs leading-5 text-slate-600 dark:text-gray-400">{receiptStatusLabel(detail.paymentStatus)}</p>
                </div>
              </div>
              <Badge
                className={`receipt-panel-badge rounded-full px-2.5 py-0.5 text-xs ${
                  canEditReceipts && !isPaid ? 'receipt-panel-badge-warning !bg-amber-100 !text-amber-800 dark:!bg-amber-500/20 dark:!text-amber-200' : ''
                }`}
                variant={isPaid ? 'success' : canEditReceipts ? 'warning' : 'default'}
              >
                {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
              </Badge>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {receipts.length ? (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {receipts.map((receipt, index) => (
                    <div key={receipt.id} className="receipt-panel-card rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 shadow-none dark:border-white/10 dark:bg-black/10">
                      <div className="flex items-start gap-2.5">
                        <span className="receipt-panel-card-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-gold dark:border-white/10 dark:bg-white/8">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="receipt-panel-card-title text-sm font-medium text-slate-900 dark:text-white">Receipt {index + 1}</p>
                          <p className="receipt-panel-card-meta mt-0.5 text-xs leading-5 text-slate-500 dark:text-gray-500">
                            {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : 'Uploaded receipt'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 rounded-full"
                          isLoading={activeAction === `view:${receipt.id}`}
                          loadingLabel="Opening..."
                          onClick={async () => {
                            try {
                              setActiveAction(`view:${receipt.id}`);
                              const asset = await orderService.getReceiptAsset(detail.id, receipt.id);
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
                              setActiveAction(null);
                            }
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          View Receipt
                        </Button>
                        {canEditReceipts ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            className="gap-1.5 rounded-full"
                            isLoading={activeAction === `remove:${receipt.id}`}
                            loadingLabel="Removing..."
                            onClick={async () => {
                              if (!window.confirm('Remove this receipt from the order?')) {
                                return;
                              }

                              try {
                                setActiveAction(`remove:${receipt.id}`);
                                await orderService.removeReceipt(detail.id, receipt.id);
                                toast.success('Receipt removed');
                                await invalidateOrderQueries();
                              } catch {
                                toast.error('Unable to remove the receipt right now.');
                              } finally {
                                setActiveAction(null);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="receipt-panel-empty rounded-[18px] border border-dashed border-slate-300 bg-slate-100 px-4 py-5 text-center text-sm text-slate-600 dark:border-white/12 dark:bg-black/10 dark:text-gray-500">
                  No receipts uploaded yet.
                </div>
              )}

              {canEditReceipts ? (
                <div className="receipt-panel-upload rounded-[20px] border border-slate-200 bg-slate-100 p-3.5 dark:border-white/10 dark:bg-black/10 sm:p-4">
                  <input
                    ref={fileInputRef}
                    id="receipt-upload"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="sr-only"
                    onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))}
                  />
                  <label
                    className="receipt-panel-upload-dropzone flex cursor-pointer items-center gap-3 rounded-[16px] border border-dashed border-gold/35 bg-white px-4 py-4 text-left transition-colors hover:border-gold/60 hover:bg-amber-50 dark:bg-gold/8 dark:hover:bg-gold/12"
                    htmlFor="receipt-upload"
                  >
                    <span className="receipt-panel-upload-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-dark shadow-none">
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="receipt-panel-upload-title block text-sm font-medium text-slate-900 dark:text-white">Upload Receipts</span>
                      <span className="receipt-panel-upload-copy mt-0.5 block text-xs leading-5 text-slate-600 dark:text-gray-500">JPG, PNG, WEBP, or PDF. Multiple files supported.</span>
                    </span>
                    <span className="receipt-panel-upload-choice shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-none dark:bg-white dark:text-dark">Choose Files</span>
                  </label>

                  {receiptFiles.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-gray-500">Selected Files</p>
                      <div className="flex flex-wrap gap-2">
                        {receiptFiles.map((file) => (
                          <span key={`${file.name}-${file.lastModified}`} className="receipt-panel-file-pill inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                            <span className="truncate">{file.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="receipt-panel-upload-helper mt-2 text-xs text-slate-600 dark:text-gray-500">No file chosen yet.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full"
                      isLoading={activeAction === 'upload'}
                      loadingLabel="Uploading..."
                      onClick={async () => {
                        if (!receiptFiles.length) {
                          toast.error('Choose one or more receipt files first.');
                          return;
                        }

                        try {
                          setActiveAction('upload');
                          await orderService.uploadReceipts(detail.id, receiptFiles);
                          toast.success(receiptFiles.length > 1 ? 'Receipts uploaded' : 'Receipt uploaded');
                          setReceiptFiles([]);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                          await invalidateOrderQueries();
                        } catch {
                          toast.error('Unable to upload receipts right now.');
                        } finally {
                          setActiveAction(null);
                        }
                      }}
                    >
                      Upload {receiptFiles.length > 1 ? 'Receipts' : 'Receipt'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {detail.status === 'delivered' ? (
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5">
            <p className="font-medium text-white">Your order was delivered! 🎉</p>
            <p className="mt-1 text-sm text-gray-300">Share your experience and help other customers make informed decisions.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.items.map((item) => (
                <Button
                  key={item.sku}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/product/${item.slug ?? ''}#reviews`)}
                >
                  Review {item.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {(canRequestReturn || returnRequests.length) ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-white">Return & Refund</p>
                <p className="mt-1 text-sm leading-6 text-gray-300">
                  Submit a return request after a paid order is delivered. Admin will review it before the refund is completed.
                </p>
              </div>
              {canRequestReturn ? (
                <Button type="button" size="sm" onClick={openReturnModal}>
                  Request Return
                </Button>
              ) : null}
            </div>

            {returnRequests.length ? (
              <div className="mt-4 space-y-3">
                {returnRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-white/10 bg-dark-light/20 p-4 text-sm text-gray-300">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-white">Return request</p>
                        <Badge variant={request.status === 'rejected' ? 'danger' : request.status === 'refunded' ? 'success' : request.status === 'pending' ? 'warning' : 'default'}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                        {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-3">{request.reason}</p>
                    <p className="mt-3 text-gray-400">{renderReturnStatusCopy(request)}</p>
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Requested refund</p>
                      <p className="mt-2 text-sm text-gray-200">
                        {formatCurrency(request.refundAmount)} ({request.refundPercent}%)
                      </p>
                      <div className="mt-3 space-y-2">
                        {request.items.map((item) => (
                          <div key={`${request.id}-${item.sku}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                            <span>{item.name}</span>
                            <span className="text-gray-400">x{item.quantity} · {formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {request.evidence.length ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Evidence</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {request.evidence.map((asset, index) => (
                            <a
                              key={`${asset.publicId}-${index}`}
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gold hover:border-gold/30"
                            >
                              Evidence {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {request.adminNote ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Admin note</p>
                        <p className="mt-2 text-sm text-gray-300">{request.adminNote}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-dark-light/20 px-4 py-5 text-sm text-gray-400">
                No return requests have been submitted for this order yet.
              </div>
            )}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {detail.isQuotation && detail.quotationToken && !isCancelled ? (
            <Button
              className="!shadow-none hover:!shadow-none"
              isLoading={activeAction === 'confirm'}
              loadingLabel="Confirming..."
              disabled={!canConfirmQuotation}
              onClick={async () => {
                if (!user?.isEmailVerified) {
                  toast.error('Verify your email in profile before confirming the order.');
                  navigate('/dashboard/security?section=verification');
                  return;
                }

                if (requiresFulfilmentSelection && pendingFulfilmentType === 'delivery' && !selectedAddressId) {
                  toast.error('Select a delivery address before confirming the quotation.');
                  return;
                }

                try {
                  setActiveAction('confirm');
                  const response = await orderService.confirmQuotation(
                    detail.quotationToken!,
                    {
                      paymentMethod: effectivePaymentMethod,
                      ...(requiresFulfilmentSelection
                        ? {
                            type: pendingFulfilmentType,
                            addressId: pendingFulfilmentType === 'delivery' ? selectedAddressId || undefined : undefined,
                            pickupSlot: pendingFulfilmentType === 'pickup' ? pickupSlot.trim() || undefined : undefined,
                            deliveryNotes: pendingFulfilmentType === 'delivery' ? deliveryNotes.trim() || undefined : undefined
                          }
                        : {}),
                      ...(loyaltyDiscount > 0 || detail.loyaltyPointsRedeemed > 0 ? { loyaltyPointsToRedeem: loyaltyDiscount } : {})
                    }
                  );
                  analytics.trackPurchaseCompleted(response.data);
                  toast.success('Quotation confirmed');
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] }),
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview-orders'] }),
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'order', detail.id] }),
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'order', response.data.id] }),
                    queryClient.invalidateQueries({ queryKey: ['dashboard', 'loyalty-history'] }),
                    refreshSession().catch(() => null)
                  ]);
                } catch (error) {
                  toast.error(getApiErrorMessage(error, 'Unable to confirm this quotation right now.'));
                } finally {
                  setActiveAction(null);
                }
              }}
            >
              Confirm Quotation
            </Button>
          ) : null}
          {detail.status === 'pending' && !isCancelled ? (
            <Button
              variant="secondary"
              className="!shadow-none hover:!shadow-none"
              onClick={async () => {
                try {
                  await orderService.cancel(detail.id);
                  toast.success('Order cancelled');
                  await invalidateOrderQueries();
                } catch (error) {
                  toast.error(getApiErrorMessage(error, 'Unable to cancel this order right now.'));
                }
              }}
            >
              Cancel Order
            </Button>
          ) : null}
          {detail.quotationPdf ? (
            <Button
              type="button"
              variant="secondary"
              className="!shadow-none hover:!shadow-none"
              isLoading={activeAction === 'quotation'}
              loadingLabel="Downloading..."
              onClick={async () => {
                try {
                  setActiveAction('quotation');
                  await orderService.downloadQuotation(detail.id);
                } catch {
                  toast.error('Unable to download the quotation right now.');
                } finally {
                  setActiveAction(null);
                }
              }}
            >
              Download Quotation PDF
            </Button>
          ) : null}
          {showInvoiceAction ? (
            <Button
              type="button"
              variant="secondary"
              className="!shadow-none hover:!shadow-none"
              isLoading={activeAction === 'invoice'}
              loadingLabel="Downloading..."
              onClick={async () => {
                try {
                  setActiveAction('invoice');
                  await orderService.downloadInvoice(detail.id);
                } catch {
                  toast.error('Unable to download the invoice right now.');
                } finally {
                  setActiveAction(null);
                }
              }}
            >
              Download Invoice
            </Button>
          ) : null}
        </div>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-medium text-white">Timeline</p>
          <div className="mt-4 space-y-3">
            {detail.timeline.map((entry, index) => (
              <div key={`${entry.createdAt}-${index}`} className="border-l border-gold/40 pl-4 text-sm text-gray-300">
                <p className="font-medium text-white">{entry.status}</p>
                <p className="mt-1">{entry.note}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.actor ? ` - ${entry.actor}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Modal
        isOpen={isBankDetailsOpen}
        onClose={() => setIsBankDetailsOpen(false)}
        title="Bank Transfer Details"
        bodyClassName="space-y-4"
      >
        <BankTransferDetailsPanel
          details={bankTransferDetails}
          title="Payment account"
          description="Transfer to this account after quotation confirmation. Keep your reference or receipt ready for upload."
          compact
        />
      </Modal>
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          resetReturnForm();
        }}
        title="Request Return"
        bodyClassName="space-y-4"
      >
        <p className="text-sm leading-6 text-gray-300">
          Tell the team why you want to return this order. Once submitted, the request goes through admin review before the refund is completed.
        </p>
        <Textarea
          label="Reason"
          value={returnReason}
          onChange={(event) => setReturnReason(event.target.value)}
          placeholder="Describe the issue, item condition, or refund reason"
        />
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-medium text-white">Items to return</p>
          {detail.items.map((item) => {
            const checked = selectedReturnSkus.includes(item.sku);

            return (
              <div key={item.sku} className="grid gap-3 rounded-xl bg-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center">
                <label className="flex min-w-0 items-start gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-gold"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedReturnSkus((current) =>
                        event.target.checked ? [...new Set([...current, item.sku])] : current.filter((sku) => sku !== item.sku)
                      );
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{item.name}</span>
                    <span className="block text-xs text-gray-500">{item.sku} · ordered x{item.quantity}</span>
                  </span>
                </label>
                <Input
                  label="Qty"
                  type="number"
                  min={1}
                  max={item.quantity}
                  disabled={!checked}
                  value={returnQuantities[item.sku] ?? String(item.quantity)}
                  onChange={(event) => setReturnQuantities((current) => ({ ...current, [item.sku]: event.target.value }))}
                />
              </div>
            );
          })}
          <p className="text-xs text-gray-500">Selected item value: {formatCurrency(selectedReturnSubtotal)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <label className="space-y-2 text-sm text-gray-300">
            <span>Refund mode</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              value={returnRefundMode}
              onChange={(event) => setReturnRefundMode(event.target.value as 'amount' | 'percent')}
            >
              <option value="amount" className="bg-[#07101c] text-white">Amount</option>
              <option value="percent" className="bg-[#07101c] text-white">Percent</option>
            </select>
          </label>
          {returnRefundMode === 'amount' ? (
            <Input label="Refund amount" type="number" min={0} max={selectedReturnSubtotal} value={returnRefundAmount} onChange={(event) => setReturnRefundAmount(event.target.value)} />
          ) : (
            <Input label="Refund percent" type="number" min={0} max={100} value={returnRefundPercent} onChange={(event) => setReturnRefundPercent(event.target.value)} />
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <input
            ref={returnEvidenceInputRef}
            id="return-evidence-upload"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="sr-only"
            onChange={(event) => setReturnEvidenceFiles(Array.from(event.target.files ?? []))}
          />
          <label htmlFor="return-evidence-upload" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gold/35 bg-gold/8 px-4 py-4 text-sm text-gray-300">
            <UploadCloud className="h-4 w-4 text-gold" aria-hidden="true" />
            <span>{returnEvidenceFiles.length ? `${returnEvidenceFiles.length} file${returnEvidenceFiles.length === 1 ? '' : 's'} selected` : 'Upload photos, video frames, or PDF evidence'}</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            isLoading={activeAction === 'return-request'}
            loadingLabel="Submitting..."
            onClick={async () => {
              if (returnReason.trim().length < 10) {
                toast.error('Please share at least a short reason before submitting.');
                return;
              }
              if (!selectedReturnItems.length) {
                toast.error('Select at least one item to return.');
                return;
              }

              try {
                setActiveAction('return-request');
                const response = await orderService.createReturnRequest(detail.id, {
                  reason: returnReason.trim(),
                  items: selectedReturnItems,
                  ...(returnRefundMode === 'amount'
                    ? { refundAmount: Number(returnRefundAmount || selectedReturnSubtotal) }
                    : { refundPercent: Number(returnRefundPercent || 100) })
                });
                if (returnEvidenceFiles.length) {
                  await orderService.uploadReturnEvidence(detail.id, response.data.id, returnEvidenceFiles);
                }
                toast.success('Return request submitted');
                setIsReturnModalOpen(false);
                resetReturnForm();
                await invalidateOrderQueries();
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Unable to submit the return request right now.'));
              } finally {
                setActiveAction(null);
              }
            }}
          >
            Submit Request
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsReturnModalOpen(false);
              resetReturnForm();
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={receiptPreview !== null}
        onClose={() => setReceiptPreview(null)}
        title="Receipt Preview"
        size="xl"
        bodyClassName="space-y-4"
      >
        {receiptPreview ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-subtle,rgba(255,255,255,0.05))] px-4 py-3 text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">
              <p className="truncate text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">{receiptPreview.filename}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-[color:var(--app-modal-border,rgba(255,255,255,0.12))] bg-[var(--app-modal-surface,rgba(255,255,255,0.045))] text-[var(--app-modal-text,#f8fafc)] hover:bg-[var(--app-modal-control-hover,rgba(255,255,255,0.075))] hover:text-[var(--app-modal-text,#f8fafc)]"
                onClick={() => downloadUrl(receiptPreview.url, receiptPreview.filename)}
              >
                Download Receipt
              </Button>
            </div>
            {receiptPreview.mimeType.startsWith('image/') ? (
              <div className="overflow-hidden rounded-3xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-preview-surface,rgba(0,0,0,0.20))] p-3">
                <img
                  src={receiptPreview.url}
                  alt="Receipt preview"
                  className="max-h-[72vh] w-full rounded-2xl object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : receiptPreview.mimeType.includes('pdf') ? (
              <div className="overflow-hidden rounded-3xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-white">
                <iframe src={receiptPreview.url} title="Receipt preview" className="h-[72vh] w-full" />
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-subtle,rgba(255,255,255,0.05))] px-5 py-10 text-center text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">
                Preview is not available for this file type. Use the download button above to open it locally.
              </div>
            )}
          </>
        ) : null}
      </Modal>
    </div>
  );
};
