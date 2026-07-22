import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as radar from '../controllers/radar.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/sold-similar', radar.soldSimilar);
router.get('/catalog-combined', radar.catalogCombined);
router.get('/seller-stats', radar.sellerStats);

export default router;
