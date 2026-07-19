import express from 'express';
import { protect } from '../middleware/auth.js';
import { chat, getChatHistory, getConversation } from '../controllers/chatController.js';

const router = express.Router();
router.use(protect);
router.post('/', chat);
router.get('/history', getChatHistory);
router.get('/:id', getConversation);
export default router;
