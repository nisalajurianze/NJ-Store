import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { slugify } from '@njstore/utils';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const generateUniqueBrandSlug = async (name, currentId) => {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let counter = 1;
    while (true) {
        const existing = await Brand.findOne({
            slug: candidate,
            ...(currentId ? { _id: { $ne: currentId } } : {})
        }).select('_id');
        if (!existing) {
            return candidate;
        }
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }
};
const findOrCreateBrand = async (name, sortOrderSeed) => {
    const normalizedName = name.trim();
    const existing = await Brand.findOne({
        name: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i')
    }).select('_id');
    if (existing) {
        return { id: existing._id, created: false };
    }
    const created = await Brand.create({
        name: normalizedName,
        slug: await generateUniqueBrandSlug(normalizedName),
        isActive: true,
        sortOrder: sortOrderSeed
    });
    return { id: created._id, created: true };
};
const normalizeLegacyBrandName = (brandValue, brandNameValue) => {
    if (typeof brandNameValue === 'string' && brandNameValue.trim()) {
        return brandNameValue.trim();
    }
    if (typeof brandValue === 'string' && brandValue.trim()) {
        return brandValue.trim();
    }
    return null;
};
const run = async () => {
    await connectDatabase();
    const products = await Product.find().select('_id brand brandName').lean();
    let nextSortOrder = await Brand.countDocuments();
    let updatedProducts = 0;
    let createdBrands = 0;
    for (const product of products) {
        const legacyName = normalizeLegacyBrandName(product.brand, product.brandName);
        if (legacyName) {
            const { id: brandId, created } = await findOrCreateBrand(legacyName, nextSortOrder);
            if (created) {
                createdBrands += 1;
                nextSortOrder += 1;
            }
            await Product.updateOne({ _id: product._id }, {
                $set: {
                    brand: brandId,
                    brandName: legacyName
                }
            });
            updatedProducts += 1;
            continue;
        }
        if (product.brand && Types.ObjectId.isValid(String(product.brand))) {
            const referencedBrand = await Brand.findById(product.brand).select('name');
            if (referencedBrand && referencedBrand.name !== product.brandName) {
                await Product.updateOne({ _id: product._id }, {
                    $set: {
                        brandName: referencedBrand.name
                    }
                });
                updatedProducts += 1;
            }
        }
    }
    console.info(`Brand migration completed. ${createdBrands} brands created, ${updatedProducts} products updated.`);
    await mongoose.disconnect();
};
run().catch(async (error) => {
    console.error('Brand migration failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
