import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { cartService } from '../services/cartService.js';

const guestCookieSameSite = env.NODE_ENV === 'production' ? ('none' as const) : ('strict' as const);

const resolveGuestSession = (req: import('express').Request, res: import('express').Response): string => {
  const current = req.cookies.sessionId as string | undefined;
  if (current) {
    return current;
  }
  const sessionId = uuid();
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: guestCookieSameSite,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  return sessionId;
};

export const getCart = catchAsync(async (req, res) => {
  const data = await cartService.getCart(req.user?.id, req.user ? undefined : resolveGuestSession(req, res));
  sendResponse(res, 200, data);
});

export const addToCart = catchAsync(async (req, res) => {
  const data = await cartService.addItem(
    req.user?.id,
    req.user ? undefined : resolveGuestSession(req, res),
    req.body.productId,
    req.body.quantity,
    req.body.variantIndex
  );
  sendResponse(res, 201, data, 'Item added to cart');
});

export const updateCartItem = catchAsync(async (req, res) => {
  const data = await cartService.updateItem(
    req.user?.id,
    req.user ? undefined : resolveGuestSession(req, res),
    String(req.params.itemId),
    req.body.quantity
  );
  sendResponse(res, 200, data, 'Cart updated');
});

export const removeCartItem = catchAsync(async (req, res) => {
  const data = await cartService.removeItem(
    req.user?.id,
    req.user ? undefined : resolveGuestSession(req, res),
    String(req.params.itemId)
  );
  sendResponse(res, 200, data, 'Item removed');
});

export const clearCart = catchAsync(async (req, res) => {
  await cartService.clearCart(req.user?.id, req.user ? undefined : resolveGuestSession(req, res));
  sendResponse(res, 200, undefined, 'Cart cleared');
});

export const syncCart = catchAsync(async (req, res) => {
  const data = await cartService.syncCart(req.user!.id, req.body.items, req.cookies.sessionId as string | undefined);
  sendResponse(res, 200, data, 'Cart synced');
});
