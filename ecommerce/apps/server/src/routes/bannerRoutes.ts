import { Router } from 'express';
import { getPublicHomeHeroBanner } from '../controllers/bannerController.js';

const router = Router();

router.get('/home-hero', getPublicHomeHeroBanner);

export default router;
