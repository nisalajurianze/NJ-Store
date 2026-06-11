import { Router } from 'express';
import { applyCoupon } from '../controllers/couponController.js';
import { protect } from '../middleware/auth.js';
import { couponRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { applyCouponSchema } from '../validators/couponValidators.js';
const router = Router();
router.post('/apply', protect, couponRateLimiter, validateBody(applyCouponSchema), applyCoupon);
export default router;
