import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuditLogDto } from '@njstore/types';
import { Badge, Button } from '@njstore/ui';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid, adminFormFieldClassName } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';

interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const auditGridClass =
  'grid min-w-[1180px] grid-cols-[minmax(0,0.86fr)_minmax(0,0.88fr)_minmax(0,0.82fr)_minmax(0,0.95fr)_minmax(0,0.5fr)_minmax(0,1.15fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,0.82fr)_minmax(0,0.78fr)_minmax(0,0.9fr)_minmax(0,0.46fr)_minmax(0,1.12fr)] lg:gap-3';

const statusVariantMap: Record<AuditLogDto['status'], 'success' | 'danger' | 'warning'> = {
  success: 'success',
  failure: 'danger',
  blocked: 'warning'
};

const roleVariantMap: Record<AuditLogDto['actorRole'], 'info' | 'default'> = {
  admin: 'info',
  customer: 'default',
  staff: 'info',
  system: 'default'
};

const formatAuditAction = (value: string): string =>
  value
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' / ');

interface AuditAnomalyAlert {
  id: string;
  badge: string;
  title: string;
  detail: string;
}

const BURST_ACTIVITY_THRESHOLD = 5;
const BURST_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
const REPEATED_DENIAL_THRESHOLD = 3;
const REPEATED_DENIAL_WINDOW_MS = 15 * 60 * 1000;

const getAuditActorLabel = (entry: AuditLogDto): string => {
  if (entry.actorEmail?.trim()) {
    return entry.actorEmail.trim();
  }

  if (entry.ipAddress?.trim()) {
    return `IP ${entry.ipAddress.trim()}`;
  }

  return entry.actorRole === 'system' ? 'System' : `${entry.actorRole} actor`;
};

const getAuditActorKey = (entry: AuditLogDto): string => {
  if (entry.actorEmail?.trim()) {
    return `email:${entry.actorEmail.trim().toLowerCase()}`;
  }

  if (entry.ipAddress?.trim()) {
    return `ip:${entry.ipAddress.trim()}`;
  }

  return `role:${entry.actorRole}`;
};

const findPeakWindow = (entries: AuditLogDto[], windowMs: number): { count: number; items: AuditLogDto[] } => {
  if (!entries.length) {
    return { count: 0, items: [] };
  }

  const sortedEntries = [...entries].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  let windowStart = 0;
  let bestCount = 0;
  let bestItems: AuditLogDto[] = [];

  for (let index = 0; index < sortedEntries.length; index += 1) {
    const currentTime = new Date(sortedEntries[index].createdAt).getTime();

    while (windowStart <= index && currentTime - new Date(sortedEntries[windowStart].createdAt).getTime() > windowMs) {
      windowStart += 1;
    }

    const currentItems = sortedEntries.slice(windowStart, index + 1);
    if (currentItems.length > bestCount) {
      bestCount = currentItems.length;
      bestItems = currentItems;
    }
  }

  return {
    count: bestCount,
    items: bestItems
  };
};

const buildStatusSummary = (entries: AuditLogDto[]): string => {
  const blockedCount = entries.filter((entry) => entry.status === 'blocked').length;
  const failureCount = entries.filter((entry) => entry.status === 'failure').length;
  const summaryParts = [
    blockedCount > 0 ? `${blockedCount} blocked` : null,
    failureCount > 0 ? `${failureCount} failed` : null
  ].filter((value): value is string => Boolean(value));

  return summaryParts.join(', ');
};

