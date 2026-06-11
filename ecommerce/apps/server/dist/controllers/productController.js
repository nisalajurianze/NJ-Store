import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';
import { catchAsync } from '../utils/catchAsync.js';
import { setPublicApiCache } from '../utils/cache.js';
import { sendResponse } from '../utils/api.js';
import { backInStockService } from '../services/backInStockService.js';
import { productService } from '../services/productService.js';
import { productQuestionService } from '../services/productQuestionService.js';
const guestCookieSameSite = env.NODE_ENV === 'production' ? 'none' : 'strict';
export const listProducts = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 60, sharedMaxAge: 180, staleWhileRevalidate: 300 });
    const data = await productService.listProducts(req.query);
    sendResponse(res, 200, data.items, undefined, data.pagination);
});
export const getHomeFeed = catchAsync(async (req, res) => {
    if (req.user) {
        res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    }
    else {
        setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    }
    const data = await productService.getHomeFeed(req.user?.id);
    sendResponse(res, 200, data);
});
export const getHomeBanner = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const data = await productService.getHomeBanner();
    sendResponse(res, 200, data);
});
export const getHomeFeatured = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const data = await productService.getHomeFeatured();
    sendResponse(res, 200, data);
});
export const getHomeLatest = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const data = await productService.getHomeLatest();
    sendResponse(res, 200, data);
});
export const getHomeFlashDeals = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const data = await productService.getHomeFlashDeals();
    sendResponse(res, 200, data);
});
export const getHomeWantedProducts = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const data = await productService.getHomeWantedProducts();
    sendResponse(res, 200, data);
});
export const getHomeBrands = catchAsync(async (_req, res) => {
    setPublicApiCache(res, { maxAge: 300, sharedMaxAge: 900, staleWhileRevalidate: 1800 });
    const data = await productService.getHomeBrands();
    sendResponse(res, 200, data);
});
export const getHomeRecentlyViewed = catchAsync(async (req, res) => {
    if (req.user) {
        res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    }
    else {
        setPublicApiCache(res, { maxAge: 30, staleWhileRevalidate: 120 });
    }
    const data = await productService.getHomeRecentlyViewed(req.user?.id);
    sendResponse(res, 200, data);
});
export const getProduct = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 180, sharedMaxAge: 600, staleWhileRevalidate: 1200 });
    const data = await productService.getProductBySlug(String(req.params.slug));
    sendResponse(res, 200, data);
});
export const getSuggestions = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 20, staleWhileRevalidate: 60 });
    const data = await productService.getSuggestions(String(req.query.q));
    sendResponse(res, 200, data);
});
export const getPriceRange = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 600, staleWhileRevalidate: 1200 });
    const data = await productService.getPriceRange(req.query);
    sendResponse(res, 200, data);
});
export const getUpsellProducts = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 120, sharedMaxAge: 300, staleWhileRevalidate: 900 });
    const ids = Array.isArray(req.query.ids) ? req.query.ids : [];
    const limit = Number(req.query.limit ?? 3);
    const data = await productService.getUpsells({
        items: ids.map((productId) => ({ productId })),
        limit
    });
    sendResponse(res, 200, data);
});
export const getUpsells = catchAsync(async (req, res) => {
    const data = await productService.getUpsells(req.body);
    sendResponse(res, 200, data);
});
export const toggleWishlist = catchAsync(async (req, res) => {
    const data = await productService.toggleWishlist(req.user.id, String(req.params.id));
    sendResponse(res, 200, data, data.added ? 'Added to wishlist' : 'Removed from wishlist');
});
export const getWishlist = catchAsync(async (req, res) => {
    const data = await productService.getWishlistProducts(req.user.id);
    sendResponse(res, 200, data);
});
export const getCompareProducts = catchAsync(async (req, res) => {
    const data = await productService.getCompareProducts(req.query.ids);
    sendResponse(res, 200, data);
});
export const saveCompareList = catchAsync(async (req, res) => {
    const sessionId = req.cookies.sessionId ?? uuid();
    if (!req.cookies.sessionId) {
        res.cookie('sessionId', sessionId, {
            sameSite: guestCookieSameSite,
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });
    }
    await productService.saveCompareList(req.user?.id, sessionId, req.body.items);
    sendResponse(res, 200, { items: req.body.items }, 'Compare list saved');
});
export const trackRecentlyViewed = catchAsync(async (req, res) => {
    if (req.user) {
        await productService.trackRecentlyViewed(req.user.id, String(req.params.id));
    }
    sendResponse(res, 200, undefined, 'Recently viewed updated');
});
export const getRecentlyViewed = catchAsync(async (req, res) => {
    const data = req.user ? await productService.getRecentlyViewed(req.user.id) : [];
    sendResponse(res, 200, data);
});
export const listProductQuestions = catchAsync(async (req, res) => {
    const data = await productQuestionService.listPublicQuestions(String(req.params.id));
    sendResponse(res, 200, data);
});
export const askProductQuestion = catchAsync(async (req, res) => {
    const data = await productQuestionService.createQuestion({
        productId: String(req.params.id),
        question: req.body.question,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        user: req.user
            ? {
                id: req.user.id,
                name: req.body.customerName ?? req.user.email,
                email: req.user.email
            }
            : undefined
    });
    sendResponse(res, 201, data, 'Question submitted');
});
export const subscribeToBackInStock = catchAsync(async (req, res) => {
    const data = await backInStockService.subscribe({
        productId: String(req.params.id),
        email: req.body.email,
        name: req.body.name,
        variantIndex: req.body.variantIndex,
        userId: req.user?.id
    });
    sendResponse(res, 201, data, 'Subscription saved');
});
