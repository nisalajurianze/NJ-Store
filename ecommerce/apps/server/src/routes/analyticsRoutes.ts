import { Router } from 'express';
import { recordAnalyticsEvents } from '../controllers/analyticsController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { analyticsEventsSchema } from '../validators/analyticsValidators.js';

const router = Router();

router.post('/events', optionalAuth, validateBody(analyticsEventsSchema), recordAnalyticsEvents);

export default router;
