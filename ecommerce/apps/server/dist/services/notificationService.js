import { Notification } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { createPagination } from '../utils/pagination.js';
import { serializeNotification } from '../utils/serializers.js';
export const notificationService = {
    create: async (payload) => {
        const notification = await Notification.create({
            user: payload.userId,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            link: payload.link
        });
        return serializeNotification(notification.toObject());
    },
    listForUser: async (userId, page = 1, limit = 10) => {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(50, Math.max(1, limit));
        const [notifications, total] = await Promise.all([
            Notification.find({ user: userId }).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
            Notification.countDocuments({ user: userId })
        ]);
        return {
            items: notifications.map((notification) => serializeNotification(notification.toObject())),
            pagination: createPagination(safePage, safeLimit, total)
        };
    },
    markAsRead: async (notificationId, userId) => {
        const notification = await Notification.findOneAndUpdate({ _id: notificationId, user: userId }, { isRead: true }, { new: true });
        if (!notification) {
            throw new AppError('Notification not found', 404);
        }
        return serializeNotification(notification.toObject());
    }
};
