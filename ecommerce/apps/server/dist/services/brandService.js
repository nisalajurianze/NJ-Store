import { Types } from 'mongoose';
import { slugify } from '@njstore/utils';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { cacheNamespaces, cacheService, buildStableCacheSuffix, invalidateInventoryDerivedCaches } from './cacheService.js';
import { AppError } from '../utils/AppError.js';
import { removeAsset, uploadBuffer } from './uploadService.js';
import { serializeBrand } from '../utils/serializers.js';
const BRAND_CACHE_TTL_SECONDS = 5 * 60;
const buildBrandNameQuery = (name, currentId) => ({
    name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    ...(currentId ? { _id: { $ne: currentId } } : {})
});
const generateUniqueBrandSlug = async (name, currentId) => {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let counter = 1;
    while (true) {
        const existing = await Brand.findOne({
            slug: candidate,
            ...(currentId ? { _id: { $ne: currentId } } : {})
        })
            .select('_id')
            .lean();
        if (!existing) {
            return candidate;
        }
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }
};
const withProductCounts = async (brands) => {
    const counts = await Product.aggregate([
        {
            $match: {
                brand: { $in: brands.map((brand) => new Types.ObjectId(brand._id.toString())) },
                isActive: true
            }
        },
        { $group: { _id: '$brand', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));
    return brands
        .map((brand) => serializeBrand({ ...brand, productCount: countMap.get(brand._id.toString()) ?? 0 }))
        .filter((entry) => Boolean(entry));
};
const listBrandDocuments = async ({ activeOnly = false, search, sortBy = 'sortOrder' }) => {
    const filter = {};
    if (activeOnly) {
        filter.isActive = true;
    }
    if (search?.trim()) {
        filter.name = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    return Brand.find(filter)
        .sort(sortBy === 'name' ? { name: 1, sortOrder: 1 } : { sortOrder: 1, name: 1 })
        .lean({ virtuals: true });
};
export const brandService = {
    listBrands: async ({ activeOnly = false, search, sortBy = 'sortOrder', includeProductCounts = false } = {}) => cacheService.rememberVersioned(cacheNamespaces.brands, `list:${buildStableCacheSuffix({ activeOnly, search, sortBy, includeProductCounts })}`, BRAND_CACHE_TTL_SECONDS, async () => {
        const brands = await listBrandDocuments({ activeOnly, search, sortBy });
        if (includeProductCounts) {
            return withProductCounts(brands);
        }
        return brands.map((brand) => serializeBrand(brand)).filter((entry) => Boolean(entry));
    }),
    getBrandById: async (brandId) => {
        const brand = await Brand.findById(brandId).lean({ virtuals: true });
        if (!brand) {
            throw new AppError('Brand not found', 404);
        }
        const serialized = serializeBrand(brand);
        if (!serialized) {
            throw new AppError('Brand not found', 404);
        }
        return serialized;
    },
    getBrandBySlug: async (slug, activeOnly = true) => {
        const brand = await Brand.findOne({
            slug,
            ...(activeOnly ? { isActive: true } : {})
        }).lean({ virtuals: true });
        if (!brand) {
            throw new AppError('Brand not found', 404);
        }
        const serialized = serializeBrand(brand);
        if (!serialized) {
            throw new AppError('Brand not found', 404);
        }
        return serialized;
    },
    createBrand: async (payload) => {
        const duplicate = await Brand.findOne(buildBrandNameQuery(payload.name))
            .select('_id')
            .lean();
        if (duplicate) {
            throw new AppError('A brand with that name already exists', 400);
        }
        const brand = await Brand.create({
            name: payload.name.trim(),
            slug: await generateUniqueBrandSlug(payload.name),
            logo: payload.logo,
            description: payload.description?.trim() || undefined,
            isActive: payload.isActive ?? true,
            sortOrder: payload.sortOrder ?? 0
        });
        await Promise.all([
            cacheService.bumpNamespace(cacheNamespaces.brands),
            invalidateInventoryDerivedCaches()
        ]);
        const serialized = serializeBrand(brand.toObject({ virtuals: true }));
        if (!serialized) {
            throw new AppError('Brand could not be created', 500);
        }
        return serialized;
    },
    updateBrand: async (brandId, payload) => {
        const brand = await Brand.findById(brandId);
        if (!brand) {
            throw new AppError('Brand not found', 404);
        }
        if (payload.name?.trim()) {
            const duplicate = await Brand.findOne(buildBrandNameQuery(payload.name, brandId))
                .select('_id')
                .lean();
            if (duplicate) {
                throw new AppError('A brand with that name already exists', 400);
            }
            brand.name = payload.name.trim();
            brand.slug = await generateUniqueBrandSlug(payload.name, brandId);
        }
        if (payload.logo !== undefined) {
            if (brand.logo?.publicId && payload.logo?.publicId !== brand.logo.publicId) {
                await removeAsset(brand.logo.publicId);
            }
            brand.logo = payload.logo;
        }
        if (payload.description !== undefined) {
            brand.description = payload.description?.trim() || undefined;
        }
        if (payload.isActive !== undefined) {
            brand.isActive = payload.isActive;
        }
        if (payload.sortOrder !== undefined) {
            brand.sortOrder = payload.sortOrder;
        }
        await brand.save();
        await Promise.all([
            Product.updateMany({ brand: brand._id }, { $set: { brandName: brand.name } }),
            cacheService.bumpNamespace(cacheNamespaces.brands),
            invalidateInventoryDerivedCaches()
        ]);
        const serialized = serializeBrand(brand.toObject({ virtuals: true }));
        if (!serialized) {
            throw new AppError('Brand not found', 404);
        }
        return serialized;
    },
    deleteBrand: async (brandId) => {
        const brand = await Brand.findById(brandId);
        if (!brand) {
            throw new AppError('Brand not found', 404);
        }
        const linkedProductCount = await Product.countDocuments({ brand: brand._id });
        if (linkedProductCount > 0) {
            throw new AppError('This brand is linked to existing products. Deactivate it or reassign those products first.', 400);
        }
        if (brand.logo?.publicId) {
            await removeAsset(brand.logo.publicId);
        }
        await brand.deleteOne();
        await Promise.all([
            cacheService.bumpNamespace(cacheNamespaces.brands),
            invalidateInventoryDerivedCaches()
        ]);
    },
    uploadBrandLogo: async (file, baseUrl, alt) => uploadBuffer({
        file,
        folder: 'brands',
        baseUrl,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        alt,
        resourceType: 'image'
    }),
    resolveBrandReference: async (brandId) => {
        if (!brandId) {
            return { brand: null, brandName: undefined };
        }
        if (!Types.ObjectId.isValid(brandId)) {
            throw new AppError('Brand not found', 404);
        }
        const brand = await Brand.findById(brandId)
            .select('_id name isActive')
            .lean();
        if (!brand) {
            throw new AppError('Brand not found', 404);
        }
        return {
            brand: brand._id,
            brandName: brand.name
        };
    },
    resolveBrandFilterIds: async (values) => {
        if (!values?.length) {
            return undefined;
        }
        const normalizedValues = values.map((value) => value.trim()).filter(Boolean);
        if (!normalizedValues.length) {
            return undefined;
        }
        const objectIdValues = normalizedValues.filter((value) => Types.ObjectId.isValid(value)).map((value) => new Types.ObjectId(value));
        const nonObjectIdValues = normalizedValues.filter((value) => !Types.ObjectId.isValid(value));
        const brands = await Brand.find({
            isActive: true,
            $or: [
                ...(objectIdValues.length ? [{ _id: { $in: objectIdValues } }] : []),
                ...(nonObjectIdValues.length
                    ? [
                        { slug: { $in: nonObjectIdValues.map((value) => value.toLowerCase()) } },
                        { name: { $in: nonObjectIdValues.map((value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }
                    ]
                    : [])
            ]
        })
            .select('_id')
            .lean();
        return brands.map((brand) => brand._id);
    },
    resolveOrCreateBrandByName: async (name) => {
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new AppError('Brand is required', 400);
        }
        const existing = await Brand.findOne(buildBrandNameQuery(normalizedName))
            .select('_id name')
            .lean();
        if (existing) {
            return { brand: existing._id, brandName: existing.name };
        }
        const sortOrder = await Brand.countDocuments();
        const created = await Brand.create({
            name: normalizedName,
            slug: await generateUniqueBrandSlug(normalizedName),
            isActive: true,
            sortOrder
        });
        await cacheService.bumpNamespace(cacheNamespaces.brands);
        return { brand: created._id, brandName: created.name };
    }
};
