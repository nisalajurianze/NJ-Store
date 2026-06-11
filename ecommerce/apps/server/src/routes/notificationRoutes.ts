import { Router } from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { notificationIdParamsSchema, notificationsListQuerySchema } from '../validators/notificationValidators.js';

const router = Router();

router.use(protect);
router.get('/', validateQuery(notificationsListQuerySchema), listNotifications);
router.patch('/:id/read', validateParams(notificationIdParamsSchema), markNotificationRead);

export default router;
