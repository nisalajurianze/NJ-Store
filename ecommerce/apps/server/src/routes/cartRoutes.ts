import { Router } from 'express';
import { addToCart, clearCart, getCart, removeCartItem, syncCart, updateCartItem } from '../controllers/cartController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { addToCartSchema, cartItemParamsSchema, syncCartSchema, updateCartItemSchema } from '../validators/cartValidators.js';

const router = Router();

router.get('/', optionalAuth, getCart);
router.post('/', optionalAuth, validateBody(addToCartSchema), addToCart);
router.put('/:itemId', optionalAuth, validateParams(cartItemParamsSchema), validateBody(updateCartItemSchema), updateCartItem);
router.delete('/:itemId', optionalAuth, validateParams(cartItemParamsSchema), removeCartItem);
router.delete('/', optionalAuth, clearCart);
router.post('/sync', protect, validateBody(syncCartSchema), syncCart);

export default router;