const detectAuditAnomalies = (entries: AuditLogDto[]): AuditAnomalyAlert[] => {
  const groupedEntries = entries.reduce<Map<string, AuditLogDto[]>>((accumulator, entry) => {
    const key = getAuditActorKey(entry);
    const existingEntries = accumulator.get(key) ?? [];
    existingEntries.push(entry);
    accumulator.set(key, existingEntries);
    return accumulator;
  }, new Map<string, AuditLogDto[]>());

  const alerts: Array<AuditAnomalyAlert & { severity: number }> = [];

  for (const [key, actorEntries] of groupedEntries.entries()) {
    const actorLabel = getAuditActorLabel(actorEntries[0]);
    const burstWindow = findPeakWindow(actorEntries, BURST_ACTIVITY_WINDOW_MS);

    if (burstWindow.count >= BURST_ACTIVITY_THRESHOLD) {
      alerts.push({
        id: `burst:${key}`,
        badge: 'Burst activity',
        title: `${burstWindow.count} actions from ${actorLabel} in 5 minutes`,
        detail: 'High-volume activity appeared inside the current result window. Review intent, affected targets, and recent admin context.',
        severity: burstWindow.count
      });
    }

    const deniedEntries = actorEntries.filter((entry) => entry.status === 'blocked' || entry.status === 'failure');
    const deniedWindow = findPeakWindow(deniedEntries, REPEATED_DENIAL_WINDOW_MS);

    if (deniedWindow.count >= REPEATED_DENIAL_THRESHOLD) {
      const statusSummary = buildStatusSummary(deniedWindow.items);
      alerts.push({
        id: `denied:${key}`,
        badge: 'Repeated denials',
        title: `${deniedWindow.count} blocked or failed actions from ${actorLabel} in 15 minutes`,
        detail: statusSummary
          ? `This cluster includes ${statusSummary}. Repeated denials can point to brute-force attempts, permission drift, or a broken workflow.`
          : 'Repeated denials can point to brute-force attempts, permission drift, or a broken workflow.',
        severity: deniedWindow.count
      });
    }
  }

  return alerts
    .sort((left, right) => right.severity - left.severity || left.title.localeCompare(right.title))
    .slice(0, 3)
    .map(({ severity: _severity, ...alert }) => alert);
};

