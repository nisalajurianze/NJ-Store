import type { ReturnRequestStatus } from '../constants/enums.js';
import type { ImageAsset } from './common.js';
export interface ReturnRequestItemDto {
    product: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    variantIndex?: number;
}
export interface ReturnRequestEvidenceDto extends ImageAsset {
    uploadedBy?: 'customer' | 'admin';
    uploadedAt?: string;
}
export interface ReturnRequestDto {
    id: string;
    orderId: string;
    orderNumber: string;
    status: ReturnRequestStatus;
    reason: string;
    adminNote?: string;
    refundAmount: number;
    refundPercent: number;
    items: ReturnRequestItemDto[];
    evidence: ReturnRequestEvidenceDto[];
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    refundedAt?: string;
}
export interface AdminReturnRequestDto extends ReturnRequestDto {
    customer: {
        id: string;
        name: string;
        email: string;
    };
    handledBy?: {
        id: string;
        name: string;
        email: string;
    };
}
