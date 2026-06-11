import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@njstore/ui';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminInlineNotice, AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { adminService } from '../../services/adminService';
import { fallbackSalesAnalysis } from './salesAnalysis/salesAnalysisDefaults';
import {
  CustomerGrowthPanel,
  CustomerMiningPanel,
  CustomerRetentionPanel,
  CustomerRfmPanel
} from './salesAnalysis/SalesAnalysisPanels';
import {
  percentageFormatter,
  wholeNumberFormatter
} from './salesAnalysis/salesAnalysisShared';

export const CustomerAnalysis = (): JSX.Element => {
  const navigate = useNavigate();
  const customerAnalysisQuery = useQuery({
    queryKey: ['admin', 'sales-analysis'],
    queryFn: () => adminService.salesAnalysis(),
    refetchInterval: () => (document.visibilityState === 'visible' ? 60_000 : false),
    refetchIntervalInBackground: false
  });

  const salesAnalysis = customerAnalysisQuery.data?.data ?? fallbackSalesAnalysis;
  const latestCustomerTotal = salesAnalysis.customerGrowth.at(-1)?.totalCustomers ?? 0;
  const { summary } = salesAnalysis.customerMining;
  const buyingIntentCount = summary.cartIntentCount + summary.wishlistIntentCount;

  if (customerAnalysisQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow="Customers"
          title="Customer Analysis"
          description="Loading customer growth, behavior mining, retention, and RFM segments."
        />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-[156px] animate-pulse rounded-[24px] bg-white/5" />
          ))}
        </div>
        <Card className="h-[420px] animate-pulse rounded-[24px] bg-white/5" />
      </div>
    );
  }

  if (customerAnalysisQuery.isError) {
    const message =
      customerAnalysisQuery.error instanceof Error
        ? customerAnalysisQuery.error.message
        : 'Unable to load customer analysis right now.';

    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow="Customers"
          title="Customer Analysis"
          description="The dedicated customer workspace could not load its current data."
          action={
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/sales-analysis')}>
              <ArrowLeft className="h-4 w-4" />
              Sales Analysis
            </Button>
          }
        />
        <Card className="rounded-[24px] p-6">
          <p className="text-sm text-red-300">{message}</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void customerAnalysisQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
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
        eyebrow="Customers"
        title="Customer Analysis"
        description="Customer growth, behavior mining, retention cohorts, and RFM segments in one focused workspace."
        action={
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/sales-analysis')}>
            <ArrowLeft className="h-4 w-4" />
            Sales Analysis
          </Button>
        }
      />

      <AdminInlineNotice className="justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold">
          Data mining
        </span>
        <p className="max-w-4xl">
          This page reads customer behavior events, product intent, repeat visits, and paid-order history. The same product demand signal feeds the storefront home recommendations.
        </p>
      </AdminInlineNotice>

      <AdminStatGrid
        className="xl:grid-cols-5"
        items={[
          {
            label: 'Total customers',
            value: wholeNumberFormatter.format(latestCustomerTotal),
            support: 'Latest total from the customer growth series.',
            tone: 'gold'
          },
          {
            label: 'Tracked visitors',
            value: wholeNumberFormatter.format(summary.uniqueVisitors),
            support: `${wholeNumberFormatter.format(summary.repeatVisitors)} returning visitors in the mining window.`,
            tone: 'emerald'
          },
          {
            label: 'Product views',
            value: wholeNumberFormatter.format(summary.totalProductViews),
            support: `${wholeNumberFormatter.format(summary.totalPageViews)} total page views captured.`,
            tone: 'blue'
          },
          {
            label: 'Buying intent',
            value: wholeNumberFormatter.format(buyingIntentCount),
            support: 'Cart and wishlist actions from customer behavior.',
            tone: 'gold'
          },
          {
            label: 'Return rate',
            value: percentageFormatter.format(summary.returningVisitorRate),
            support: `${wholeNumberFormatter.format(summary.siteEngagementScore)} engagement score.`,
            tone: 'slate'
          }
        ]}
      />

      <CustomerGrowthPanel customerGrowth={salesAnalysis.customerGrowth} />

      <CustomerMiningPanel customerMining={salesAnalysis.customerMining} />

      <CustomerRfmPanel rfmSegments={salesAnalysis.rfmSegments} rfmCustomers={salesAnalysis.rfmCustomers} />

      <CustomerRetentionPanel retentionCohorts={salesAnalysis.retentionCohorts} />
    </div>
  );
};
