/**
 * Fitora Free AI Layer
 * Priority: Ollama (local) → Hugging Face (free API) → Rule-based engine
 * Zero cost. Zero API keys required.
 */

import axios from 'axios';

// ─── Ollama (Local LLM - Completely Free) ─────────────────────────────────────

export const callOllama = async (prompt, systemPrompt = '') => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';

  try {
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 400 }
    }, { timeout: 30000 });

    return response.data?.response || null;
  } catch {
    return null;
  }
};

// ─── Hugging Face Free Inference API ──────────────────────────────────────────

export const callHuggingFace = async (prompt, model = 'mistralai/Mistral-7B-Instruct-v0.2') => {
  const token = process.env.HF_API_TOKEN;
  if (!token) return null;

  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: { max_new_tokens: 400, temperature: 0.7, return_full_text: false }
      },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const output = response.data;
    if (Array.isArray(output) && output[0]?.generated_text) {
      return output[0].generated_text;
    }
    return null;
  } catch {
    return null;
  }
};

// ─── Rule-Based Styling Engine (Always Works, Zero Cost) ──────────────────────

// Color compatibility matrix
const COLOR_COMPATIBILITY = {
  white:   ['black', 'navy', 'grey', 'blue', 'red', 'green', 'brown', 'beige', 'any'],
  black:   ['white', 'grey', 'red', 'blue', 'beige', 'gold', 'any'],
  navy:    ['white', 'grey', 'beige', 'light blue', 'yellow', 'any'],
  grey:    ['white', 'black', 'navy', 'blue', 'pink', 'burgundy', 'any'],
  blue:    ['white', 'grey', 'beige', 'brown', 'khaki', 'any'],
  beige:   ['white', 'navy', 'brown', 'black', 'olive', 'any'],
  brown:   ['beige', 'white', 'cream', 'olive', 'any'],
  green:   ['white', 'beige', 'brown', 'khaki', 'any'],
  red:     ['white', 'black', 'grey', 'navy', 'any'],
  yellow:  ['white', 'navy', 'grey', 'black', 'any'],
  pink:    ['white', 'grey', 'navy', 'black', 'any'],
  maroon:  ['white', 'beige', 'grey', 'black', 'any'],
  olive:   ['white', 'beige', 'brown', 'khaki', 'any'],
  unknown: ['any']
};

const colorsMatch = (color1, color2) => {
  if (!color1 || !color2) return true;
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();
  if (c1 === c2) return true;
  const compat = COLOR_COMPATIBILITY[c1] || ['any'];
  return compat.includes(c2) || compat.includes('any') || c2 === 'any' ||
    (COLOR_COMPATIBILITY[c2] || []).includes(c1);
};

// Occasion-based style rules
const OCCASION_RULES = {
  work: {
    preferred: { tops: ['formal', 'classic', 'minimal'], bottoms: ['formal', 'classic'] },
    avoid: ['sporty', 'party'],
    mustHave: ['top', 'bottom'],
    tip: 'Structured pieces signal professionalism. Stick to classic colors.'
  },
  formal: {
    preferred: { tops: ['formal', 'classic'], bottoms: ['formal'] },
    avoid: ['casual', 'sporty'],
    mustHave: ['top', 'bottom'],
    addOuterwear: true,
    tip: 'Monochromatic or neutral palette reads most elegant.'
  },
  date: {
    preferred: { tops: ['trendy', 'classic', 'minimal'], bottoms: ['casual', 'formal'] },
    avoid: ['sporty'],
    mustHave: ['top', 'bottom'],
    tip: 'Add one statement piece — accessories elevate the whole look.'
  },
  casual: {
    preferred: { tops: ['casual', 'sporty', 'minimal'], bottoms: ['casual'] },
    avoid: ['formal'],
    mustHave: ['top', 'bottom'],
    tip: 'Comfort is key — but a fitted silhouette keeps it polished.'
  },
  party: {
    preferred: { tops: ['trendy', 'party'], bottoms: ['party', 'casual'] },
    avoid: ['formal'],
    mustHave: ['top', 'bottom'],
    addAccessory: true,
    tip: 'Be bold! One standout piece is all you need.'
  },
  sport: {
    preferred: { tops: ['sporty'], bottoms: ['sporty', 'casual'] },
    avoid: ['formal', 'party'],
    mustHave: ['top', 'bottom'],
    tip: 'Prioritize comfort and breathability.'
  },
  daily: {
    preferred: { tops: ['casual', 'minimal'], bottoms: ['casual'] },
    avoid: [],
    mustHave: ['top', 'bottom'],
    tip: 'A clean, simple look goes a long way every day.'
  }
};

