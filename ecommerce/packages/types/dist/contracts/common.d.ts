import type { AdminPermission } from '../constants/admin.js';
import type { Language, Role } from '../constants/enums.js';
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    pagination?: PaginationMeta;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface PaginatedResult<T> {
    items: T[];
    pagination: PaginationMeta;
}
export interface ImageAsset {
    url: string;
    publicId: string;
    alt?: string;
    srcSet?: string;
    sizes?: string;
}
export interface AddressDto {
    _id?: string;
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
}
export type ShopFilterPresetParamKey = 'q' | 'category' | 'brand' | 'condition' | 'minPrice' | 'maxPrice' | 'rating' | 'inStock' | 'bestSeller' | 'flashDeal' | 'sort';
export interface ShopFilterPresetDto {
    params: Partial<Record<ShopFilterPresetParamKey, string>>;
    savedAt: string;
}
export interface ShopPreferencesDto {
    myFilters?: ShopFilterPresetDto;
}
export interface UserSummary {
    id: string;
    name: string;
    email: string;
    role: Role;
    authProvider?: 'local' | 'google';
    avatar?: ImageAsset;
    phone?: string;
    language: Language;
    isEmailVerified: boolean;
    loyaltyPoints: number;
    isActive?: boolean;
    permissions?: AdminPermission[];
    shopPreferences?: ShopPreferencesDto;
}
export interface SessionDto {
    id: string;
    ipAddress?: string;
    userAgent?: string;
    isCurrent: boolean;
    expiresAt: string;
    createdAt: string;
}
export interface LoyaltyTransactionDto {
    id: string;
    order?: string;
    type: 'earned' | 'redeemed' | 'adjusted';
    points: number;
    description: string;
    createdAt: string;
}
export interface AnalyticsKpi {
    label: string;
    value: number;
    delta: number;
    currency?: boolean;
}
