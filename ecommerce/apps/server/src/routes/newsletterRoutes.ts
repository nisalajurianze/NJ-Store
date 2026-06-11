import { Router } from 'express';
import { confirmNewsletterSubscription, subscribeToNewsletter } from '../controllers/newsletterController.js';
import { validateBody } from '../middleware/validate.js';
import { newsletterConfirmSchema, newsletterSubscribeSchema } from '../validators/newsletterValidators.js';

const router = Router();

router.post('/subscribe', validateBody(newsletterSubscribeSchema), subscribeToNewsletter);
router.post('/confirm', validateBody(newsletterConfirmSchema), confirmNewsletterSubscription);

export default router;
