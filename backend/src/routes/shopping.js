import express from 'express';
import { protect } from '../middleware/auth.js';
import { getShopping } from '../controllers/shoppingController.js';

const router = express.Router();
router.use(protect);
router.get('/', getShopping);
export default router;
