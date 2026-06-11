import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  updateOrderMock: vi.fn(),
  mergeOrdersMock: vi.fn(),
  sendOrderShippingNotificationMock: vi.fn(),
  deleteOrderMock: vi.fn(),
  exportOrdersMock: vi.fn(),
  usersMock: vi.fn(),
  getOrderReceiptAssetMock: vi.fn(),
  invalidateQueriesMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useQueryClient: mocks.useQueryClientMock
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    orders: vi.fn(),
    users: mocks.usersMock,
    updateOrder: mocks.updateOrderMock,
    mergeOrders: mocks.mergeOrdersMock,
    sendOrderShippingNotification: mocks.sendOrderShippingNotificationMock,
    deleteOrder: mocks.deleteOrderMock,
    exportOrders: mocks.exportOrdersMock,
    getOrderReceiptAsset: mocks.getOrderReceiptAssetMock
  }
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

import { Orders } from './Orders';

describe('Admin Orders page', () => {
  beforeEach(() => {
    mocks.useQueryMock.mockReset();
    mocks.useQueryMock.mockImplementation(() => ({
      data: {
        data: []
      }
    }));
    mocks.invalidateQueriesMock.mockReset();
    mocks.invalidateQueriesMock.mockResolvedValue(undefined);
    mocks.updateOrderMock.mockReset();
    mocks.updateOrderMock.mockResolvedValue(undefined);
    mocks.mergeOrdersMock.mockReset();
    mocks.mergeOrdersMock.mockResolvedValue(undefined);
    mocks.sendOrderShippingNotificationMock.mockReset();
    mocks.sendOrderShippingNotificationMock.mockResolvedValue(undefined);
    mocks.deleteOrderMock.mockReset();
    mocks.usersMock.mockReset();
    mocks.useQueryClientMock.mockReturnValue({
      invalidateQueries: mocks.invalidateQueriesMock
    });
    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.exportOrdersMock.mockResolvedValue(new Blob(['test']));
  });

  const renderOrders = (route = '/dashboard/orders'): void => {
    render(
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <>
          <Orders />
          <Toaster position="top-right" />
        </>
      </MemoryRouter>
    );
  };

  const mockOrdersWorkspace = (ordersData: Array<Record<string, unknown>>, staffData: Array<Record<string, unknown>> = []): void => {
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey?: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[1] === 'users') {
        return {
          data: {
            data: staffData
          }
        };
      }

      if (Array.isArray(queryKey) && queryKey[1] === 'orders') {
        const search = typeof queryKey[3] === 'string' ? queryKey[3].trim().toLowerCase() : '';
        const status = typeof queryKey[4] === 'string' ? queryKey[4] : 'all';
        const paymentStatus = typeof queryKey[5] === 'string' ? queryKey[5] : 'all';
        const filteredOrders = ordersData.filter((order) => {
          if (status !== 'all' && order.status !== status) {
            return false;
          }

          if (paymentStatus !== 'all' && order.paymentStatus !== paymentStatus) {
            return false;
          }

          if (!search) {
            return true;
          }

          return String(order.orderNumber ?? '').toLowerCase().includes(search);
        });

        return {
          data: {
            data: filteredOrders,
            pagination: {
              page: 1,
              limit: 20,
              total: filteredOrders.length,
              totalPages: 1
            }
          },
          isFetching: false
        };
      }

      return {
        data: {
          data: ordersData
        }
      };
    });
  };

  it('allows marking paid when an order has no receipts and when receipts exist', () => {
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-no-receipts',
            orderNumber: 'ORD-1001',
            status: 'pending',
            paymentStatus: 'unpaid',
            total: 1200,
            receipts: []
          },
          {
            id: 'order-with-receipts',
            orderNumber: 'ORD-1002',
            status: 'pending',
            paymentStatus: 'receipt_uploaded',
            total: 2400,
            receipts: [
              {
                id: 'receipt-1',
                url: 'https://example.com/receipt-1.png',
                publicId: 'receipt-1',
                alt: 'Receipt 1'
              }
            ]
          }
        ]
      }
    });

    renderOrders();

    const markPaidButtons = screen.getAllByRole('button', { name: 'Mark Paid' });

    expect(markPaidButtons).toHaveLength(2);
    expect(markPaidButtons[0]).toBeEnabled();
    expect(markPaidButtons[1]).toBeEnabled();
    expect(screen.getByText(/No receipt uploaded\. You can still mark paid after receiving payment physically in store/i)).toBeInTheDocument();
  });

  it('hides mutation controls for read-only admins', () => {
    mocks.hasPermissionsMock.mockReturnValue(false);
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-processing',
            orderNumber: 'ORD-2001',
            status: 'processing',
            paymentStatus: 'receipt_uploaded',
            total: 3200,
            receipts: [
              {
                id: 'receipt-processing',
                url: 'https://example.com/receipt-processing.png',
                publicId: 'receipt-processing',
                alt: 'Receipt Processing'
              }
            ]
          },
          {
            id: 'order-shipped',
            orderNumber: 'ORD-2002',
            status: 'shipped',
            paymentStatus: 'paid',
            total: 6400,
            receipts: [
              {
                id: 'receipt-shipped',
                url: 'https://example.com/receipt-shipped.png',
                publicId: 'receipt-shipped',
                alt: 'Receipt Shipped'
              }
            ]
          }
        ]
      }
    });

    renderOrders();

    expect(screen.queryByRole('button', { name: 'Mark Paid' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ship' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deliver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject Receipt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Read-only access/i)).toHaveLength(2);
  });

  it('shows a success toast after marking a receipt-backed order as paid', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    try {
      mocks.useQueryMock.mockReturnValue({
        data: {
          data: [
            {
              id: 'order-with-receipts',
              orderNumber: 'ORD-3001',
              status: 'pending',
              paymentStatus: 'receipt_uploaded',
              total: 4800,
              receipts: [
                {
                  id: 'receipt-paid',
                  url: 'https://example.com/receipt-paid.png',
                  publicId: 'receipt-paid',
                  alt: 'Receipt Paid'
                }
              ]
            }
          ]
        }
      });

      renderOrders();

      await user.click(screen.getByRole('button', { name: 'Mark Paid' }));

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('reviewing the uploaded receipt'));
      expect(mocks.updateOrderMock).toHaveBeenCalledWith('order-with-receipts', { paymentStatus: 'paid' });
      expect(await screen.findByText('Order marked as paid')).toBeInTheDocument();
      expect(mocks.invalidateQueriesMock).toHaveBeenCalledTimes(2);
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('marks an order as paid after confirming in-store payment without receipts', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    try {
      mocks.useQueryMock.mockReturnValue({
        data: {
          data: [
            {
              id: 'order-in-store-paid',
              orderNumber: 'ORD-3001A',
              status: 'pending',
              paymentStatus: 'unpaid',
              total: 4800,
              receipts: []
            }
          ]
        }
      });

      renderOrders();

      await user.click(screen.getByRole('button', { name: 'Mark Paid' }));

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('without an uploaded receipt'));
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('physically in store'));
      expect(mocks.updateOrderMock).toHaveBeenCalledWith('order-in-store-paid', { paymentStatus: 'paid' });
      expect((await screen.findAllByText('Order marked as paid')).length).toBeGreaterThan(0);
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('does not mark paid when the admin cancels confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    try {
      mocks.useQueryMock.mockReturnValue({
        data: {
          data: [
            {
              id: 'order-cancel-confirm',
              orderNumber: 'ORD-3001B',
              status: 'pending',
              paymentStatus: 'unpaid',
              total: 4800,
              receipts: []
            }
          ]
        }
      });

      renderOrders();

      await user.click(screen.getByRole('button', { name: 'Mark Paid' }));

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(mocks.updateOrderMock).not.toHaveBeenCalled();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('shows an API error toast when marking an order as paid fails', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    try {
      mocks.updateOrderMock.mockRejectedValue({
        isAxiosError: true,
        response: {
          data: {
            message: 'Payment approval failed'
          }
        }
      });
      mocks.useQueryMock.mockReturnValue({
        data: {
          data: [
            {
              id: 'order-with-receipts',
              orderNumber: 'ORD-3002',
              status: 'pending',
              paymentStatus: 'receipt_uploaded',
              total: 5300,
              receipts: [
                {
                  id: 'receipt-error',
                  url: 'https://example.com/receipt-error.png',
                  publicId: 'receipt-error',
                  alt: 'Receipt Error'
                }
              ]
            }
          ]
        }
      });

      renderOrders();

      await user.click(screen.getByRole('button', { name: 'Mark Paid' }));

      expect(await screen.findByText('Payment approval failed')).toBeInTheDocument();
      expect(mocks.invalidateQueriesMock).not.toHaveBeenCalled();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('hydrates the order status filter from the dashboard shortcut query string', () => {
    mockOrdersWorkspace([
      {
        id: 'order-processing',
        orderNumber: 'ORD-3101',
        status: 'processing',
        paymentStatus: 'receipt_uploaded',
        total: 1800,
        receipts: []
      },
      {
        id: 'order-delivered',
        orderNumber: 'ORD-3102',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 2600,
        receipts: []
      }
    ]);

    renderOrders('/dashboard/orders?status=processing');

    expect(screen.getByText('ORD-3101')).toBeInTheDocument();
    expect(screen.queryByText('ORD-3102')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by order status')).toHaveValue('processing');
  });

  it('opens an order details modal with customer, fulfilment, item, notes, and timeline data', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-detail',
            orderNumber: 'ORD-4001',
            quotationNumber: undefined,
            quotationToken: undefined,
            quotationExpiry: undefined,
            isQuotation: false,
            fulfilmentConfigured: true,
            type: 'delivery',
            status: 'processing',
            paymentStatus: 'receipt_uploaded',
            paymentMethod: 'bank_transfer',
            subtotal: 240000,
            shippingFee: 0,
            discount: 12000,
            total: 228000,
            customer: {
              id: 'customer-1',
              name: 'Nisal Jureanz',
              email: 'nisala.jureanz@gmail.com',
              phone: '+94 77 123 4567',
              isEmailVerified: true
            },
            shippingAddress: {
              id: 'address-1',
              label: 'Office',
              line1: '12 Galle Road',
              line2: 'Floor 3',
              city: 'Colombo',
              country: 'Sri Lanka',
              phone: '+94 77 123 4567',
              postalCode: '00300',
              isDefault: true
            },
            pickupSlot: undefined,
            notes: 'Customer asked for careful packaging.',
            deliveryNotes: 'Call before arrival.',
            couponCode: 'APRIL12',
            items: [
              {
                product: 'product-1',
                name: 'iPad Air M2',
                slug: 'ipad-air-m2',
                quantity: 1,
                price: 240000,
                sku: 'IPAD-M2'
              }
            ],
            trackingNumber: 'TRACK-123',
            receipts: [
              {
                id: 'receipt-1',
                url: 'https://example.com/receipt-1.png',
                publicId: 'receipt-1',
                alt: 'Receipt 1'
              }
            ],
            receiptRejectionReason: undefined,
            createdAt: '2026-04-01T12:00:00.000Z',
            updatedAt: '2026-04-01T13:15:00.000Z',
            estimatedDeliveryDays: '3-5',
            estimatedDeliveryDate: '2026-04-05T00:00:00.000Z',
            loyaltyPointsAwarded: 0,
            loyaltyPointsRedeemed: 0,
            loyaltyDiscount: 0,
            timeline: [
              {
                status: 'pending',
                note: 'Quotation confirmed',
                actor: 'customer',
                createdAt: '2026-04-01T12:00:00.000Z'
              },
              {
                status: 'processing',
                note: 'Payment proof uploaded',
                actor: 'customer',
                createdAt: '2026-04-01T13:00:00.000Z'
              }
            ]
          }
        ]
      }
    });

    renderOrders();

    await user.click(screen.getByRole('button', { name: 'View Details' }));

    const dialog = await screen.findByRole('dialog', { name: 'ORD-4001 details' });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Nisal Jureanz')).toBeInTheDocument();
    expect(within(dialog).getByText('nisala.jureanz@gmail.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Verified')).toBeInTheDocument();
    expect(within(dialog).getByText('12 Galle Road')).toBeInTheDocument();
    expect(within(dialog).getByText('Customer asked for careful packaging.')).toBeInTheDocument();
    expect(within(dialog).getByText('Call before arrival.')).toBeInTheDocument();
    expect(within(dialog).getByText('iPad Air M2')).toBeInTheDocument();
    expect(within(dialog).getByText('Unit price: LKR 240,000')).toBeInTheDocument();
    expect(within(dialog).getByText('Line total: LKR 240,000')).toBeInTheDocument();
    expect(within(dialog).getByText('Payment proof uploaded')).toBeInTheDocument();
    expect(within(dialog).getByText('TRACK-123')).toBeInTheDocument();
    expect(within(dialog).getByText('APRIL12')).toBeInTheDocument();
  });

  it('lets admins narrow the orders workspace with quick filters and status filters', async () => {
    const user = userEvent.setup();

    mockOrdersWorkspace([
      {
        id: 'order-review',
        orderNumber: 'ORD-5001',
        type: 'delivery',
        status: 'pending',
        paymentStatus: 'receipt_uploaded',
        total: 2400,
        customer: {
          id: 'customer-review',
          name: 'Review Customer',
          email: 'review@example.com',
          isEmailVerified: true
        },
        receipts: [{ id: 'receipt-review', url: 'https://example.com/review.png', publicId: 'review' }]
      },
      {
        id: 'order-delivered',
        orderNumber: 'ORD-5002',
        type: 'pickup',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 3600,
        customer: {
          id: 'customer-delivered',
          name: 'Delivered Customer',
          email: 'delivered@example.com',
          isEmailVerified: true
        },
        receipts: []
      }
    ]);

    renderOrders();

    await user.click(screen.getByRole('button', { name: /Receipts to review/i }));

    expect(screen.getByText('ORD-5001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-5002')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear filters/i }));
    await user.selectOptions(screen.getByLabelText('Filter by order status'), 'delivered');

    expect(screen.getByText('ORD-5002')).toBeInTheDocument();
    expect(screen.queryByText('ORD-5001')).not.toBeInTheDocument();
  });

  it('lets admins assign an order to an active staff member from the list view', async () => {
    const user = userEvent.setup();

    mockOrdersWorkspace(
      [
        {
          id: 'order-assign',
          orderNumber: 'ORD-6001',
          type: 'delivery',
          status: 'processing',
          paymentStatus: 'paid',
          total: 4200,
          customer: {
            id: 'customer-assign',
            name: 'Assignment Customer',
            email: 'assignment@example.com',
            isEmailVerified: true
          },
          receipts: []
        }
      ],
      [
        {
          id: 'staff-2',
          name: 'Ops Lead',
          email: 'ops@example.com',
          role: 'staff',
          isActive: true
        }
      ]
    );

    renderOrders();

    await user.selectOptions(screen.getByLabelText('Assign staff for ORD-6001'), 'staff-2');

    expect(mocks.updateOrderMock).toHaveBeenCalledWith('order-assign', { assignedToId: 'staff-2' });
    expect(await screen.findByText('Order assigned')).toBeInTheDocument();
  });

  it('prints a packing slip from the order list', async () => {
    const user = userEvent.setup();
    const printWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn()
      },
      focus: vi.fn(),
      print: vi.fn()
    };
    const contentWindowSpy = vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(printWindow as unknown as Window);

    mockOrdersWorkspace([
      {
        id: 'order-packing-slip',
        orderNumber: 'ORD-6101',
        type: 'delivery',
        status: 'processing',
        paymentStatus: 'paid',
        total: 6200,
        customer: {
          id: 'customer-slip',
          name: 'Slip Customer',
          email: 'slip@example.com',
          isEmailVerified: true
        },
        shippingAddress: {
          label: 'Office',
          fullName: 'Slip Customer',
          line1: '12 Galle Road',
          city: 'Colombo',
          district: 'Colombo',
          postalCode: '00300',
          country: 'Sri Lanka',
          phone: '+94 77 123 4567'
        },
        items: [
          {
            product: 'product-slip',
            name: 'MacBook Air',
            slug: 'macbook-air',
            quantity: 1,
            price: 6200,
            sku: 'MBA-13'
          }
        ],
        receipts: []
      }
    ]);

    renderOrders();

    await user.click(screen.getByRole('button', { name: 'Packing Slip' }));

    const printFrame = document.querySelector('iframe[title="Packing slip print frame"]');
    expect(printFrame).toBeInstanceOf(HTMLIFrameElement);
    expect((printFrame as HTMLIFrameElement).srcdoc).toContain('Packing Slip');
    expect((printFrame as HTMLIFrameElement).srcdoc).toContain('ORD-6101');

    printFrame?.dispatchEvent(new Event('load'));

    expect(printWindow.print).toHaveBeenCalled();

    contentWindowSpy.mockRestore();
  });

  it('applies bulk status updates with a shared note and tracking number', async () => {
    const user = userEvent.setup();

    mockOrdersWorkspace([
      {
        id: 'order-bulk-1',
        orderNumber: 'ORD-6201',
        type: 'delivery',
        status: 'processing',
        paymentStatus: 'paid',
        total: 5000,
        customer: {
          id: 'customer-bulk-1',
          name: 'Bulk Customer 1',
          email: 'bulk1@example.com',
          isEmailVerified: true
        },
        receipts: []
      },
      {
        id: 'order-bulk-2',
        orderNumber: 'ORD-6202',
        type: 'delivery',
        status: 'processing',
        paymentStatus: 'paid',
        total: 7000,
        customer: {
          id: 'customer-bulk-2',
          name: 'Bulk Customer 2',
          email: 'bulk2@example.com',
          isEmailVerified: true
        },
        receipts: []
      }
    ]);

    renderOrders();

    await user.click(screen.getByLabelText('Select order ORD-6201'));
    await user.click(screen.getByLabelText('Select order ORD-6202'));
    await user.selectOptions(screen.getByLabelText('Bulk order status'), 'shipped');
    await user.type(screen.getByLabelText('Bulk update note'), 'Dispatch batch A');
    await user.type(screen.getByLabelText('Bulk tracking number'), 'TRACK-BULK');
    await user.click(screen.getByRole('button', { name: 'Apply bulk update' }));

    expect(mocks.updateOrderMock).toHaveBeenNthCalledWith(1, 'order-bulk-1', {
      status: 'shipped',
      trackingNumber: 'TRACK-BULK',
      reason: 'Dispatch batch A'
    });
    expect(mocks.updateOrderMock).toHaveBeenNthCalledWith(2, 'order-bulk-2', {
      status: 'shipped',
      trackingNumber: 'TRACK-BULK',
      reason: 'Dispatch batch A'
    });
    expect(await screen.findByText('2 orders updated to shipped')).toBeInTheDocument();
  });

  it('shows an explicit SLA timer badge based on the current order status timeline', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-04-08T12:00:00.000Z'));

      mockOrdersWorkspace([
        {
          id: 'order-sla',
          orderNumber: 'ORD-6301',
          type: 'delivery',
          status: 'processing',
          paymentStatus: 'paid',
          total: 5400,
          customer: {
            id: 'customer-sla',
            name: 'SLA Customer',
            email: 'sla@example.com',
            isEmailVerified: true
          },
          receipts: [],
          timeline: [
            {
              status: 'pending',
              note: 'Created',
              createdAt: '2026-04-01T09:00:00.000Z'
            },
            {
              status: 'processing',
              note: 'Approved',
              createdAt: '2026-04-05T09:00:00.000Z'
            }
          ]
        }
      ]);

      renderOrders();

      expect(screen.getByText('In processing for 3 days overdue')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends a shipping notification email for shipped delivery orders', async () => {
    const user = userEvent.setup();

    mockOrdersWorkspace([
      {
        id: 'order-shipping-email',
        orderNumber: 'ORD-6401',
        type: 'delivery',
        status: 'shipped',
        paymentStatus: 'paid',
        total: 7600,
        trackingNumber: 'TRACK-6401',
        customer: {
          id: 'customer-shipping-email',
          name: 'Shipping Email Customer',
          email: 'shipping@example.com',
          isEmailVerified: true
        },
        receipts: []
      }
    ]);

    renderOrders();

    await user.click(screen.getByRole('button', { name: 'Send Shipping Email' }));

    expect(mocks.sendOrderShippingNotificationMock).toHaveBeenCalledWith('order-shipping-email');
    expect(await screen.findByText('Shipping notification sent')).toBeInTheDocument();
  });

  it('merges two selected orders and keeps the older one', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockOrdersWorkspace([
      {
        id: 'order-merge-keep',
        orderNumber: 'ORD-6501',
        type: 'delivery',
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'bank_transfer',
        total: 1800,
        createdAt: '2026-04-01T09:00:00.000Z',
        customer: {
          id: 'customer-merge',
          name: 'Merge Customer',
          email: 'merge@example.com',
          isEmailVerified: true
        },
        shippingAddress: {
          label: 'Office',
          fullName: 'Merge Customer',
          line1: '12 Galle Road',
          city: 'Colombo',
          district: 'Colombo',
          postalCode: '00300',
          country: 'Sri Lanka',
          phone: '+94 77 123 4567'
        },
        receipts: [],
        timeline: []
      },
      {
        id: 'order-merge-source',
        orderNumber: 'ORD-6502',
        type: 'delivery',
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'bank_transfer',
        total: 3300,
        createdAt: '2026-04-02T09:00:00.000Z',
        customer: {
          id: 'customer-merge',
          name: 'Merge Customer',
          email: 'merge@example.com',
          isEmailVerified: true
        },
        shippingAddress: {
          label: 'Office',
          fullName: 'Merge Customer',
          line1: '12 Galle Road',
          city: 'Colombo',
          district: 'Colombo',
          postalCode: '00300',
          country: 'Sri Lanka',
          phone: '+94 77 123 4567'
        },
        receipts: [],
        timeline: []
      }
    ]);

    renderOrders();

    await user.click(screen.getByLabelText('Select order ORD-6501'));
    await user.click(screen.getByLabelText('Select order ORD-6502'));
    await user.click(screen.getByRole('button', { name: 'Merge selected orders' }));

    expect(mocks.mergeOrdersMock).toHaveBeenCalledWith({
      keepOrderId: 'order-merge-keep',
      mergeOrderId: 'order-merge-source'
    });
    expect(await screen.findByText('Merged into ORD-6501')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});
