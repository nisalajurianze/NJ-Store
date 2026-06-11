import type { SalesAnalysisDto } from '@njstore/types';
import writeXlsxFile from 'write-excel-file/browser';

type WorkbookRow = Record<string, string | number>;

export const exportSalesAnalysisWorkbook = async (salesAnalysis: SalesAnalysisDto): Promise<void> => {
  const sheets: Array<{ name: string; rows: WorkbookRow[] }> = [];
  const appendSheet = (name: string, rows: WorkbookRow[]) => {
    sheets.push({ name, rows });
  };

  appendSheet('Snapshots', [
    {
      Snapshot: salesAnalysis.snapshots.today.label,
      Revenue: salesAnalysis.snapshots.today.revenue,
      Expenses: salesAnalysis.snapshots.today.expenses,
      Net: salesAnalysis.snapshots.today.net,
      Orders: salesAnalysis.snapshots.today.orderCount
    },
    {
      Snapshot: salesAnalysis.snapshots.monthToDate.label,
      Revenue: salesAnalysis.snapshots.monthToDate.revenue,
      Expenses: salesAnalysis.snapshots.monthToDate.expenses,
      Net: salesAnalysis.snapshots.monthToDate.net,
      Orders: salesAnalysis.snapshots.monthToDate.orderCount
    },
    {
      Snapshot: salesAnalysis.snapshots.yearToDate.label,
      Revenue: salesAnalysis.snapshots.yearToDate.revenue,
      Expenses: salesAnalysis.snapshots.yearToDate.expenses,
      Net: salesAnalysis.snapshots.yearToDate.net,
      Orders: salesAnalysis.snapshots.yearToDate.orderCount
    }
  ]);
  appendSheet(
    'Daily Sales',
    salesAnalysis.dailySales.map((point) => ({
      Period: point.period,
      Label: point.label,
      Revenue: point.revenue,
      Expenses: point.expenses,
      Net: point.net,
      Orders: point.orderCount
    }))
  );
  appendSheet(
    'Monthly Sales',
    salesAnalysis.monthlySales.map((point) => ({
      Period: point.period,
      Label: point.label,
      Revenue: point.revenue,
      Expenses: point.expenses,
      Net: point.net,
      Orders: point.orderCount
    }))
  );
  appendSheet(
    'Yearly Sales',
    salesAnalysis.yearlySales.map((point) => ({
      Period: point.period,
      Label: point.label,
      Revenue: point.revenue,
      Expenses: point.expenses,
      Net: point.net,
      Orders: point.orderCount
    }))
  );
  appendSheet(
    'Customer Growth',
    salesAnalysis.customerGrowth.map((point) => ({
      Date: point.date,
      Customers: point.totalCustomers
    }))
  );
  appendSheet(
    'RFM Segments',
    salesAnalysis.rfmSegments.map((segment) => ({
      Segment: segment.label,
      Customers: segment.customerCount,
      TotalRevenue: segment.totalRevenue,
      AverageOrderValue: segment.averageOrderValue,
      AverageRecencyDays: segment.averageRecencyDays
    }))
  );
  appendSheet(
    'RFM Customers',
    salesAnalysis.rfmCustomers.map((customer) => ({
      Customer: customer.name,
      Email: customer.email,
      Segment: customer.segmentLabel,
      Orders: customer.orderCount,
      TotalRevenue: customer.totalRevenue,
      AverageOrderValue: customer.averageOrderValue,
      LastOrderDate: customer.lastOrderDate,
      DaysSinceLastOrder: customer.daysSinceLastOrder
    }))
  );
  appendSheet(
    'Retention Cohorts',
    salesAnalysis.retentionCohorts.map((cohort) =>
      cohort.retention.reduce<Record<string, string | number>>(
        (row, cell) => {
          row[`Month${cell.monthOffset}Label`] = cell.calendarLabel;
          row[`Month${cell.monthOffset}Active`] = cell.activeCustomers ?? '';
          row[`Month${cell.monthOffset}Rate`] = cell.retentionRate ?? '';
          return row;
        },
        {
          Cohort: cohort.cohortLabel,
          CohortMonth: cohort.cohortMonth,
          CohortSize: cohort.cohortSize
        }
      )
    )
  );
  appendSheet(
    'Customer Mining Products',
    salesAnalysis.customerMining.topProducts.map((product) => ({
      Product: product.name,
      Brand: product.brand ?? '',
      Category: product.category ?? '',
      Views: product.viewCount,
      CartAdds: product.cartAdds,
      WishlistAdds: product.wishlistAdds,
      DemandScore: product.demandScore,
      IntentRate: product.intentRate
    }))
  );
  appendSheet(
    'Customer Mining Pages',
    salesAnalysis.customerMining.topPages.map((page) => ({
      Path: page.path,
      PageType: page.pageType,
      Views: page.viewCount,
      UniqueVisitors: page.uniqueVisitors,
      Share: page.share
    }))
  );
  appendSheet(
    'Customer Mining Segments',
    salesAnalysis.customerMining.segments.map((segment) => ({
      Segment: segment.label,
      Visitors: segment.visitorCount,
      Share: segment.share,
      Description: segment.description
    }))
  );
  appendSheet(
    'Tracked Expenses',
    salesAnalysis.expenses.map((expense) => ({
      Label: expense.label,
      Amount: expense.amount,
      IncurredOn: expense.incurredOn,
      Category: expense.category,
      Notes: expense.notes ?? ''
    }))
  );

  const sheetRows = sheets.map((sheet) => {
    const headers = Array.from(
      sheet.rows.reduce<Set<string>>((keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      }, new Set<string>())
    );

    return [
      headers.map((header) => ({ value: header, fontWeight: 'bold' as const })),
      ...sheet.rows.map((row) => headers.map((header) => ({ value: row[header] ?? '' })))
    ];
  });

  await writeXlsxFile(sheetRows, {
    sheets: sheets.map((sheet) => sheet.name),
    fileName: `njstore-sales-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`
  });
};
