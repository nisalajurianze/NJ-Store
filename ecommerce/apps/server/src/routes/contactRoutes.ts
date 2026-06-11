import { Router } from 'express';
import { sendContactMessage } from '../controllers/contactController.js';
import { validateBody } from '../middleware/validate.js';
import { contactRateLimiter } from '../middleware/rateLimiter.js';
import { contactSchema } from '../validators/contactValidators.js';

const router = Router();

router.post('/', contactRateLimiter, validateBody(contactSchema), sendContactMessage);

export default router;
