import { AuditLog } from '../models/AuditLog.js';
import { buildSafeRegex } from '../utils/regex.js';
import { logger } from '../utils/logger.js';
const sanitizeMetadata = (metadata) => {
    if (!metadata) {
        return undefined;
    }
    const result = Object.entries(metadata).reduce((accumulator, [key, value]) => {
        if (key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('cookie')) {
            return accumulator;
        }
        accumulator[key] = value;
        return accumulator;
    }, {});
    return Object.keys(result).length > 0 ? result : undefined;
};
const buildAuditLogQuery = (filters = {}) => {
    const query = {};
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.actorRole) {
        query.actorRole = filters.actorRole;
    }
    if (filters.action?.trim()) {
        query.action = buildSafeRegex(filters.action);
    }
    if (filters.search?.trim()) {
        const pattern = buildSafeRegex(filters.search);
        query.$or = [
            { actorEmail: pattern },
            { action: pattern },
            { targetType: pattern },
            { targetId: pattern },
            { targetLabel: pattern },
            { message: pattern }
        ];
    }
    return query;
};
const escapeCsv = (value) => `"${value.replace(/"/g, '""')}"`;
export const auditLogService = {
    record: async (input) => {
        try {
            await AuditLog.create({
                actorUser: input.actorUserId,
                actorEmail: input.actorEmail,
                actorRole: input.actorRole ?? 'system',
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId,
                targetLabel: input.targetLabel,
                status: input.status ?? 'success',
                message: input.message,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                metadata: sanitizeMetadata(input.metadata)
            });
        }
        catch (error) {
            logger.error(`audit.record.failed action=${input.action} target=${input.targetType ?? 'unknown'}:${input.targetId ?? 'unknown'} error=${error instanceof Error ? error.message : 'unknown'}`);
        }
    },
    list: async (filters = {}) => {
        const safePage = Math.max(1, filters.page ?? 1);
        const safeLimit = Math.min(100, Math.max(1, filters.limit ?? 25));
        const query = buildAuditLogQuery(filters);
        const [items, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .lean(),
            AuditLog.countDocuments(query)
        ]);
        return {
            items: items.map((item) => ({
                id: String(item._id),
                actorUserId: item.actorUser ? String(item.actorUser) : undefined,
                actorEmail: item.actorEmail,
                actorRole: item.actorRole,
                action: item.action,
                targetType: item.targetType,
                targetId: item.targetId,
                targetLabel: item.targetLabel,
                status: item.status,
                message: item.message,
                ipAddress: item.ipAddress,
                userAgent: item.userAgent,
                metadata: (item.metadata ?? undefined),
                createdAt: item.createdAt.toISOString()
            })),
            total,
            page: safePage,
            limit: safeLimit
        };
    },
    exportCsv: async (filters = {}) => {
        const items = await AuditLog.find(buildAuditLogQuery(filters)).sort({ createdAt: -1 }).lean();
        const rows = [
            [
                'Entry ID',
                'Timestamp',
                'Actor Email',
                'Actor Role',
                'Action',
                'Target Type',
                'Target ID',
                'Target Label',
                'Status',
                'Message',
                'IP Address',
                'User Agent',
                'Metadata'
            ].map(escapeCsv).join(',')
        ];
        for (const item of items) {
            rows.push([
                escapeCsv(String(item._id)),
                escapeCsv(item.createdAt.toISOString()),
                escapeCsv(item.actorEmail ?? ''),
                escapeCsv(item.actorRole),
                escapeCsv(item.action),
                escapeCsv(item.targetType ?? ''),
                escapeCsv(item.targetId ?? ''),
                escapeCsv(item.targetLabel ?? ''),
                escapeCsv(item.status),
                escapeCsv(item.message ?? ''),
                escapeCsv(item.ipAddress ?? ''),
                escapeCsv(item.userAgent ?? ''),
                escapeCsv(item.metadata ? JSON.stringify(item.metadata) : '')
            ].join(','));
        }
        return {
            csv: rows.join('\n'),
            count: items.length,
            filename: `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
        };
    }
};
