import { z } from 'zod';
export declare const passwordSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const postalCodeSchema: z.ZodString;
export declare const objectIdSchema: z.ZodString;
export declare const imageAssetSchema: z.ZodObject<{
    url: z.ZodString;
    publicId: z.ZodString;
    alt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    publicId: string;
    alt?: string | undefined;
}, {
    url: string;
    publicId: string;
    alt?: string | undefined;
}>;
export declare const addressSchema: z.ZodObject<{
    label: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    district: z.ZodString;
    postalCode: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
    isDefault?: boolean | undefined;
}, {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    district: string;
    postalCode: string;
    line2?: string | undefined;
    country?: string | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const checkoutItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    variantIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    variantIndex?: number | undefined;
}, {
    productId: string;
    quantity: number;
    variantIndex?: number | undefined;
}>;
export declare const shopFilterParamsSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodEnum<["new", "used"]>>;
    minPrice: z.ZodOptional<z.ZodString>;
    maxPrice: z.ZodOptional<z.ZodString>;
    rating: z.ZodOptional<z.ZodString>;
    inStock: z.ZodOptional<z.ZodString>;
    bestSeller: z.ZodOptional<z.ZodString>;
    flashDeal: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodEnum<["-createdAt", "popular", "price_asc", "price_desc", "rating"]>>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
    sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
    category?: string | undefined;
    brand?: string | undefined;
    condition?: "new" | "used" | undefined;
    minPrice?: string | undefined;
    maxPrice?: string | undefined;
    rating?: string | undefined;
    inStock?: string | undefined;
    bestSeller?: string | undefined;
    flashDeal?: string | undefined;
}, {
    q?: string | undefined;
    sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
    category?: string | undefined;
    brand?: string | undefined;
    condition?: "new" | "used" | undefined;
    minPrice?: string | undefined;
    maxPrice?: string | undefined;
    rating?: string | undefined;
    inStock?: string | undefined;
    bestSeller?: string | undefined;
    flashDeal?: string | undefined;
}>;
export declare const shopFilterPresetSchema: z.ZodObject<{
    params: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        brand: z.ZodOptional<z.ZodString>;
        condition: z.ZodOptional<z.ZodEnum<["new", "used"]>>;
        minPrice: z.ZodOptional<z.ZodString>;
        maxPrice: z.ZodOptional<z.ZodString>;
        rating: z.ZodOptional<z.ZodString>;
        inStock: z.ZodOptional<z.ZodString>;
        bestSeller: z.ZodOptional<z.ZodString>;
        flashDeal: z.ZodOptional<z.ZodString>;
        sort: z.ZodOptional<z.ZodEnum<["-createdAt", "popular", "price_asc", "price_desc", "rating"]>>;
    }, "strip", z.ZodTypeAny, {
        q?: string | undefined;
        sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
        category?: string | undefined;
        brand?: string | undefined;
        condition?: "new" | "used" | undefined;
        minPrice?: string | undefined;
        maxPrice?: string | undefined;
        rating?: string | undefined;
        inStock?: string | undefined;
        bestSeller?: string | undefined;
        flashDeal?: string | undefined;
    }, {
        q?: string | undefined;
        sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
        category?: string | undefined;
        brand?: string | undefined;
        condition?: "new" | "used" | undefined;
        minPrice?: string | undefined;
        maxPrice?: string | undefined;
        rating?: string | undefined;
        inStock?: string | undefined;
        bestSeller?: string | undefined;
        flashDeal?: string | undefined;
    }>;
    savedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    params: {
        q?: string | undefined;
        sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
        category?: string | undefined;
        brand?: string | undefined;
        condition?: "new" | "used" | undefined;
        minPrice?: string | undefined;
        maxPrice?: string | undefined;
        rating?: string | undefined;
        inStock?: string | undefined;
        bestSeller?: string | undefined;
        flashDeal?: string | undefined;
    };
    savedAt: string;
}, {
    params: {
        q?: string | undefined;
        sort?: "rating" | "-createdAt" | "popular" | "price_asc" | "price_desc" | undefined;
        category?: string | undefined;
        brand?: string | undefined;
        condition?: "new" | "used" | undefined;
        minPrice?: string | undefined;
        maxPrice?: string | undefined;
        rating?: string | undefined;
        inStock?: string | undefined;
        bestSeller?: string | undefined;
        flashDeal?: string | undefined;
    };
    savedAt: string;
}>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type ShopFilterPresetInput = z.infer<typeof shopFilterPresetSchema>;
