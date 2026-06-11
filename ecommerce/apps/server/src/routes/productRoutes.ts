import { Router } from 'express';
import {
  askProductQuestion,
  getCompareProducts,
  getProduct,
  getPriceRange,
  listProductQuestions,
  getRecentlyViewed,
  getSuggestions,
  getUpsells,
  getUpsellProducts,
  getWishlist,
  listProducts,
  saveCompareList,
  subscribeToBackInStock,
  toggleWishlist,
  trackRecentlyViewed
} from '../controllers/productController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { searchRateLimiter, searchRateLimiterWhenQueryPresent } from '../middleware/rateLimiter.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  backInStockSubscriptionSchema,
  compareBodySchema,
  compareQuerySchema,
  productIdParamsSchema,
  productQuestionSchema,
  productPriceRangeQuerySchema,
  productQuerySchema,
  productSlugParamsSchema,
  productUpsellSchema,
  productUpsellQuerySchema,
  suggestionsQuerySchema
} from '../validators/productValidators.js';

const router = Router();

router.get('/', searchRateLimiterWhenQueryPresent, validateQuery(productQuerySchema), listProducts);
router.get('/suggestions', searchRateLimiter, validateQuery(suggestionsQuerySchema), getSuggestions);
router.get('/price-range', searchRateLimiterWhenQueryPresent, validateQuery(productPriceRangeQuerySchema), getPriceRange);
router.get('/upsell', validateQuery(productUpsellQuerySchema), getUpsellProducts);
router.post('/upsell', validateBody(productUpsellSchema), getUpsells);
router.get('/compare', validateQuery(compareQuerySchema), getCompareProducts);
router.post('/compare', optionalAuth, validateBody(compareBodySchema), saveCompareList);
router.get('/wishlist', protect, getWishlist);
router.post('/:id/wishlist', protect, validateParams(productIdParamsSchema), toggleWishlist);
router.get('/:id/questions', validateParams(productIdParamsSchema), listProductQuestions);
router.post('/:id/questions', optionalAuth, validateParams(productIdParamsSchema), validateBody(productQuestionSchema), askProductQuestion);
router.post(
  '/:id/back-in-stock-subscriptions',
  optionalAuth,
  validateParams(productIdParamsSchema),
  validateBody(backInStockSubscriptionSchema),
  subscribeToBackInStock
);
router.post('/:id/recently-viewed', optionalAuth, validateParams(productIdParamsSchema), trackRecentlyViewed);
router.get('/recently-viewed', optionalAuth, getRecentlyViewed);
router.get('/:slug', validateParams(productSlugParamsSchema), getProduct);

export default router;
