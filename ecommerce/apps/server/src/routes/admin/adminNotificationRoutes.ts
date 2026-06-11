import { Router } from 'express';
import { getAdminNotificationCenter, markAdminNotificationViewed } from '../../controllers/admin/index.js';

const router = Router();

router.get('/notifications', getAdminNotificationCenter);
router.post('/notifications/:id/viewed', markAdminNotificationViewed);

export default router;
