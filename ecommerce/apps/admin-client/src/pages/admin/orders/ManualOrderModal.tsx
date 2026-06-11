import type { Dispatch, SetStateAction } from 'react';
import { Button, Card, Modal } from '@njstore/ui';
import {
  createManualOrderItem,
  formatCurrency,
  formatVariantLabel,
  getManualOrderLinePrice,
  getProductOptionId,
  getProductStock,
  type ManualOrderFormState,
  type ManualOrderItemForm,
  type ManualOrderPaymentStatusValue,
  type ManualOrderProductOption,
  type ManualOrderStatusValue,
  type OrderRecord,
  type UserRecord
} from './orderAdminUtils';

interface ManualOrderModalProps {
  isOpen: boolean;
  isCreatingManualOrder: boolean;
  manualOrderForm: ManualOrderFormState;
  setManualOrderForm: Dispatch<SetStateAction<ManualOrderFormState>>;
  customerOptions: UserRecord[];
  staffOptions: UserRecord[];
  manualProductOptions: ManualOrderProductOption[];
  manualProductsById: Map<string, ManualOrderProductOption>;
  isManualOrderProductsLoading: boolean;
  manualOrderPreview: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    totalBeforeTax: number;
  };
  onClose: () => void;
  onSubmit: () => void;
  onManualCustomerSelect: (value: string) => void;
  onManualOrderProductChange: (index: number, productId: string) => void;
  onUpdateManualOrderItem: (index: number, updates: Partial<ManualOrderItemForm>) => void;
  onUpdateManualOrderAddress: (field: keyof ManualOrderFormState['shippingAddress'], value: string) => void;
}

