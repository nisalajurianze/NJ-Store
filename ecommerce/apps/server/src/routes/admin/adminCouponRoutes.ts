import { Router } from 'express';
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../../controllers/admin/index.js';
import { restrictToPermission } from '../../middleware/permissions.js';
import { adminActionRateLimiter } from '../../middleware/rateLimiter.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { couponSchema, idParamsSchema } from '../../validators/adminValidators.js';

const router = Router();

router.get('/coupons', restrictToPermission('coupon:read'), listCoupons);
router.post('/coupons', restrictToPermission('coupon:write'), adminActionRateLimiter, validateBody(couponSchema), createCoupon);
router.patch('/coupons/:id', restrictToPermission('coupon:write'), adminActionRateLimiter, validateParams(idParamsSchema), validateBody(couponSchema.partial()), updateCoupon);
router.delete('/coupons/:id', restrictToPermission('coupon:delete'), adminActionRateLimiter, validateParams(idParamsSchema), deleteCoupon);

export default router;
