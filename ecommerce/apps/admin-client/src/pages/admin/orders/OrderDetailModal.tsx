import { Badge, Button, Card, Modal } from '@njstore/ui';
import type { OrderRecord } from './orderAdminUtils';
import {
  formatCurrency,
  formatDateTime,
  formatFulfilmentType,
  formatStatusAge,
  getOrderStatusVariant,
  getPaymentStatusVariant
} from './orderAdminUtils';

interface OrderDetailModalProps {
  selectedOrder: OrderRecord | null;
  canWriteOrders: boolean;
  activeReceiptAction: string | null;
  onClose: () => void;
  onOpenReceiptPreview: (orderId: string, receiptId: string) => void;
  onSendShippingNotification: (order: OrderRecord) => void;
  onPrintPackingSlip: (order: OrderRecord) => void;
}

const formatPaymentMethod = (paymentMethod: OrderRecord['paymentMethod']): string =>
  paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer';

export const OrderDetailModal = ({
  selectedOrder,
  canWriteOrders,
  activeReceiptAction,
  onClose,
  onOpenReceiptPreview,
  onSendShippingNotification,
  onPrintPackingSlip
}: OrderDetailModalProps): JSX.Element => (
  <Modal
    isOpen={selectedOrder !== null}
    onClose={onClose}
    title={selectedOrder ? `${selectedOrder.orderNumber} details` : 'Order Details'}
    size="xl"
    bodyClassName="space-y-6"
  >
    {selectedOrder ? (
      <>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="space-y-4 rounded-[26px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Order</p>
                <p className="mt-2 text-xl font-semibold text-white">{selectedOrder.orderNumber}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant={getOrderStatusVariant(selectedOrder.status)} className="capitalize">
                  {selectedOrder.status}
                </Badge>
                <Badge variant={getPaymentStatusVariant(selectedOrder.paymentStatus)} className="capitalize">
                  {selectedOrder.paymentStatus.replace('_', ' ')}
                </Badge>
                {canWriteOrders && selectedOrder.type === 'delivery' && selectedOrder.status === 'shipped' && selectedOrder.customer?.email ? (
                  <Button size="sm" variant="ghost" onClick={() => onSendShippingNotification(selectedOrder)}>
                    Send Shipping Email
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => onPrintPackingSlip(selectedOrder)}>
                  Packing Slip
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Placed</p>
                <p className="mt-1 text-sm text-gray-200">{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Last Updated</p>
                <p className="mt-1 text-sm text-gray-200">{formatDateTime(selectedOrder.updatedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Fulfilment</p>
                <p className="mt-1 text-sm capitalize text-gray-200">{formatFulfilmentType(selectedOrder.type)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Tracking Number</p>
                <p className="mt-1 text-sm text-gray-200">{selectedOrder.trackingNumber ?? 'Not assigned yet'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Current Status Age</p>
                <p className="mt-1 text-sm text-gray-200">{formatStatusAge(selectedOrder)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Coupon</p>
                <p className="mt-1 text-sm text-gray-200">{selectedOrder.couponCode ?? 'No coupon applied'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Payment Method</p>
                <p className="mt-1 text-sm text-gray-200">{formatPaymentMethod(selectedOrder.paymentMethod)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Payment Proof</p>
                <p className="mt-1 text-sm text-gray-200">
                  {selectedOrder.paymentMethod === 'cash_on_delivery'
                    ? 'Not required for Cash on Delivery'
                    : `${selectedOrder.receipts.length} receipt${selectedOrder.receipts.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Assigned Staff</p>
                <p className="mt-1 text-sm text-gray-200">{selectedOrder.assignedTo?.name ?? 'Unassigned'}</p>
                {selectedOrder.assignedTo?.email ? <p className="text-xs text-gray-500">{selectedOrder.assignedTo.email}</p> : null}
              </div>
            </div>
            {selectedOrder.receipts.length ? (
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Receipt Files</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedOrder.receipts.map((receipt, index) => (
                    <Button
                      key={receipt.id}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs font-medium text-gold hover:text-gold-light"
                      isLoading={activeReceiptAction === `${selectedOrder.id}:${receipt.id}`}
                      loadingLabel="Opening..."
                      onClick={() => onOpenReceiptPreview(selectedOrder.id, receipt.id)}
                    >
                      View {selectedOrder.receipts.length > 1 ? `receipt #${index + 1}` : 'receipt'}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
          <Card className="space-y-3 rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Totals</p>
            <div className="space-y-2 text-sm text-gray-200">
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Shipping</span>
                <span>{formatCurrency(selectedOrder.shippingFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Discount</span>
                <span>{formatCurrency(selectedOrder.discount)}</span>
              </div>
              {selectedOrder.loyaltyDiscount && selectedOrder.loyaltyDiscount > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Loyalty points</span>
                  <span>-{formatCurrency(selectedOrder.loyaltyDiscount)}</span>
                </div>
              ) : null}
              {selectedOrder.taxAmount && selectedOrder.taxAmount > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {selectedOrder.taxLabel ?? 'Tax'}
                    {selectedOrder.taxRate ? ` (${selectedOrder.taxRate}%)` : ''}
                  </span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 font-medium text-white">
                <span>Total</span>
                <span>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Customer</p>
            {selectedOrder.customer ? (
              <div className="space-y-3 text-sm text-gray-200">
                <div>
                  <p className="font-medium text-white">{selectedOrder.customer.name}</p>
                  <p className="mt-1">{selectedOrder.customer.email}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Phone</p>
                    <p className="mt-1">{selectedOrder.customer.phone ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Email Status</p>
                    <p className="mt-1">{selectedOrder.customer.isEmailVerified ? 'Verified' : 'Unverified'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Customer details are unavailable for this order.</p>
            )}
          </Card>
          <Card className="space-y-3 rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Fulfilment Details</p>
            {selectedOrder.shippingAddress ? (
              <div className="space-y-2 text-sm leading-6 text-gray-200">
                <p className="font-medium text-white">Delivery address</p>
                <p>{selectedOrder.shippingAddress.label}</p>
                <p>{selectedOrder.shippingAddress.line1}</p>
                {selectedOrder.shippingAddress.line2 ? <p>{selectedOrder.shippingAddress.line2}</p> : null}
                <p>
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.country}
                </p>
                {selectedOrder.shippingAddress.phone ? <p>{selectedOrder.shippingAddress.phone}</p> : null}
              </div>
            ) : (
              <div className="space-y-2 text-sm leading-6 text-gray-200">
                <p className="font-medium text-white">Pickup order</p>
                <p>{selectedOrder.pickupSlot ? `Preferred slot: ${selectedOrder.pickupSlot}` : 'No pickup slot selected'}</p>
              </div>
            )}
            {selectedOrder.estimatedDeliveryDate || selectedOrder.estimatedDeliveryDays ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
                {selectedOrder.estimatedDeliveryDate ? <p>Estimated delivery date: {formatDateTime(selectedOrder.estimatedDeliveryDate)}</p> : null}
                {selectedOrder.estimatedDeliveryDays ? <p>Estimated delivery days: {selectedOrder.estimatedDeliveryDays}</p> : null}
              </div>
            ) : null}
          </Card>
          <Card className="space-y-3 rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Notes</p>
            <div className="space-y-3 text-sm leading-6 text-gray-200">
              <div>
                <p className="font-medium text-white">Order notes</p>
                <p>{selectedOrder.notes?.trim() ? selectedOrder.notes : 'No order notes'}</p>
              </div>
              <div>
                <p className="font-medium text-white">Delivery notes</p>
                <p>{selectedOrder.deliveryNotes?.trim() ? selectedOrder.deliveryNotes : 'No delivery notes'}</p>
              </div>
              {selectedOrder.receiptRejectionReason ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-red-100">
                  <p className="font-medium text-white">Receipt rejection reason</p>
                  <p className="mt-1">{selectedOrder.receiptRejectionReason}</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="space-y-4 rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Items</p>
          <div className="space-y-3">
            {selectedOrder.items.map((item) => (
              <div
                key={`${item.sku}-${item.product}`}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  {item.image?.url ? <img src={item.image.url} alt={item.image.alt ?? item.name} className="h-14 w-14 rounded-2xl border border-white/10 object-cover" loading="lazy" decoding="async" /> : null}
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      SKU {item.sku}
                      {item.variantLabel ? ` • ${item.variantLabel}` : ''}
                    </p>
                    <div className="mt-2 grid gap-2 text-xs text-gray-400 sm:grid-cols-3">
                      <p>Quantity: {item.quantity}</p>
                      <p>Unit price: {formatCurrency(item.price)}</p>
                      <p>Line total: {formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
                <p className="font-medium text-white">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Timeline</p>
          <div className="space-y-3">
            {selectedOrder.timeline.map((entry, index) => (
              <div key={`${entry.status}-${entry.createdAt}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium capitalize text-white">{entry.status}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="mt-2">{entry.note}</p>
                {entry.actor ? <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">Actor: {entry.actor}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </>
    ) : null}
  </Modal>
);
