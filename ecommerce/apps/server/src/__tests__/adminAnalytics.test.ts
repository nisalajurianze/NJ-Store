import dayjs from 'dayjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';

const TEST_TIMEOUT = 40000;
const password = 'Password123!';

beforeAll(async () => {
  await setupTestDB();
}, TEST_TIMEOUT);

afterAll(async () => {
  await teardownTestDB();
}, TEST_TIMEOUT);

beforeEach(async () => {
  await clearTestDB();
});

const registerAnalyticsAdmin = async (
  email: string,
  permissions: Array<'order:read' | 'product:read' | 'user:read' | 'setting:write'> = ['order:read', 'product:read', 'user:read']
) => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Analytics Admin',
      email,
      password,
      passwordConfirm: password
    })
    .expect(201);

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Registered admin not found');
  }

  user.role = 'admin';
  user.isEmailVerified = true;
  user.permissions = permissions;
  await user.save();

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  return loginRes.body.data.tokens.accessToken as string;
};

const createCustomerAt = async (email: string, createdAt: Date) => {
  const customer = await User.create({
    name: email.split('@')[0],
    email,
    password,
    isEmailVerified: true
  });

  await User.collection.updateOne(
    { _id: customer._id },
    {
      $set: {
        createdAt,
        updatedAt: createdAt
      }
    }
  );

  return customer;
};

const shippingAddress = {
  label: 'Home',
  fullName: 'Analytics Customer',
  phone: '0771234567',
  line1: '123 Main St',
  city: 'Colombo',
  district: 'Colombo',
  postalCode: '00100',
  country: 'Sri Lanka'
};

const createOrderRecord = async (input: {
  userId: mongoose.Types.ObjectId;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'receipt_uploaded' | 'paid' | 'rejected';
  total: number;
  createdAt?: Date;
  paidAt?: Date;
  deletedAt?: Date | null;
  isQuotation?: boolean;
  quotationConfirmedAt?: Date;
}) => {
  const createdAt = input.createdAt ?? new Date();
  const hasQuotationHistory = (input.isQuotation ?? false) || Boolean(input.quotationConfirmedAt);
  return Order.create({
    user: input.userId,
    orderNumber: input.orderNumber,
    quotationNumber: hasQuotationHistory ? `QTN-${input.orderNumber}` : undefined,
    quotationToken: input.isQuotation ? `token-${input.orderNumber}` : undefined,
    quotationExpiry: hasQuotationHistory ? dayjs(createdAt).add(7, 'day').toDate() : undefined,
    isQuotation: input.isQuotation ?? false,
    type: 'delivery',
    paymentMethod: 'bank_transfer',
    status: input.status,
    paymentStatus: input.paymentStatus,
    paidAt: input.paymentStatus === 'paid' ? input.paidAt ?? createdAt : undefined,
    subtotal: input.total,
    shippingFee: 0,
    discount: 0,
    total: input.total,
    shippingAddress,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        name: `${input.orderNumber} item`,
        slug: `${input.orderNumber.toLowerCase()}-item`,
        quantity: 1,
        price: input.total,
        sku: `${input.orderNumber}-SKU`
      }
    ],
    timeline: [
      {
        status: input.status,
        note: input.quotationConfirmedAt ? 'Quotation confirmed by customer' : `${input.status} for analytics coverage`,
        actor: 'system',
        createdAt: input.quotationConfirmedAt ?? createdAt
      }
    ],
    createdAt,
    updatedAt: createdAt,
    deletedAt: input.deletedAt ?? null
  });
};

