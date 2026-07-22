import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', auth.login);
router.get('/get-session', auth.getSession);
router.post('/sign-out', auth.signOut);
router.get('/extension-init', auth.extensionInit);
router.get('/extension-callback', auth.extensionCallback);

export default router;
