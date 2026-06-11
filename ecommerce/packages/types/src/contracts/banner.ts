import type { ProductCardDto } from './catalog.js';
import type { ImageAsset } from './common.js';

export type BannerKey = 'home-hero';
export type BannerMediaKind = 'image' | 'video';
export type HomeAdSlotKey = 'slot-1' | 'slot-2' | 'slot-3';
export type BannerShowcaseFeatureIconKey = 'camera' | 'memory' | 'storage' | 'battery' | 'display' | 'chip' | 'audio' | 'connectivity';

export interface BannerMediaAsset {
  kind: BannerMediaKind;
  url: string;
  publicId: string;
  alt?: string;
  poster?: ImageAsset;
}

export interface BannerAdSlotDto {
  slotKey: HomeAdSlotKey;
  eyebrow?: string;
  title: string;
  description?: string;
  ctaUrl?: string;
  mediaItems?: BannerMediaAsset[];
  isActive: boolean;
}

export interface BannerAdSlotMutationDto {
  slotKey: HomeAdSlotKey;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaUrl?: string;
  mediaItems?: BannerMediaAsset[];
  isActive: boolean;
}

export interface BannerFeaturePromoDto {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  mediaItems?: BannerMediaAsset[];
  isActive: boolean;
}

export interface BannerFeaturePromoMutationDto {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  mediaItems?: BannerMediaAsset[];
  isActive: boolean;
}

export interface BannerShowcaseFeatureItemDto {
  icon: BannerShowcaseFeatureIconKey;
  label: string;
  value: string;
}

export interface BannerShowcaseFeatureGroupDto {
  productId: string;
  items: BannerShowcaseFeatureItemDto[];
}

export interface BannerDto {
  id: string;
  key: BannerKey;
  campaignLabel: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  accentText?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  heroCornerImage?: ImageAsset;
  heroCornerImageEnabled?: boolean;
  heroCornerImageSize?: number;
  heroBottomLeftImage?: ImageAsset;
  heroBottomLeftImageEnabled?: boolean;
  heroBottomLeftImageSize?: number;
  heroBottomRightImage?: ImageAsset;
  heroBottomRightImageEnabled?: boolean;
  heroBottomRightImageSize?: number;
  backgroundImage?: ImageAsset;
  adSlots: BannerAdSlotDto[];
  featurePromo?: BannerFeaturePromoDto;
  heroSpotlightProduct?: ProductCardDto;
  showcaseProducts: ProductCardDto[];
  showcaseFeatureGroups?: BannerShowcaseFeatureGroupDto[];
  isActive: boolean;
  updatedAt?: string;
}

export interface BannerMutationDto {
  campaignLabel: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  accentText?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  heroCornerImage?: ImageAsset;
  heroCornerImageEnabled?: boolean;
  heroCornerImageSize?: number;
  heroBottomLeftImage?: ImageAsset;
  heroBottomLeftImageEnabled?: boolean;
  heroBottomLeftImageSize?: number;
  heroBottomRightImage?: ImageAsset;
  heroBottomRightImageEnabled?: boolean;
  heroBottomRightImageSize?: number;
  backgroundImage?: ImageAsset;
  adSlots: BannerAdSlotMutationDto[];
  featurePromo?: BannerFeaturePromoMutationDto;
  heroSpotlightProductId?: string;
  showcaseProductIds: string[];
  showcaseFeatureGroups?: BannerShowcaseFeatureGroupDto[];
  isActive: boolean;
}
