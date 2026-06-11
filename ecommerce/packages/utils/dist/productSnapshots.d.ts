import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
export type ProductSnapshotInput = ProductCardDto | ProductDetailDto;
export declare const toProductDetailSnapshot: (product: ProductSnapshotInput) => ProductDetailDto;
