import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Wishlist } from '../models/Wishlist.js';
import { serializeOrder } from '../utils/serializers.js';
export const dashboardService = {
    getSummary: async (userId) => {
        const [recentOrders, totalOrders, wishlist, user] = await Promise.all([
            Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
            Order.countDocuments({ user: userId }),
            Wishlist.findOne({ user: userId }).select('items').lean(),
            User.findById(userId).select('wishlist loyaltyPoints').lean()
        ]);
        return {
            recentOrders: recentOrders.map((order) => serializeOrder(order)),
            totalOrders,
            wishlistCount: wishlist?.items?.length ?? user?.wishlist?.length ?? 0,
            loyaltyPoints: user?.loyaltyPoints ?? 0
        };
    }
};
