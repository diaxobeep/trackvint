import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as ext from '../controllers/extension.controller.js';

const router = Router();

// Tracking vendeur — accessible sans JWT (API locale)
router.post('/sellers/track', ext.trackSeller);
router.post('/sellers/:vintedId/sales', ext.ingestSellerSales);
router.get('/sellers/tracked', ext.listTrackedSellers);
router.get('/sellers/favorites', ext.listFavoriteSellers);
router.delete('/sellers/favorite', ext.unfavoriteSeller);

router.use(requireAuth);

router.get('/subscription', ext.getSubscription);
router.post('/subscription/upgrade', ext.upgradeSubscription);
router.get('/notice', ext.getNotice);
router.get('/favorites', ext.getFavorites);
router.post('/folders', ext.createFolder);
router.delete('/folders/:folderId', ext.deleteFolder);
router.post('/items/save', ext.saveItem);
router.delete('/items/:dbId', ext.deleteItem);
router.post('/sellers/favorite', ext.favoriteSeller);
router.delete('/favorites/:dbId', ext.deleteFavoriteEntry);

export default router;
