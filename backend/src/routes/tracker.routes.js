import { Router } from 'express';
import {
  addTracker,
  listTrackers,
  listSales,
  nicheStats,
  sellerDetail,
} from '../controllers/tracker.controller.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = Router();

router.use(optionalAuth);
router.post('/add', addTracker);
router.get('/', listTrackers);
router.get('/sales', listSales);
router.get('/niches', nicheStats);
router.get('/sellers/:vintedId', sellerDetail);

export default router;
