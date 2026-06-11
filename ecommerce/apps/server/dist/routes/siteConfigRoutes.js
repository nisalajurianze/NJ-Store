import { Router } from 'express';
import { getPublicSiteConfig } from '../controllers/siteConfigController.js';
const router = Router();
router.get('/', getPublicSiteConfig);
export default router;
