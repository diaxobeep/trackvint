import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as inv from '../controllers/inventory.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', inv.inventorySummary);
router.get('/export', inv.exportInventory);
router.get('/', inv.listInventory);
router.post('/', inv.createInventoryItem);
router.patch('/:id', inv.updateInventoryItem);
router.delete('/:id', inv.deleteInventoryItem);

export default router;
