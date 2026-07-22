import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as tools from '../controllers/tools.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/image-search/ingest', tools.ingestImage);
router.post('/image-search/upload', tools.uploadImage);

export default router;