export const generateRuleBasedOutfits = (wardrobe, occasion = 'casual', mood = 'comfortable') => {
  const rules = OCCASION_RULES[occasion] || OCCASION_RULES.casual;

  const byType = {
    top: wardrobe.filter(i => i.type === 'top'),
    bottom: wardrobe.filter(i => i.type === 'bottom'),
    dress: wardrobe.filter(i => i.type === 'dress'),
    footwear: wardrobe.filter(i => i.type === 'footwear'),
    outerwear: wardrobe.filter(i => i.type === 'outerwear'),
    accessory: wardrobe.filter(i => i.type === 'accessory')
  };

  // Score an item by how well it fits the occasion
  const scoreItem = (item, role) => {
    const preferred = rules.preferred[role === 'bottom' ? 'bottoms' : 'tops'] || [];
    let score = 50;
    item.style?.forEach(s => {
      if (preferred.includes(s)) score += 20;
      if (rules.avoid?.includes(s)) score -= 30;
    });
    if (item.occasion?.includes(occasion)) score += 15;
    return Math.max(0, score);
  };

  const sortedTops = [...byType.top].sort((a, b) => scoreItem(b, 'top') - scoreItem(a, 'top'));
  const sortedBottoms = [...byType.bottom].sort((a, b) => scoreItem(b, 'bottom') - scoreItem(a, 'bottom'));
  const outfits = [];

  // Generate 3 different combinations
  const usedTopIds = new Set();
  const usedBottomIds = new Set();

  for (let i = 0; i < 3; i++) {
    const items = [];
    let reasoning = '';
    let matchScore = 70;

    // Dress outfit (for date/party)
    if (i === 0 && byType.dress.length > 0 && ['date', 'party', 'formal'].includes(occasion)) {
      const dress = byType.dress[0];
      items.push({ itemId: dress._id, type: 'dress' });

      const shoe = byType.footwear.find(s => colorsMatch(dress.color?.primary, s.color?.primary));
      if (shoe) { items.push({ itemId: shoe._id, type: 'footwear' }); matchScore += 10; }

      const acc = byType.accessory[0];
      if (acc) { items.push({ itemId: acc._id, type: 'accessory' }); matchScore += 5; }

      reasoning = `A ${dress.color?.primary || ''} dress is the perfect anchor for ${occasion}. ${rules.tip}`;
    } else {
      // Top + Bottom combo
      const top = sortedTops.find(t => !usedTopIds.has(String(t._id)));
      const bottom = sortedBottoms.find(b => {
        if (usedBottomIds.has(String(b._id))) return false;
        return colorsMatch(top?.color?.primary, b.color?.primary);
      }) || sortedBottoms.find(b => !usedBottomIds.has(String(b._id)));

      if (!top && !bottom) break;

      if (top) { items.push({ itemId: top._id, type: 'top' }); usedTopIds.add(String(top._id)); }
      if (bottom) { items.push({ itemId: bottom._id, type: 'bottom' }); usedBottomIds.add(String(bottom._id)); }

      // Check color match
      if (top && bottom && colorsMatch(top.color?.primary, bottom.color?.primary)) {
        matchScore += 15;
      }

      // Add footwear
      const shoe = byType.footwear.find(s =>
        colorsMatch(bottom?.color?.primary, s.color?.primary) ||
        colorsMatch(top?.color?.primary, s.color?.primary)
      ) || byType.footwear[0];
      if (shoe) { items.push({ itemId: shoe._id, type: 'footwear' }); matchScore += 5; }

      // Add outerwear for formal/work
      if ((occasion === 'work' || occasion === 'formal') && byType.outerwear.length > 0 && i === 0) {
        const outer = byType.outerwear[0];
        if (colorsMatch(outer.color?.primary, top?.color?.primary)) {
          items.push({ itemId: outer._id, type: 'outerwear' });
          matchScore += 8;
        }
      }

      // Add accessory occasionally
      if (rules.addAccessory && byType.accessory.length > 0) {
        items.push({ itemId: byType.accessory[0]._id, type: 'accessory' });
        matchScore += 5;
      }

      const topColor = top?.color?.primary || '';
      const bottomColor = bottom?.color?.primary || '';
      const isColorMatch = colorsMatch(topColor, bottomColor);

      reasoning = `${topColor ? topColor.charAt(0).toUpperCase() + topColor.slice(1) : ''} ${top?.name || 'top'} with ${bottomColor ? bottomColor : ''} ${bottom?.name || 'bottom'}${isColorMatch ? ' — a natural color pairing' : ''}. ${rules.tip}`;
    }

    if (items.length > 0) {
      outfits.push({
        name: `${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Look ${i + 1}`,
        items,
        reasoning: reasoning.trim(),
        matchScore: Math.min(98, matchScore)
      });
    }
  }

  return outfits;
};

