import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  generateOutfit,
  analyzeOutfit,
  getOutfits,
  toggleFavorite,
  markWorn
} from '../controllers/outfitController.js';

const router = express.Router();

router.post('/generate', protect, generateOutfit);
router.post('/analyze', protect, upload.single('image'), analyzeOutfit);
router.get('/', protect, getOutfits);
router.get('/:id', protect, getOutfits);
router.put('/:id/favorite', protect, toggleFavorite);
router.post('/:id/wear', protect, markWorn);

export default router;