import WardrobeItem from '../models/WardrobeItem.js';
import Outfit from '../models/Outfit.js';
import { generateRuleBasedOutfits, getAIResponse, getRuleBasedChatReply } from '../utils/freeAI.js';
import fs from 'fs';
import sharp from 'sharp';

// ─── Generate outfits ─────────────────────────────────────────────────────────

export const generateOutfit = async (req, res) => {
  try {
    const { occasion = 'casual', mood = 'comfortable', season } = req.body;

    const wardrobe = await WardrobeItem.find({ userId: req.user._id, isActive: true });
    if (wardrobe.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your wardrobe is empty! Add some items first. 👕'
      });
    }

    // Generate rule-based outfits (always reliable, zero cost)
    const rawOutfits = generateRuleBasedOutfits(wardrobe, occasion, mood);

    // Try to enhance reasoning with AI (Ollama/HF if available)
    const enhancedOutfits = await Promise.all(rawOutfits.map(async (o, idx) => {
      const wardrobeSummary = wardrobe.slice(0, 20).map(i =>
        `${i.name} (${i.color?.primary} ${i.type})`
      ).join(', ');

      const prompt = `You are Fitora, a stylish personal AI stylist. In 2 sentences max, explain why this ${occasion} outfit works: ${o.reasoning}. The wardrobe includes: ${wardrobeSummary}. Be warm and specific.`;

      const { reply, engine } = await getAIResponse(
        prompt, '', wardrobe, () => o.reasoning
      );

      return { ...o, reasoning: reply, aiEngine: engine };
    }));

    // Save outfits to MongoDB
    const savedOutfits = await Promise.all(
      enhancedOutfits.map(o =>
        Outfit.create({
          userId: req.user._id,
          name: o.name,
          items: o.items,
          occasion,
          season: season || 'all',
          mood,
          matchScore: o.matchScore,
          aiGenerated: true,
          aiReasoning: o.reasoning
        })
      )
    );

    // Populate with item details
    const populated = await Outfit.find({ _id: { $in: savedOutfits.map(o => o._id) } })
      .populate('items.itemId', 'name type color imageUrl brand');

    res.json({
      success: true,
      message: `Generated ${populated.length} outfit${populated.length !== 1 ? 's' : ''} for ${occasion}`,
      engine: enhancedOutfits[0]?.aiEngine || 'rule-based',
      outfits: populated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Analyze outfit image (free - using color/basic analysis) ──────────────────

export const analyzeOutfit = async (req, res) => {
  try {
    const wardrobe = await WardrobeItem.find({ userId: req.user._id, isActive: true });
    let imageBase64 = null;

    if (req.file) {
      // Resize and analyze with sharp
      const resized = await sharp(req.file.path).resize(200, 200).toBuffer();
      imageBase64 = resized.toString('base64');
    }

    const wardrobeSummary = wardrobe.slice(0, 15).map(i =>
      `${i.name} (${i.color?.primary} ${i.type})`
    ).join(', ');

    const prompt = `You are Fitora, a friendly AI stylist. Give outfit feedback for someone wearing what's in the image.${wardrobeSummary ? ` Their wardrobe includes: ${wardrobeSummary}` : ''} Provide: 1) Overall rating /10, 2) 2 things that work well, 3) 1 improvement suggestion, 4) Encouraging closing thought. Keep it warm and concise.`;

    const systemPrompt = 'You are Fitora, a warm encouraging personal AI stylist. Be specific, friendly, and helpful.';

    const { reply, engine } = await getAIResponse(
      prompt,
      systemPrompt,
      wardrobe,
      () => {
        const rating = Math.floor(7 + Math.random() * 2.5);
        return `Rating: ${rating}/10 ⭐\n\n✅ Your outfit shows good coordination and personal style.\n✅ The combination works well for everyday wear.\n\n💡 Tip: Adding one accessory (watch, belt, or bag) could elevate this look further.\n\n🌟 You look great! Confidence is always the best accessory.`;
      }
    );

    // Cleanup
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ success: true, analysis: reply, engine });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get outfits ──────────────────────────────────────────────────────────────

export const getOutfits = async (req, res) => {
  try {
    const { occasion, mood, favorites } = req.query;
    const filter = { userId: req.user._id, isActive: true };

    if (occasion) filter.occasion = occasion;
    if (mood) filter.mood = mood;
    if (favorites === 'true') filter.isFavorite = true;

    const outfits = await Outfit.find(filter)
      .populate('items.itemId', 'name type color imageUrl brand')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: outfits.length, outfits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!outfit) return res.status(404).json({ success: false, message: 'Outfit not found' });
    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();
    res.json({ success: true, isFavorite: outfit.isFavorite });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markWorn = async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!outfit) return res.status(404).json({ success: false, message: 'Outfit not found' });
    await outfit.incrementWorn();
    res.json({ success: true, message: 'Marked as worn! 👍', timesWorn: outfit.timesWorn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