export const AuditLogs = (): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AuditLogDto['status']>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | AuditLogDto['actorRole']>('all');
  const [isExporting, setIsExporting] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
    []
  );

  const auditLogs = useQuery<ListQueryResult<AuditLogDto>>({
    queryKey: ['admin', 'audit-logs', deferredSearch, statusFilter, roleFilter],
    queryFn: async () =>
      (await adminService.auditLogs({
        limit: 50,
        search: deferredSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        actorRole: roleFilter === 'all' ? undefined : roleFilter
      })) as ListQueryResult<AuditLogDto>
  });

  const items = auditLogs.data?.data ?? [];
  const total = auditLogs.data?.pagination?.total ?? items.length;
  const blockedCount = items.filter((entry) => entry.status === 'blocked').length;
  const failureCount = items.filter((entry) => entry.status === 'failure').length;
  const anomalyAlerts = useMemo(() => detectAuditAnomalies(items), [items]);
  const exportFilters = {
    search: deferredSearch.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    actorRole: roleFilter === 'all' ? undefined : roleFilter
  };

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);

    try {
      await adminService.exportAuditLogsCsv(exportFilters);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export audit logs right now.'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Security"
        title="Audit Logs"
        description="Track authentication events, admin changes, receipt handling, coupon usage, and order workflow actions in one refreshed audit workspace."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => void handleExport()} isLoading={isExporting} loadingLabel="Preparing">
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={() => void auditLogs.refetch()} isLoading={auditLogs.isFetching}>
              Refresh
            </Button>
          </div>
        }
        meta={[
          {
            label: 'Entries loaded',
            value: total.toLocaleString(),
            support: 'Audit records currently returned by the live query.',
            tone: 'blue'
          },
          {
            label: 'Blocked events',
            value: blockedCount.toLocaleString(),
            support: blockedCount > 0 ? 'Some operations were blocked and may need review.' : 'No blocked events in the current result set.',
            tone: blockedCount > 0 ? 'rose' : 'emerald'
          }
        ]}
      />

      <AdminStatGrid
        items={[
          {
            label: 'Loaded entries',
            value: total.toLocaleString(),
            support: 'Records visible after the current server query.',
            tone: 'slate'
          },
          {
            label: 'Blocked',
            value: blockedCount.toLocaleString(),
            support: 'Operations denied by a rule, status gate, or permission check.',
            tone: blockedCount > 0 ? 'rose' : 'slate'
          },
          {
            label: 'Failures',
            value: failureCount.toLocaleString(),
            support: 'Events that completed with an error status.',
            tone: failureCount > 0 ? 'rose' : 'slate'
          },
          {
            label: 'Alerts',
            value: anomalyAlerts.length.toLocaleString(),
            support:
              anomalyAlerts.length > 0
                ? 'Suspicious bursts or repeat denied actions were detected in the loaded result window.'
                : 'No suspicious bursts or repeat denied actions were detected in the loaded result window.',
            tone: anomalyAlerts.length > 0 ? 'rose' : 'emerald'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_190px_190px]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by email, action, target, message, or identifier"
            label="Search audit logs"
            resultCount={items.length}
            totalCount={total}
          />

          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={adminFormFieldClassName}>
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>

          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Actor role</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} className={adminFormFieldClassName}>
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
              <option value="system">System</option>
            </select>
          </label>
        </div>
      </AdminControlPanel>

      {items.length > 0 ? (
        <AdminInlineNotice className="items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                  anomalyAlerts.length > 0 ? 'border-red-400/20 bg-red-400/10 text-red-200' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                }`}
              >
                {anomalyAlerts.length > 0 ? 'Anomaly watch' : 'Watch clear'}
              </span>
              <p className="text-sm text-gray-200">
                {anomalyAlerts.length > 0
                  ? `${anomalyAlerts.length} alert${anomalyAlerts.length === 1 ? '' : 's'} active in the current query window.`
                  : 'No suspicious bursts or repeated denied actions were detected in the current query window.'}
              </p>
            </div>
            {anomalyAlerts.length > 0 ? (
              <div className="grid gap-2 xl:grid-cols-3">
                {anomalyAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-[16px] border border-white/10 bg-white/[0.04] px-3.5 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-red-200">{alert.badge}</p>
                    <p className="mt-2 text-sm font-medium text-white">{alert.title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{alert.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-gray-400">
                Alerts are derived from the currently loaded entries after filters and can highlight traffic bursts or repeat blocked and failed actions.
              </p>
            )}
          </div>
        </AdminInlineNotice>
      ) : null}

      <AdminDataGrid
        headers={['Time', 'Actor', 'Action', 'Target', 'Status', 'Details']}
        gridClassName={auditGridClass}
        hasRows={items.length > 0}
        emptyMessage="No audit log entries matched the current filters."
      >
        {items.map((entry) => {
          const metadataPreview = entry.metadata
            ? Object.entries(entry.metadata)
                .slice(0, 3)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(' | ')
            : '';

          return (
            <div key={entry.id} className={`${auditGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
              <div className="space-y-1">
                <p className="font-medium text-white">{formatter.format(new Date(entry.createdAt))}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{entry.id.slice(-8)}</p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-white">{entry.actorEmail ?? 'System event'}</p>
                <Badge variant={roleVariantMap[entry.actorRole]} className="capitalize">
                  {entry.actorRole}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="font-medium capitalize text-white">{formatAuditAction(entry.action)}</p>
                <p className="font-mono text-xs text-gray-500">{entry.action}</p>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-white">{entry.targetLabel ?? `${entry.targetType ?? 'record'} item`}</p>
                <p className="text-xs text-gray-500">
                  {[entry.targetType, entry.targetId].filter(Boolean).join(' | ') || 'No target metadata'}
                </p>
              </div>

              <div className="space-y-2">
                <Badge variant={statusVariantMap[entry.status]} className="capitalize">
                  {entry.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-white">{entry.message ?? 'No additional detail provided.'}</p>
                {metadataPreview ? <p className="text-xs text-gray-500">{metadataPreview}</p> : null}
                {entry.ipAddress ? <p className="text-xs text-gray-500">IP {entry.ipAddress}</p> : null}
              </div>
            </div>
          );
        })}
      </AdminDataGrid>
    </div>
  );
};
