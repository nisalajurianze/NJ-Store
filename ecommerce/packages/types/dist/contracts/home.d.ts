import type { BannerDto } from './banner.js';
import type { BrandDto, ProductCardDto, ProductDetailDto } from './catalog.js';
export interface HomeFeedDto {
    featured: ProductCardDto[];
    banner: BannerDto;
    latest: ProductCardDto[];
    flashDeals: ProductCardDto[];
    wantedProducts: ProductCardDto[];
    brands: BrandDto[];
    recentlyViewed: ProductDetailDto[];
}
