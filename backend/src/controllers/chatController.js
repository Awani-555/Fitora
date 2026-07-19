import WardrobeItem from '../models/WardrobeItem.js';
import Conversation from '../models/Conversation.js';
import { getAIResponse, getRuleBasedChatReply } from '../utils/freeAI.js';

const STYLIST_SYSTEM = `You are Fitora, a warm and knowledgeable AI personal stylist. Speak like a stylish best friend:
- Give confident, specific advice
- Reference the user's actual wardrobe items when possible
- Keep responses to 2-4 sentences max
- Be encouraging, never harsh
- You know color theory, occasion dressing, and current trends`;

export const chat = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // Get or create conversation
    let conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, userId: req.user._id })
      : null;

    if (!conversation) {
      conversation = await Conversation.create({ userId: req.user._id });
    }

    await conversation.addMessage('user', message);

    // Get wardrobe context
    const wardrobe = await WardrobeItem.find({ userId: req.user._id, isActive: true });
    const wardrobeContext = wardrobe.length > 0
      ? `\n\nUser's wardrobe (${wardrobe.length} items): ${wardrobe.slice(0, 20).map(i =>
          `${i.name} (${i.color?.primary} ${i.type}, ${i.style?.join('/')})`
        ).join(', ')}`
      : '\n\nUser has no wardrobe items yet - encourage them to add some!';

    // Get last 6 messages for context
    const history = conversation.messages.slice(-6)
      .map(m => `${m.role === 'assistant' ? 'Fitora' : 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `${history ? `Previous conversation:\n${history}\n\n` : ''}User: ${message}`;
    const systemWithWardrobe = STYLIST_SYSTEM + wardrobeContext;

    const { reply, engine } = await getAIResponse(
      prompt,
      systemWithWardrobe,
      wardrobe,
      () => getRuleBasedChatReply(message, wardrobe)
    );

    await conversation.addMessage('assistant', reply);

    res.json({
      success: true,
      reply,
      conversationId: conversation._id,
      engine
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id, isActive: true })
      .sort({ updatedAt: -1 }).limit(20).select('title updatedAt messages');
    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