// ─── AI Stylist Chat Responses (Rule-Based) ───────────────────────────────────

const CHAT_RESPONSES = {
  outfit: (wardrobe, occasion) => {
    const count = wardrobe.length;
    if (count === 0) return "Add some items to your wardrobe first and I'll create personalized outfits for you! Tap the '+' button to get started. 👗";
    const tops = wardrobe.filter(i => i.type === 'top').length;
    const bottoms = wardrobe.filter(i => i.type === 'bottom').length;
    return `With your ${count} wardrobe pieces (${tops} tops, ${bottoms} bottoms), I can suggest some great looks! Use the outfit generator above for full styled combinations tailored to any occasion. ✨`;
  },
  color: () => "Great color question! My top pairings: navy + white (timeless), black + camel (sophisticated), grey + burgundy (rich). The rule: neutrals with everything, bold colors as accents. 🎨",
  formal: () => "For formal occasions: structured blazer or shirt, tailored trousers, closed-toe shoes. Stick to navy, charcoal, or black. A belt that matches your shoes ties the look together. 💼",
  casual: () => "Weekend gold standard: well-fitted tee + chinos or straight jeans + clean sneakers. Half-tuck your shirt for that effortless elevated look. Simple wins every time! 😎",
  date: () => "Date night tip: pick ONE statement piece and keep the rest simple. Dark jeans + fitted shirt + good shoes works 90% of the time. Add a watch or simple accessory to finish. 🌹",
  weather_cold: () => "Cold weather layering: start with a fitted base layer, add a mid-layer (sweater/hoodie), finish with a coat. Match textures — chunky knit + smooth coat looks intentional. 🧥",
  weather_hot: () => "Summer dressing: linen and cotton breathe best. Light colors reflect heat. Loose silhouettes > tight fits. Don't skip sunglasses — they complete any summer look. ☀️",
  shopping: () => "Smart shopping tip: before buying, ask 'Does this go with 3 things I already own?' If yes, it's a good buy. If not, skip it. Quality over quantity always wins. 🛍️",
  default: (itemCount) => `I'm Fitora, your AI stylist! With ${itemCount} item${itemCount !== 1 ? 's' : ''} in your wardrobe, I can help you create great looks. Ask me about outfits, color matching, occasion dressing, or what to buy next! 🎩`
};

export const getRuleBasedChatReply = (message, wardrobe) => {
  const msg = message.toLowerCase();
  const itemCount = wardrobe.length;

  if (msg.match(/wear|outfit|look|dress|what should/)) return CHAT_RESPONSES.outfit(wardrobe);
  if (msg.match(/color|colour|match|combine|pair/)) return CHAT_RESPONSES.color();
  if (msg.match(/formal|office|work|meeting|interview|professional/)) return CHAT_RESPONSES.formal();
  if (msg.match(/casual|weekend|relax|chill|everyday/)) return CHAT_RESPONSES.casual();
  if (msg.match(/date|romantic|dinner|evening/)) return CHAT_RESPONSES.date();
  if (msg.match(/cold|winter|chilly|jacket|coat|layer/)) return CHAT_RESPONSES.weather_cold();
  if (msg.match(/hot|summer|warm|beach|sun/)) return CHAT_RESPONSES.weather_hot();
  if (msg.match(/buy|shop|purchase|missing|need/)) return CHAT_RESPONSES.shopping();

  return CHAT_RESPONSES.default(itemCount);
};

// ─── Main AI call chain ────────────────────────────────────────────────────────

export const getAIResponse = async (prompt, systemPrompt, wardrobe, fallbackFn) => {
  // 1. Try Ollama (local, free)
  const ollamaReply = await callOllama(prompt, systemPrompt);
  if (ollamaReply) return { reply: ollamaReply, engine: 'ollama' };

  // 2. Try Hugging Face (free API)
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:` : prompt;
  const hfReply = await callHuggingFace(fullPrompt);
  if (hfReply) return { reply: hfReply.trim(), engine: 'huggingface' };

  // 3. Rule-based fallback (always works)
  const ruleReply = fallbackFn ? fallbackFn() : 'Let me help you with that!';
  return { reply: ruleReply, engine: 'rule-based' };
};
