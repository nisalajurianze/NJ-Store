import { Router } from 'express';
import { getBrand, listBrands } from '../controllers/brandController.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { brandSlugParamsSchema, publicBrandQuerySchema } from '../validators/brandValidators.js';

const router = Router();

router.get('/', validateQuery(publicBrandQuerySchema), listBrands);
router.get('/:slug', validateParams(brandSlugParamsSchema), getBrand);

export default router;
