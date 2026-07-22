import { Router } from 'express';
import * as stats from '../controllers/stats.controller.js';

const router = Router();

// Auth désactivée temporairement — stats ouvertes en local
router.get('/', stats.getStats);

export default router;