describe('Admin analytics', () => {
  it(
    'counts total customers across the full base when building the 30-day growth series',
    async () => {
      const token = await registerAnalyticsAdmin('analytics-baseline-admin@example.com');

      await createCustomerAt('existing-customer-one@example.com', dayjs().subtract(45, 'day').startOf('day').toDate());
      await createCustomerAt('existing-customer-two@example.com', dayjs().subtract(31, 'day').startOf('day').toDate());
      await createCustomerAt('recent-customer@example.com', dayjs().startOf('day').toDate());

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.customerGrowth).toHaveLength(30);
      expect(res.body.data.customerGrowth[0]?.totalCustomers).toBe(2);
      expect(res.body.data.customerGrowth.at(-1)?.totalCustomers).toBe(3);
      expect(res.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'New Customers')?.value).toBe(1);
    },
    TEST_TIMEOUT
  );

  it(
    'refreshes analytics immediately after customer registration invalidates the cache',
    async () => {
      const token = await registerAnalyticsAdmin('analytics-cache-admin@example.com');

      const first = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(first.body.data.customerGrowth.at(-1)?.totalCustomers).toBe(0);

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Fresh Customer',
          email: 'fresh-customer@example.com',
          password,
          passwordConfirm: password
        })
        .expect(201);

      const second = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(second.body.data.customerGrowth.at(-1)?.totalCustomers).toBe(1);
      expect(second.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'New Customers')?.value).toBe(1);
    },
    TEST_TIMEOUT
  );

  it(
    'tracks the live order queue in status breakdown while keeping revenue metrics paid-only',
    async () => {
      const token = await registerAnalyticsAdmin('analytics-status-admin@example.com');
      const customer = await createCustomerAt('analytics-order-customer@example.com', dayjs().subtract(10, 'day').toDate());
      const now = new Date();

      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-STATUS-PENDING',
        status: 'pending',
        paymentStatus: 'unpaid',
        total: 1200,
        createdAt: now
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-STATUS-PROCESSING',
        status: 'processing',
        paymentStatus: 'paid',
        total: 2500,
        createdAt: now
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-STATUS-CANCELLED',
        status: 'cancelled',
        paymentStatus: 'unpaid',
        total: 900,
        createdAt: now
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-STATUS-QUOTE',
        status: 'pending',
        paymentStatus: 'unpaid',
        total: 1500,
        createdAt: now,
        isQuotation: true
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-STATUS-DELETED',
        status: 'shipped',
        paymentStatus: 'paid',
        total: 1800,
        createdAt: now,
        deletedAt: now
      });

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statusBreakdown = Object.fromEntries(
        res.body.data.statusBreakdown.map((entry: { status: string; count: number }) => [entry.status, entry.count])
      );

      expect(statusBreakdown).toMatchObject({
        pending: 1,
        processing: 1,
        shipped: 0,
        delivered: 0,
        cancelled: 1
      });
      expect(res.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Orders')?.value).toBe(1);
      expect(res.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Revenue')?.value).toBe(2500);
    },
    TEST_TIMEOUT
  );

  it(
    'includes manual outgoing expenses in the sales analysis snapshots and period totals',
    async () => {
      const token = await registerAnalyticsAdmin('sales-analysis-admin@example.com', [
        'order:read',
        'product:read',
        'user:read',
        'setting:write'
      ]);
      const customer = await createCustomerAt('sales-analysis-customer@example.com', dayjs().subtract(14, 'day').toDate());
      const today = dayjs().startOf('day').add(14, 'hour');
      const earlierThisMonth = (today.date() > 1 ? dayjs().startOf('month') : today.startOf('day')).add(10, 'hour');
      const expectedTodayRevenue = earlierThisMonth.isSame(today, 'day') ? 4000 : 1000;
      const expectedTodayExpenses = earlierThisMonth.isSame(today, 'day') ? 500 : 200;
      const expectedTodayNet = earlierThisMonth.isSame(today, 'day') ? 3500 : 800;
      const expectedTodayOrderCount = earlierThisMonth.isSame(today, 'day') ? 2 : 1;

      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-SALES-TODAY',
        status: 'processing',
        paymentStatus: 'paid',
        total: 1000,
        createdAt: today.toDate()
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-SALES-MTD',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 3000,
        createdAt: earlierThisMonth.toDate()
      });

      await request(app)
        .post('/api/v1/admin/sales-analysis/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Courier fuel',
          amount: 200,
          incurredOn: today.toISOString(),
          category: 'Operations'
        })
        .expect(201);

      await request(app)
        .post('/api/v1/admin/sales-analysis/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Store cleaning',
          amount: 300,
          incurredOn: earlierThisMonth.toISOString(),
          category: 'Maintenance'
        })
        .expect(201);

      const res = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const currentDayKey = today.format('YYYY-MM-DD');
      const currentMonthKey = today.format('YYYY-MM');
      const currentYearKey = today.format('YYYY');
      const dailyPoint = res.body.data.dailySales.find((point: { period: string }) => point.period === currentDayKey);
      const monthlyPoint = res.body.data.monthlySales.find((point: { period: string }) => point.period === currentMonthKey);
      const yearlyPoint = res.body.data.yearlySales.find((point: { period: string }) => point.period === currentYearKey);

      expect(res.body.data.snapshots.today).toMatchObject({
        revenue: expectedTodayRevenue,
        expenses: expectedTodayExpenses,
        net: expectedTodayNet,
        orderCount: expectedTodayOrderCount
      });
      expect(res.body.data.snapshots.monthToDate).toMatchObject({
        revenue: 4000,
        expenses: 500,
        net: 3500,
        orderCount: 2
      });
      expect(res.body.data.snapshots.yearToDate).toMatchObject({
        revenue: 4000,
        expenses: 500,
        net: 3500,
        orderCount: 2
      });
      expect(dailyPoint).toMatchObject({
        revenue: expectedTodayRevenue,
        expenses: expectedTodayExpenses,
        net: expectedTodayNet,
        orderCount: expectedTodayOrderCount
      });
      expect(monthlyPoint).toMatchObject({
        revenue: 4000,
        expenses: 500,
        net: 3500,
        orderCount: 2
      });
      expect(yearlyPoint).toMatchObject({
        revenue: 4000,
        expenses: 500,
        net: 3500,
        orderCount: 2
      });
      expect(res.body.data.expenses).toHaveLength(2);
      expect(res.body.data.strongestMonth).toMatchObject({
        period: currentMonthKey,
        revenue: 4000,
        expenses: 500,
        net: 3500
      });
    },
    TEST_TIMEOUT
  );

  it(
    'creates, updates, and deletes manual expenses through the admin sales analysis routes',
    async () => {
      const token = await registerAnalyticsAdmin('expense-crud-admin@example.com', [
        'order:read',
        'product:read',
        'user:read',
        'setting:write'
      ]);

      const createdExpense = await request(app)
        .post('/api/v1/admin/sales-analysis/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Generator fuel',
          amount: 4500,
          incurredOn: dayjs().startOf('day').toISOString(),
          category: 'Utilities',
          notes: 'Monthly backup generator top-up'
        })
        .expect(201);

      const expenseId = createdExpense.body.data.id as string;

      await request(app)
        .patch(`/api/v1/admin/sales-analysis/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          category: 'Operations',
          notes: 'Updated after supplier invoice'
        })
        .expect(200);

      const afterUpdate = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(afterUpdate.body.data.expenses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expenseId,
            label: 'Generator fuel',
            amount: 5000,
            category: 'Operations',
            notes: 'Updated after supplier invoice'
          })
        ])
      );

      await request(app)
        .delete(`/api/v1/admin/sales-analysis/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const afterDelete = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(afterDelete.body.data.expenses).toEqual([]);
    },
    TEST_TIMEOUT
  );

  it(
    'builds cohort retention rows from first-order months and repeat purchase activity',
    async () => {
      const token = await registerAnalyticsAdmin('sales-cohort-admin@example.com');
      const returningCustomer = await createCustomerAt('cohort-returning@example.com', dayjs().subtract(150, 'day').toDate());
      const oneTimeCustomer = await createCustomerAt('cohort-one-time@example.com', dayjs().subtract(150, 'day').toDate());
      const newCohortCustomer = await createCustomerAt('cohort-current@example.com', dayjs().subtract(20, 'day').toDate());
      const currentCohortOrderDate = (dayjs().date() > 1 ? dayjs().startOf('month') : dayjs().startOf('day')).add(9, 'hour');

      await createOrderRecord({
        userId: returningCustomer._id,
        orderNumber: 'ORD-COHORT-RETURN-1',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 2200,
        createdAt: dayjs().subtract(2, 'month').startOf('month').add(4, 'day').add(10, 'hour').toDate()
      });
      await createOrderRecord({
        userId: returningCustomer._id,
        orderNumber: 'ORD-COHORT-RETURN-2',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 1800,
        createdAt: dayjs().subtract(1, 'month').startOf('month').add(6, 'day').add(11, 'hour').toDate()
      });
      await createOrderRecord({
        userId: oneTimeCustomer._id,
        orderNumber: 'ORD-COHORT-ONE-TIME',
        status: 'processing',
        paymentStatus: 'paid',
        total: 1400,
        createdAt: dayjs().subtract(2, 'month').startOf('month').add(9, 'day').add(12, 'hour').toDate()
      });
      await createOrderRecord({
        userId: newCohortCustomer._id,
        orderNumber: 'ORD-COHORT-CURRENT',
        status: 'processing',
        paymentStatus: 'paid',
        total: 900,
        createdAt: currentCohortOrderDate.toDate()
      });

      const res = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const olderCohortKey = dayjs().subtract(2, 'month').format('YYYY-MM');
      const currentCohortKey = dayjs().format('YYYY-MM');
      const olderCohort = res.body.data.retentionCohorts.find((cohort: { cohortMonth: string }) => cohort.cohortMonth === olderCohortKey);
      const currentCohort = res.body.data.retentionCohorts.find((cohort: { cohortMonth: string }) => cohort.cohortMonth === currentCohortKey);

      expect(olderCohort).toMatchObject({
        cohortMonth: olderCohortKey,
        cohortSize: 2
      });
      expect(olderCohort.retention).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ monthOffset: 0, activeCustomers: 2, retentionRate: 1 }),
          expect.objectContaining({ monthOffset: 1, activeCustomers: 1, retentionRate: 0.5 }),
          expect.objectContaining({ monthOffset: 2, activeCustomers: 0, retentionRate: 0 })
        ])
      );
      expect(currentCohort).toMatchObject({
        cohortMonth: currentCohortKey,
        cohortSize: 1
      });
      expect(currentCohort.retention).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ monthOffset: 0, activeCustomers: 1, retentionRate: 1 }),
          expect.objectContaining({ monthOffset: 1, activeCustomers: null, retentionRate: null })
        ])
      );
    },
    TEST_TIMEOUT
  );

  it(
    'exports the sales analysis report as a PDF',
    async () => {
      const token = await registerAnalyticsAdmin('sales-analysis-pdf-admin@example.com');

      const res = await request(app)
        .get('/api/v1/admin/sales-analysis/export/pdf')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('sales-analysis-report-');
      expect(res.body).toBeInstanceOf(Buffer);
    },
    TEST_TIMEOUT
  );

  it(
    'returns RFM segments for recent, at-risk, new, and dormant paid customers',
    async () => {
      const token = await registerAnalyticsAdmin('sales-rfm-admin@example.com');
      const championCustomer = await createCustomerAt('rfm-champion@example.com', dayjs().subtract(180, 'day').toDate());
      const atRiskCustomer = await createCustomerAt('rfm-at-risk@example.com', dayjs().subtract(180, 'day').toDate());
      const newCustomer = await createCustomerAt('rfm-new@example.com', dayjs().subtract(20, 'day').toDate());
      const dormantCustomer = await createCustomerAt('rfm-dormant@example.com', dayjs().subtract(220, 'day').toDate());

      await createOrderRecord({
        userId: championCustomer._id,
        orderNumber: 'ORD-RFM-CHAMP-1',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 2500,
        createdAt: dayjs().subtract(11, 'day').toDate()
      });
      await createOrderRecord({
        userId: championCustomer._id,
        orderNumber: 'ORD-RFM-CHAMP-2',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 2200,
        createdAt: dayjs().subtract(6, 'day').toDate()
      });
      await createOrderRecord({
        userId: championCustomer._id,
        orderNumber: 'ORD-RFM-CHAMP-3',
        status: 'processing',
        paymentStatus: 'paid',
        total: 2100,
        createdAt: dayjs().subtract(2, 'day').toDate()
      });

      await createOrderRecord({
        userId: atRiskCustomer._id,
        orderNumber: 'ORD-RFM-RISK-1',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 1900,
        createdAt: dayjs().subtract(95, 'day').toDate()
      });
      await createOrderRecord({
        userId: atRiskCustomer._id,
        orderNumber: 'ORD-RFM-RISK-2',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 1700,
        createdAt: dayjs().subtract(70, 'day').toDate()
      });

      await createOrderRecord({
        userId: newCustomer._id,
        orderNumber: 'ORD-RFM-NEW-1',
        status: 'processing',
        paymentStatus: 'paid',
        total: 900,
        createdAt: dayjs().subtract(7, 'day').toDate()
      });

      await createOrderRecord({
        userId: dormantCustomer._id,
        orderNumber: 'ORD-RFM-DORMANT-1',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 600,
        createdAt: dayjs().subtract(160, 'day').toDate()
      });

      const res = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const segmentCounts = Object.fromEntries(
        res.body.data.rfmSegments.map((entry: { key: string; customerCount: number }) => [entry.key, entry.customerCount])
      );
      const customerSegments = Object.fromEntries(
        res.body.data.rfmCustomers.map((entry: { email: string; segmentKey: string }) => [entry.email, entry.segmentKey])
      );

      expect(segmentCounts).toMatchObject({
        champions: 1,
        atRisk: 1,
        new: 1,
        dormant: 1
      });
      expect(customerSegments).toMatchObject({
        'rfm-champion@example.com': 'champions',
        'rfm-at-risk@example.com': 'atRisk',
        'rfm-new@example.com': 'new',
        'rfm-dormant@example.com': 'dormant'
      });
    },
    TEST_TIMEOUT
  );

  it(
    'buckets paid revenue by payment confirmation time instead of order creation time',
    async () => {
      const token = await registerAnalyticsAdmin('analytics-paid-at-admin@example.com');
      const customer = await createCustomerAt('analytics-paid-at-customer@example.com', dayjs().subtract(60, 'day').toDate());
      const insideWindow = dayjs().subtract(2, 'day').hour(11).minute(0).second(0).millisecond(0);
      const outsideWindow = dayjs().subtract(45, 'day').hour(9).minute(0).second(0).millisecond(0);

      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-PAID-INSIDE',
        status: 'processing',
        paymentStatus: 'paid',
        total: 2200,
        createdAt: outsideWindow.toDate(),
        paidAt: insideWindow.toDate()
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-PAID-OUTSIDE',
        status: 'processing',
        paymentStatus: 'paid',
        total: 4800,
        createdAt: insideWindow.toDate(),
        paidAt: outsideWindow.toDate()
      });

      const analyticsRes = await request(app)
        .get('/api/v1/admin/analytics')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(analyticsRes.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Revenue')?.value).toBe(2200);
      expect(analyticsRes.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Orders')?.value).toBe(1);

      const salesAnalysisRes = await request(app)
        .get('/api/v1/admin/sales-analysis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const insideDayPoint = salesAnalysisRes.body.data.dailySales.find(
        (point: { period: string }) => point.period === insideWindow.format('YYYY-MM-DD')
      );

      expect(insideDayPoint).toMatchObject({
        revenue: 2200,
        orderCount: 1
      });
    },
    TEST_TIMEOUT
  );

  it(
    'filters analytics by the requested period and returns funnel plus district coverage for that window',
    async () => {
      const token = await registerAnalyticsAdmin('analytics-window-admin@example.com');
      const customer = await createCustomerAt('analytics-window-customer@example.com', dayjs().subtract(45, 'day').toDate());
      const insideWindow = dayjs().subtract(2, 'day').hour(10).minute(30).second(0).millisecond(0);
      const outsideWindow = dayjs().subtract(21, 'day').hour(9).minute(15).second(0).millisecond(0);

      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-WINDOW-OLD',
        status: 'delivered',
        paymentStatus: 'paid',
        total: 2200,
        createdAt: outsideWindow.toDate()
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-WINDOW-NEW',
        status: 'processing',
        paymentStatus: 'paid',
        total: 4800,
        createdAt: outsideWindow.toDate(),
        paidAt: insideWindow.toDate()
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-WINDOW-QUOTE',
        status: 'pending',
        paymentStatus: 'unpaid',
        total: 1500,
        createdAt: insideWindow.toDate(),
        isQuotation: true
      });
      await createOrderRecord({
        userId: customer._id,
        orderNumber: 'ORD-WINDOW-CONFIRMED',
        status: 'pending',
        paymentStatus: 'unpaid',
        total: 3100,
        createdAt: outsideWindow.toDate(),
        quotationConfirmedAt: insideWindow.toDate()
      });

      await Cart.create({
        user: customer._id,
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            quantity: 2,
            variantIndex: 0
          }
        ],
        createdAt: insideWindow.toDate(),
        updatedAt: insideWindow.toDate()
      });

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.range).toMatchObject({
        period: '7d',
        days: 7
      });
      expect(res.body.data.revenue).toHaveLength(7);
      expect(res.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Revenue')?.value).toBe(4800);
      expect(res.body.data.kpis.find((kpi: { label: string; value: number }) => kpi.label === 'Total Orders')?.value).toBe(1);
      expect(res.body.data.funnel).toEqual([
        { key: 'cart_activity', label: 'Cart Activity', count: 1 },
        { key: 'quotations', label: 'Quotations', count: 1 },
        { key: 'confirmed_orders', label: 'Confirmed Orders', count: 1 }
      ]);
      expect(res.body.data.geographicDistribution).toEqual([
        { district: 'Colombo', orderCount: 1, revenue: 4800 }
      ]);
    },
    TEST_TIMEOUT
  );
});
