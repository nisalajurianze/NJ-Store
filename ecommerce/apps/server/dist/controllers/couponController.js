import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { couponService } from '../services/couponService.js';
export const applyCoupon = catchAsync(async (req, res) => {
    const data = await couponService.validateCoupon({
        userId: req.user.id,
        userEmail: req.user.email,
        code: req.body.code,
        subtotal: req.body.subtotal,
        shippingFee: req.body.shippingFee ?? 0,
        items: req.body.items
    });
    sendResponse(res, 200, data);
});