export const ManualOrderModal = ({
  isOpen,
  isCreatingManualOrder,
  manualOrderForm,
  setManualOrderForm,
  customerOptions,
  staffOptions,
  manualProductOptions,
  manualProductsById,
  isManualOrderProductsLoading,
  manualOrderPreview,
  onClose,
  onSubmit,
  onManualCustomerSelect,
  onManualOrderProductChange,
  onUpdateManualOrderItem,
  onUpdateManualOrderAddress
}: ManualOrderModalProps): JSX.Element => (
  <Modal
    isOpen={isOpen}
    onClose={() => {
      if (!isCreatingManualOrder) {
        onClose();
      }
    }}
    title="Add Manual Order"
    size="xl"
    bodyClassName="space-y-5"
  >
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Card className="space-y-4 rounded-[20px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Customer</p>
            <p className="mt-1 text-sm text-gray-400">Use an existing customer or enter a new phone-order customer.</p>
          </div>
          <select
            aria-label="Choose existing customer"
            value={manualOrderForm.customerId}
            onChange={(event) => onManualCustomerSelect(event.target.value)}
            className="h-10 min-w-[240px] rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
          >
            <option value="">Manual customer</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} • {customer.email}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Name</span>
            <input
              value={manualOrderForm.customerName}
              onChange={(event) => setManualOrderForm((current) => ({ ...current, customerName: event.target.value }))}
              className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              placeholder="Customer name"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Email</span>
            <input
              type="email"
              value={manualOrderForm.customerEmail}
              onChange={(event) => setManualOrderForm((current) => ({ ...current, customerEmail: event.target.value }))}
              className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              placeholder="customer@example.com"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Phone</span>
            <input
              value={manualOrderForm.customerPhone}
              onChange={(event) => {
                const nextPhone = event.target.value;
                setManualOrderForm((current) => ({
                  ...current,
                  customerPhone: nextPhone,
                  shippingAddress: {
                    ...current.shippingAddress,
                    phone: current.shippingAddress.phone || nextPhone
                  }
                }));
              }}
              className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              placeholder="+94 77 123 4567"
            />
          </label>
        </div>
      </Card>

      <Card className="space-y-4 rounded-[20px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Items</p>
            <p className="mt-1 text-sm text-gray-400">Select active products, variants, and quantities.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setManualOrderForm((current) => ({
                ...current,
                items: [...current.items, createManualOrderItem()]
              }))
            }
          >
            Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {manualOrderForm.items.map((item, index) => {
            const selectedProduct = manualProductsById.get(item.productId);
            const variants = selectedProduct?.productType === 'bundle' ? [] : selectedProduct?.variants ?? [];
            const linePrice = getManualOrderLinePrice(selectedProduct, item.variantIndex);
            const quantity = Number(item.quantity) || 0;

            return (
              <div key={`manual-item-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_auto]">
                <label className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Product</span>
                  <select
                    aria-label={`Manual order product ${index + 1}`}
                    value={item.productId}
                    onChange={(event) => onManualOrderProductChange(index, event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                  >
                    <option value="">{isManualOrderProductsLoading ? 'Loading products...' : 'Choose product'}</option>
                    {manualProductOptions.map((product) => (
                      <option key={getProductOptionId(product)} value={getProductOptionId(product)}>
                        {product.name} • {formatCurrency(product.price)} • {getProductStock(product)} left
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Variant</span>
                  <select
                    aria-label={`Manual order variant ${index + 1}`}
                    value={item.variantIndex}
                    disabled={!selectedProduct || variants.length === 0}
                    onChange={(event) => onUpdateManualOrderItem(index, { variantIndex: event.target.value })}
                    className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                  >
                    <option value="">{variants.length ? 'Choose variant' : 'Default item'}</option>
                    {variants.map((variant, variantIndex) => (
                      <option key={`${item.productId}-variant-${variantIndex}`} value={variantIndex}>
                        {formatVariantLabel(variant, variantIndex)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => onUpdateManualOrderItem(index, { quantity: event.target.value })}
                    className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                  />
                </label>
                <div className="flex flex-col justify-end gap-2">
                  <p className="text-sm font-medium text-white">{formatCurrency(linePrice * quantity)}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={manualOrderForm.items.length === 1}
                    onClick={() =>
                      setManualOrderForm((current) => ({
                        ...current,
                        items: current.items.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Card className="space-y-4 rounded-[20px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Fulfilment</p>
              <p className="mt-1 text-sm text-gray-400">Delivery orders need a complete destination.</p>
            </div>
            <select
              aria-label="Manual order fulfilment type"
              value={manualOrderForm.type}
              onChange={(event) => setManualOrderForm((current) => ({ ...current, type: event.target.value as ManualOrderFormState['type'] }))}
              className="h-10 min-w-[160px] rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
            >
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>
          {manualOrderForm.type === 'delivery' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['label', 'Label', 'Delivery'],
                ['fullName', 'Full name', 'Receiver name'],
                ['phone', 'Phone', '+94 77 123 4567'],
                ['line1', 'Address line 1', 'Street address'],
                ['line2', 'Address line 2', 'Apartment, suite, etc.'],
                ['city', 'City', 'Colombo'],
                ['district', 'District', 'Colombo'],
                ['postalCode', 'Postal code', '00300'],
                ['country', 'Country', 'Sri Lanka']
              ] as Array<[keyof ManualOrderFormState['shippingAddress'], string, string]>).map(([field, label, placeholder]) => (
                <label key={field} className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">{label}</span>
                  <input
                    value={manualOrderForm.shippingAddress[field]}
                    onChange={(event) => onUpdateManualOrderAddress(field, event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label className="block space-y-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Pickup slot</span>
              <input
                value={manualOrderForm.pickupSlot}
                onChange={(event) => setManualOrderForm((current) => ({ ...current, pickupSlot: event.target.value }))}
                className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                placeholder="Today after 4 PM"
              />
            </label>
          )}
        </Card>

        <Card className="space-y-4 rounded-[20px] p-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Order details</p>
          <div className="grid gap-3">
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Payment method</span>
              <select
                value={manualOrderForm.paymentMethod}
                onChange={(event) => setManualOrderForm((current) => ({ ...current, paymentMethod: event.target.value as OrderRecord['paymentMethod'] }))}
                className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash_on_delivery">Cash on delivery</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Payment</span>
                <select
                  value={manualOrderForm.paymentStatus}
                  onChange={(event) => setManualOrderForm((current) => ({ ...current, paymentStatus: event.target.value as ManualOrderPaymentStatusValue }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Status</span>
                <select
                  value={manualOrderForm.status}
                  onChange={(event) => setManualOrderForm((current) => ({ ...current, status: event.target.value as ManualOrderStatusValue }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Tracking number</span>
              <input
                value={manualOrderForm.trackingNumber}
                onChange={(event) => setManualOrderForm((current) => ({ ...current, trackingNumber: event.target.value }))}
                className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                placeholder="Required when status is shipped"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Assigned staff</span>
              <select
                value={manualOrderForm.assignedToId}
                onChange={(event) => setManualOrderForm((current) => ({ ...current, assignedToId: event.target.value }))}
                className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              >
                <option value="">Unassigned</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Shipping fee</span>
                <input
                  inputMode="decimal"
                  value={manualOrderForm.shippingFee}
                  onChange={(event) => setManualOrderForm((current) => ({ ...current, shippingFee: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                  placeholder="Auto"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Discount</span>
                <input
                  inputMode="decimal"
                  value={manualOrderForm.discount}
                  onChange={(event) => setManualOrderForm((current) => ({ ...current, discount: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-dark-light/80 px-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
                  placeholder="0"
                />
              </label>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span>{formatCurrency(manualOrderPreview.subtotal)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span>Shipping override</span>
                <span>{formatCurrency(manualOrderPreview.shippingFee)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span>Discount</span>
                <span>{formatCurrency(manualOrderPreview.discount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2 font-medium text-white">
                <span>Before tax</span>
                <span>{formatCurrency(manualOrderPreview.totalBeforeTax)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="space-y-4 rounded-[20px] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Notes</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Order notes</span>
            <textarea
              value={manualOrderForm.notes}
              onChange={(event) => setManualOrderForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-dark-light/80 px-3 py-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              placeholder="Customer request, invoice note, or internal context"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Delivery notes</span>
            <textarea
              value={manualOrderForm.deliveryNotes}
              onChange={(event) => setManualOrderForm((current) => ({ ...current, deliveryNotes: event.target.value }))}
              className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-dark-light/80 px-3 py-3 text-sm text-white focus:border-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/5"
              placeholder="Courier instructions"
              disabled={manualOrderForm.type === 'pickup'}
            />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isCreatingManualOrder}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isCreatingManualOrder} loadingLabel="Creating...">
          Create Order
        </Button>
      </div>
    </form>
  </Modal>
);
