import mongoose from 'mongoose';
import dayjs from 'dayjs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { adminPermissions } from '@njstore/types';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Banner } from '../models/Banner.js';
import { Brand } from '../models/Brand.js';
import { CompareList } from '../models/CompareList.js';
import { Coupon } from '../models/Coupon.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { Review } from '../models/Review.js';
import { StoreSetting } from '../models/StoreSetting.js';
import { User } from '../models/User.js';
import { Wishlist } from '../models/Wishlist.js';
import { slugify } from '@njstore/utils';
const image = (folder, slug, alt) => ({
    url: `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1710000000/njstore/${folder}/${slug}.jpg`,
    publicId: `njstore/${folder}/${slug}`,
    alt
});
const categoryNames = [
    'Smartphones',
    'Laptops',
    'Printers',
    'Accessories',
    'Audio',
    'Tablets',
    'Smart Home',
    'Gaming'
];
const seedBrands = [
    { name: 'Dell', sortOrder: 1, description: 'Premium Dell laptops, desktops, and work-focused accessories.' },
    { name: 'Epson', sortOrder: 2, description: 'Official Epson printers and print systems for home and office.' },
    { name: 'HP', sortOrder: 3, description: 'HP laptops, printers, and productivity devices with local warranty.' },
    { name: 'JBL', sortOrder: 4, description: 'JBL speakers, headphones, and portable audio for everyday use.' },
    { name: 'Anker', sortOrder: 5, description: 'Anker charging accessories, cables, and power solutions.' },
    { name: 'Apple', sortOrder: 6, description: 'Apple phones, tablets, audio, and ecosystem products.' }
];
const customers = [
    { name: 'Demo Customer Colombo', email: 'demo.colombo@example.com', phone: '+94770010001', city: 'Colombo' },
    { name: 'Demo Customer Kandy', email: 'demo.kandy@example.com', phone: '+94770010002', city: 'Kandy' },
    { name: 'Demo Customer Gampaha', email: 'demo.gampaha@example.com', phone: '+94770010003', city: 'Gampaha' },
    { name: 'Demo Customer Galle', email: 'demo.galle@example.com', phone: '+94770010004', city: 'Galle' },
    { name: 'Demo Customer Matara', email: 'demo.matara@example.com', phone: '+94770010005', city: 'Matara' }
];
const productCatalog = [
    { category: 'Smartphones', brand: 'Samsung', name: 'Galaxy S24 Ultra', price: 449000, comparePrice: 479000, sku: 'SAM-S24U' },
    { category: 'Smartphones', brand: 'Apple', name: 'iPhone 15 Pro Max', price: 529000, comparePrice: 549000, sku: 'APL-IP15PM' },
    { category: 'Smartphones', brand: 'Xiaomi', name: 'Xiaomi 14', price: 249000, comparePrice: 269000, sku: 'XIA-14' },
    { category: 'Smartphones', brand: 'Samsung', name: 'Galaxy A55 5G', price: 159000, comparePrice: 174000, sku: 'SAM-A55' },
    { category: 'Smartphones', brand: 'Apple', name: 'iPhone 14', price: 349000, comparePrice: 369000, sku: 'APL-IP14' },
    { category: 'Laptops', brand: 'Dell', name: 'Dell XPS 15', price: 699000, comparePrice: 729000, sku: 'DEL-XPS15' },
    { category: 'Laptops', brand: 'HP', name: 'HP Pavilion 14', price: 319000, comparePrice: 339000, sku: 'HP-PAV14' },
    { category: 'Laptops', brand: 'Lenovo', name: 'Lenovo Legion 5', price: 599000, comparePrice: 629000, sku: 'LEN-LEG5' },
    { category: 'Printers', brand: 'Canon', name: 'Canon PIXMA G3020', price: 85000, comparePrice: 92000, sku: 'CAN-G3020' },
    { category: 'Printers', brand: 'HP', name: 'HP LaserJet Pro M15a', price: 67000, comparePrice: 72000, sku: 'HP-M15A' },
    { category: 'Printers', brand: 'Epson', name: 'Epson EcoTank L3250', price: 99000, comparePrice: 108000, sku: 'EPS-L3250' },
    { category: 'Accessories', brand: 'Anker', name: 'Anker 65W GaN Charger', price: 17900, comparePrice: 19900, sku: 'ANK-65W' },
    { category: 'Accessories', brand: 'Belkin', name: 'Belkin USB-C Cable', price: 4900, comparePrice: 5900, sku: 'BEL-USBC' },
    { category: 'Accessories', brand: 'Spigen', name: 'Spigen Rugged Armor Case', price: 7900, comparePrice: 8900, sku: 'SPI-ARMOR' },
    { category: 'Accessories', brand: 'Nillkin', name: 'Tempered Glass Pack', price: 3900, comparePrice: 4500, sku: 'NIL-GLASS' },
    { category: 'Audio', brand: 'Sony', name: 'Sony WH-1000XM5', price: 139000, comparePrice: 149000, sku: 'SNY-XM5' },
    { category: 'Audio', brand: 'JBL', name: 'JBL Charge 5', price: 57900, comparePrice: 62900, sku: 'JBL-CHG5' },
    { category: 'Audio', brand: 'Apple', name: 'AirPods Pro 2', price: 99000, comparePrice: 109000, sku: 'APL-APP2' },
    { category: 'Tablets', brand: 'Apple', name: 'iPad Air M2', price: 279000, comparePrice: 299000, sku: 'APL-IPADAIR' },
    { category: 'Tablets', brand: 'Samsung', name: 'Galaxy Tab S9 FE', price: 189000, comparePrice: 204000, sku: 'SAM-TABS9' }
];
const buildVariants = (sku, basePrice) => [
    { color: 'Black', colorCode: '#111827', storage: '128GB', price: basePrice, stock: 12, sku: `${sku}-BLK-128` },
    { color: 'Silver', colorCode: '#d1d5db', storage: '256GB', price: basePrice + 15000, stock: 8, sku: `${sku}-SLV-256` }
];
const buildSpecifications = (name) => [
    { key: 'Model', value: name },
    { key: 'Warranty', value: '1 Year Manufacturer Warranty' },
    { key: 'Origin', value: 'Official Sri Lankan Stock' },
    { key: 'Connectivity', value: 'Wi-Fi 6 / Bluetooth 5.x / USB-C' }
];
const buildAddress = (name, phone, city) => ({
    label: 'Home',
    fullName: name,
    phone,
    line1: 'No. 120, Galle Road',
    line2: 'Apartment 4B',
    city,
    district: city,
    postalCode: '00100',
    country: 'Sri Lanka',
    isDefault: true
});
const SEED_ADMIN_PASSWORD_ENV_KEY = 'SEED_ADMIN_PASSWORD';
const SEED_CUSTOMER_PASSWORD_ENV_KEY = 'SEED_CUSTOMER_PASSWORD';
const createSeedPassword = () => `Nj-${randomBytes(9).toString('base64url')}!A1`;
const resolveSeedPassword = (envKey) => {
    const configured = process.env[envKey]?.trim();
    if (configured) {
        return {
            value: configured,
            source: 'env'
        };
    }
    return {
        value: createSeedPassword(),
        source: 'generated'
    };
};
const createOrders = async (users, products) => {
    const deliveredCustomer = users[0];
    const processingCustomer = users[1];
    const pendingCustomer = users[2];
    const now = new Date();
    const orderItems = [
        {
            product: products[0]._id,
            name: products[0].name,
            slug: products[0].slug,
            image: products[0].images[0],
            quantity: 1,
            price: products[0].price,
            variantLabel: 'Black / 128GB',
            sku: products[0].variants[0].sku,
            variantIndex: 0
        },
        {
            product: products[5]._id,
            name: products[5].name,
            slug: products[5].slug,
            image: products[5].images[0],
            quantity: 1,
            price: products[5].price,
            variantLabel: 'Silver / 256GB',
            sku: products[5].variants[1].sku,
            variantIndex: 1
        }
    ];
    const sampleOrders = [
        {
            user: deliveredCustomer._id,
            orderNumber: 'ORD-20260322-1001',
            quotationNumber: 'QTN-20260315-1001',
            type: 'delivery',
            status: 'delivered',
            paymentStatus: 'paid',
            paymentMethod: 'bank_transfer',
            subtotal: 1148000,
            shippingFee: 0,
            discount: 500,
            total: 1147500,
            shippingAddress: buildAddress(deliveredCustomer.name, deliveredCustomer.phone ?? '+94770000000', 'Colombo'),
            items: orderItems,
            loyaltyPointsAwarded: 11475,
            loyaltyPointsGranted: true,
            estimatedDeliveryDays: '3-5',
            estimatedDeliveryDate: now,
            timeline: [
                { status: 'pending', note: 'Quotation confirmed by customer', actor: deliveredCustomer.name, createdAt: now },
                { status: 'processing', note: 'Payment verified by admin', actor: 'admin@njstore.com', createdAt: now },
                { status: 'shipped', note: 'Order dispatched', actor: 'admin@njstore.com', createdAt: now },
                { status: 'delivered', note: 'Order delivered', actor: 'admin@njstore.com', createdAt: now }
            ]
        },
        {
            user: processingCustomer._id,
            orderNumber: 'ORD-20260322-1002',
            quotationNumber: 'QTN-20260318-1002',
            type: 'delivery',
            status: 'processing',
            paymentStatus: 'paid',
            paymentMethod: 'bank_transfer',
            subtotal: 159000,
            shippingFee: 350,
            discount: 0,
            total: 159350,
            shippingAddress: buildAddress(processingCustomer.name, processingCustomer.phone ?? '+94770000000', 'Kandy'),
            items: [orderItems[0]],
            loyaltyPointsAwarded: 1593,
            estimatedDeliveryDays: '4-5',
            estimatedDeliveryDate: now,
            timeline: [
                { status: 'pending', note: 'Quotation confirmed by customer', actor: processingCustomer.name, createdAt: now },
                { status: 'processing', note: 'Payment approved', actor: 'admin@njstore.com', createdAt: now }
            ]
        },
        {
            user: pendingCustomer._id,
            orderNumber: 'ORD-20260322-1003',
            quotationNumber: 'QTN-20260320-1003',
            type: 'pickup',
            status: 'pending',
            paymentStatus: 'receipt_uploaded',
            paymentMethod: 'bank_transfer',
            subtotal: 99000,
            shippingFee: 0,
            discount: 0,
            total: 99000,
            pickupSlot: '2026-03-25 10:00',
            items: [orderItems[1]],
            loyaltyPointsAwarded: 990,
            timeline: [
                { status: 'pending', note: 'Awaiting receipt verification', actor: pendingCustomer.name, createdAt: now }
            ]
        }
    ];
    const fillers = Array.from({ length: 7 }, (_, index) => ({
        user: users[index % users.length]._id,
        orderNumber: `ORD-20260322-10${10 + index}`,
        quotationNumber: `QTN-20260320-10${10 + index}`,
        type: index % 2 === 0 ? 'delivery' : 'pickup',
        status: ['pending', 'processing', 'shipped', 'cancelled'][index % 4],
        paymentStatus: ['unpaid', 'paid', 'receipt_uploaded', 'rejected'][index % 4],
        paymentMethod: 'bank_transfer',
        subtotal: 45000 + index * 7000,
        shippingFee: index % 2 === 0 ? 350 : 0,
        discount: index % 3 === 0 ? 500 : 0,
        total: 45000 + index * 7000 + (index % 2 === 0 ? 350 : 0) - (index % 3 === 0 ? 500 : 0),
        shippingAddress: index % 2 === 0 ? buildAddress(users[index % users.length].name, users[index % users.length].phone ?? '+94770000000', users[index % users.length].addresses[0].city) : undefined,
        pickupSlot: index % 2 !== 0 ? '2026-03-26 14:00' : undefined,
        items: [orderItems[index % orderItems.length]],
        loyaltyPointsAwarded: Math.floor((45000 + index * 7000) / 100),
        timeline: [
            { status: 'pending', note: 'Seeded order timeline', actor: 'seed', createdAt: now }
        ]
    }));
    return Order.insertMany([...sampleOrders, ...fillers]);
};
export const seedDatabase = async () => {
    if (env.NODE_ENV === 'production') {
        throw new Error('[seed] REFUSED: seed cannot run in production.');
    }
    const adminPassword = resolveSeedPassword(SEED_ADMIN_PASSWORD_ENV_KEY);
    const customerPassword = resolveSeedPassword(SEED_CUSTOMER_PASSWORD_ENV_KEY);
    await connectDatabase();
    const shouldReset = process.env.SEED_RESET === 'true';
    const existingCounts = {
        users: await User.countDocuments({}),
        categories: await Category.countDocuments({}),
        products: await Product.countDocuments({}),
        orders: await Order.countDocuments({}),
        banners: await Banner.countDocuments({}),
        brands: await Brand.countDocuments({})
    };
    const hasExistingData = Object.values(existingCounts).some((count) => count > 0);
    if (hasExistingData && !shouldReset) {
        console.warn(`[seed] Existing data detected (users=${existingCounts.users}, categories=${existingCounts.categories}, products=${existingCounts.products}, orders=${existingCounts.orders}, banners=${existingCounts.banners}, brands=${existingCounts.brands}).`);
        console.warn('[seed] Skipping destructive reseed to protect current data.');
        console.warn('[seed] Use SEED_RESET=true with the reset seed command if you explicitly want to wipe and replace development data.');
        await mongoose.disconnect();
        return;
    }
    if (shouldReset) {
        await Promise.all([
            RefreshSession.deleteMany({}),
            Review.deleteMany({}),
            Order.deleteMany({}),
            Coupon.deleteMany({}),
            Banner.deleteMany({}),
            Brand.deleteMany({}),
            Wishlist.deleteMany({}),
            CompareList.deleteMany({}),
            LoyaltyTransaction.deleteMany({}),
            Product.deleteMany({}),
            Category.deleteMany({}),
            StoreSetting.deleteMany({}),
            User.deleteMany({})
        ]);
    }
    await StoreSetting.create({
        storeName: 'NJ Store',
        footer: {
            companyName: 'NJ Store',
            description: 'Premium electronics, responsive service, and transparent custom quotations.',
            email: 'support@njstore.com',
            phone: '+94 11 245 8899',
            whatsappNumber: '94112458899',
            physicalAddress: '120 Galle Road, Colombo 03, Sri Lanka',
            mapEmbedUrl: 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed',
            openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
            copyrightText: '© NJ Store. All rights reserved.',
            sectionTitles: {
                about: 'About',
                quickLinks: 'Quick Links',
                contact: 'Contact Info',
                social: 'Social & Updates'
            },
            quickLinks: [
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
                { label: 'Return Policy', href: '/returns' },
                { label: 'FAQ', href: '/faq' }
            ]
        },
        freeShippingThreshold: 15000,
        lowStockThreshold: 5,
        shippingRates: [
            { city: 'Colombo', fee: 350, days: '2-3' },
            { city: 'Gampaha', fee: 350, days: '2-3' },
            { city: 'Kalutara', fee: 400, days: '2-3' },
            { city: 'Kandy', fee: 500, days: '4-5' },
            { city: 'Galle', fee: 500, days: '4-5' },
            { city: 'Matara', fee: 550, days: '4-6' },
            { city: 'default', fee: 600, days: '4-6' }
        ],
        bankTransferDetails: {
            accountName: 'NJ Store (Pvt) Ltd',
            bankName: 'Commercial Bank',
            branch: 'Colombo Fort',
            accountNumber: '1234567890'
        }
    });
    const categoryDocs = await Category.insertMany(categoryNames.map((name, index) => ({
        name,
        slug: slugify(name),
        description: `${name} category for premium electronics and official Sri Lankan stock.`,
        image: image('categories', slugify(name), name),
        isActive: true,
        order: index + 1
    })));
    const categoryMap = new Map(categoryDocs.map((category) => [category.name, category._id]));
    const brandNames = [...new Set([...seedBrands.map((brand) => brand.name), ...productCatalog.map((product) => product.brand)])];
    const brandDocs = await Brand.insertMany(brandNames.map((name, index) => {
        const seeded = seedBrands.find((brand) => brand.name === name);
        return {
            name,
            slug: slugify(name),
            logo: image('brands', slugify(name), `${name} logo`),
            description: seeded?.description,
            isActive: true,
            sortOrder: seeded?.sortOrder ?? index + 10
        };
    }));
    const brandMap = new Map(brandDocs.map((brand) => [brand.name, brand._id]));
    const productDocs = await Product.insertMany(productCatalog.map((product, index) => ({
        name: product.name,
        slug: slugify(product.name),
        description: `${product.name} is built for customers who expect premium performance, reliable local warranty, and polished daily use across work and entertainment.`,
        shortDescription: `Official ${product.brand} ${product.name} with premium performance and local warranty support.`,
        price: product.price,
        comparePrice: product.comparePrice,
        category: categoryMap.get(product.category),
        brand: brandMap.get(product.brand) ?? null,
        brandName: product.brand,
        images: [
            image('products', slugify(product.name), product.name),
            image('products', `${slugify(product.name)}-2`, `${product.name} alternate`)
        ],
        variants: buildVariants(product.sku, product.price),
        specifications: buildSpecifications(product.name),
        ratings: { average: 0, count: 0 },
        isBestSeller: index < 5,
        isFeatured: index % 2 === 0,
        isFlashDeal: index < 4,
        flashDealEndsAt: index < 4 ? new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000) : undefined,
        isActive: true,
        tags: [product.brand.toLowerCase(), product.category.toLowerCase(), 'electronics'],
        loyaltyPoints: Math.floor(product.price / 100),
        sku: product.sku,
        weight: 450 + index * 25,
        soldCount: 10 + index * 2
    })));
    await Banner.create({
        key: 'home-hero',
        campaignLabel: 'April Campaign',
        title: 'Upgrade your desk with official-warranty tech picks.',
        subtitle: 'Live hero banners can now be managed from the admin dashboard, while shoppers still get the same quotation-first experience.',
        ctaText: 'Explore Campaign',
        ctaUrl: '/shop',
        accentText: 'Fresh deals, fast delivery, and trusted Sri Lankan stock.',
        backgroundImage: image('banners', 'home-hero-april', 'NJ Store home hero campaign'),
        adSlots: [
            {
                slotKey: 'slot-1',
                eyebrow: 'Office setup',
                title: 'Printer bundles',
                description: 'Highlight a dedicated printer or workflow campaign from admin without editing the homepage code.',
                ctaUrl: '/shop?category=printers',
                mediaItems: [
                    {
                        kind: 'image',
                        ...image('banners', 'ad-slot-printer-1', 'Printer campaign visual 1')
                    },
                    {
                        kind: 'image',
                        ...image('banners', 'ad-slot-printer-2', 'Printer campaign visual 2')
                    }
                ],
                isActive: true
            },
            {
                slotKey: 'slot-2',
                eyebrow: 'Video ready',
                title: 'Run image or video promos',
                description: 'Each ad place supports standalone copy and separate media settings.',
                ctaUrl: '/shop?category=accessories',
                mediaItems: [
                    {
                        kind: 'video',
                        url: 'https://res.cloudinary.com/demo/video/upload/v1710000000/njstore/banners/ad-slot-accessories.mp4',
                        publicId: 'njstore/banners/ad-slot-accessories',
                        alt: 'Accessories video campaign'
                    },
                    {
                        kind: 'image',
                        ...image('banners', 'ad-slot-accessories-1', 'Accessories campaign visual')
                    }
                ],
                isActive: true
            },
            {
                slotKey: 'slot-3',
                eyebrow: 'Fast swap',
                title: 'Seasonal campaign card',
                description: 'Use the third slot for short-lived announcements, launches, or partner promotions.',
                ctaUrl: '/shop?flashDeal=true',
                isActive: true
            }
        ],
        heroSpotlightProduct: productDocs[5]?._id ?? null,
        showcaseProducts: [productDocs[0]?._id, productDocs[3]?._id, productDocs[7]?._id, productDocs[10]?._id].filter(Boolean),
        isActive: true
    });
    const admin = await User.create({
        name: 'Admin User',
        email: 'admin@njstore.com',
        password: adminPassword.value,
        role: 'admin',
        permissions: [...adminPermissions],
        isEmailVerified: true,
        language: 'en',
        authProvider: 'local'
    });
    const userDocs = [];
    for (const customer of customers) {
        const user = await User.create({
            name: customer.name,
            email: customer.email,
            password: customerPassword.value,
            role: 'customer',
            phone: customer.phone,
            isEmailVerified: true,
            language: 'en',
            addresses: [buildAddress(customer.name, customer.phone, customer.city)],
            loyaltyPoints: 0,
            recentlyViewed: [productDocs[0]._id, productDocs[1]._id]
        });
        userDocs.push(user);
        await Wishlist.create({ user: user._id, items: [productDocs[0]._id, productDocs[3]._id] });
    }
    await Wishlist.create({ user: admin._id, items: [] });
    await CompareList.create({ user: userDocs[0]._id, items: [productDocs[0]._id, productDocs[1]._id] });
    const orders = await createOrders(userDocs, productDocs.map((product) => ({
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        variants: product.variants.map((variant) => ({ sku: variant.sku })),
        price: product.price
    })));
    await LoyaltyTransaction.create({
        user: userDocs[0]._id,
        order: orders[0]._id,
        type: 'earned',
        points: orders[0].loyaltyPointsAwarded,
        description: `Delivered order ${orders[0].orderNumber}`
    });
    await User.findByIdAndUpdate(userDocs[0]._id, { loyaltyPoints: orders[0].loyaltyPointsAwarded });
    const deliveredOrder = orders[0];
    await Review.insertMany([
        {
            product: deliveredOrder.items[0].product,
            user: userDocs[0]._id,
            order: deliveredOrder._id,
            rating: 5,
            title: 'Excellent flagship experience',
            comment: 'The phone arrived in perfect condition and the battery life has been excellent.',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: true,
            helpfulVotes: 4
        },
        {
            product: deliveredOrder.items[1].product,
            user: userDocs[0]._id,
            order: deliveredOrder._id,
            rating: 4,
            title: 'Great productivity machine',
            comment: 'Performance is fast and the display is excellent for office and creative work.',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: true,
            helpfulVotes: 3
        },
        {
            product: productDocs[8]._id,
            user: userDocs[1]._id,
            order: deliveredOrder._id,
            rating: 4,
            title: 'Ink tank value',
            comment: 'Setup was easy and the running cost is much lower than my old printer.',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: true,
            helpfulVotes: 2
        },
        {
            product: productDocs[15]._id,
            user: userDocs[2]._id,
            order: deliveredOrder._id,
            rating: 5,
            title: 'Best headphones I have used',
            comment: 'Noise cancellation is powerful and the comfort is excellent for long flights.',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: true,
            helpfulVotes: 5
        },
        {
            product: productDocs[18]._id,
            user: userDocs[3]._id,
            order: deliveredOrder._id,
            rating: 4,
            title: 'Perfect tablet for travel',
            comment: 'Portable, fast, and the display is crisp for reading and Netflix.',
            isVerified: true,
            isVerifiedBuyer: true,
            isApproved: true,
            helpfulVotes: 1
        }
    ]);
    await Coupon.insertMany([
        {
            code: 'SAVE10',
            type: 'percentage',
            value: 10,
            minOrderValue: 25000,
            maxDiscount: 15000,
            expiryDate: dayjs().add(60, 'day').toDate(),
            usageLimit: 200,
            isActive: true
        },
        {
            code: 'TECH500',
            type: 'fixed',
            value: 500,
            minOrderValue: 10000,
            expiryDate: dayjs().add(45, 'day').toDate(),
            usageLimit: 300,
            isActive: true
        },
        {
            code: 'FREESHIP',
            type: 'free_shipping',
            value: 0,
            minOrderValue: 15000,
            expiryDate: dayjs().add(30, 'day').toDate(),
            usageLimit: 150,
            isActive: true
        }
    ]);
    console.log('NJ Store seed completed successfully');
    if (adminPassword.source === 'generated') {
        console.log(`[seed] Admin password was generated for this run: ${adminPassword.value}`);
    }
    else {
        console.log(`[seed] Admin password came from ${SEED_ADMIN_PASSWORD_ENV_KEY}.`);
    }
    if (customerPassword.source === 'generated') {
        console.log(`[seed] Demo customer password was generated for this run: ${customerPassword.value}`);
    }
    else {
        console.log(`[seed] Demo customer password came from ${SEED_CUSTOMER_PASSWORD_ENV_KEY}.`);
    }
    if (adminPassword.source === 'generated' || customerPassword.source === 'generated') {
        console.log(`[seed] Set ${SEED_ADMIN_PASSWORD_ENV_KEY} and ${SEED_CUSTOMER_PASSWORD_ENV_KEY} in your local server .env if you want stable demo credentials.`);
    }
    await mongoose.disconnect();
};
const isEntrypoint = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
    void seedDatabase().catch(async (error) => {
        console.error('Seed failed', error);
        await mongoose.disconnect();
        process.exit(1);
    });
}
