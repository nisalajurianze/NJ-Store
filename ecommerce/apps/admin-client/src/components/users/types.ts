import type { AdminUserLoginEntryDto, AdminUserOrderStatsDto, AdminUserSummaryDto } from '@njstore/types';

export type UserRecord = Pick<
  AdminUserSummaryDto,
  'id' | 'name' | 'email' | 'role' | 'isActive' | 'permissions' | 'isEmailVerified' | 'loyaltyPoints' | 'authProvider' | 'phone'
>;

export type LoginHistoryRecord = AdminUserLoginEntryDto;

export type UserOrderStats = AdminUserOrderStatsDto;

export interface BroadcastFormState {
  subject: string;
  previewText: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

export type BroadcastFormErrors = Partial<Record<keyof BroadcastFormState, string>>;

export interface RoleOption {
  value: UserRecord['role'];
  label: string;
  description: string;
  support: string;
}
