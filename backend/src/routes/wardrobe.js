import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadItem, getWardrobe, getItem, updateItem, deleteItem } from '../controllers/wardrobeController.js';

const router = express.Router();
router.use(protect);
router.post('/upload', upload.single('image'), uploadItem);
router.get('/', getWardrobe);
router.get('/:id', getItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
export default router;
