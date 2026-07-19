import WardrobeItem from '../models/WardrobeItem.js';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import sharp from 'sharp';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── Color analysis using Sharp — grid-based dominant color ──────────────────
// Splits the image into a 3x3 grid, finds the most representative non-background
// region. This avoids being fooled by grey/white backgrounds in product photos.

const analyzeColor = async (imagePath) => {
  try {
    // Resize to 90x90 for 3x3 grid of 30x30 regions
    const { data, info } = await sharp(imagePath)
      .resize(90, 90, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ch = info.channels; // 3 (RGB) or 4 (RGBA)
    const W = info.width;

    // Extract median RGB for each of the 9 grid regions
    const regions = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const rs = [], gs = [], bs = [];
        for (let y = row * 30; y < (row + 1) * 30; y++) {
          for (let x = col * 30; x < (col + 1) * 30; x++) {
            const i = (y * W + x) * ch;
            rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
          }
        }
        rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
        const mid = Math.floor(rs.length / 2);
        const r = rs[mid], g = gs[mid], b = bs[mid];
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        regions.push({ r, g, b, sat, val: mx / 255, mx });
      }
    }

    // Remove near-white background regions (product photo backgrounds)
    const nonBg = regions.filter(x => x.mx < 210);
    const pool = nonBg.length > 0 ? nonBg : regions;

    // Find how many regions are distinctly colorful (sat > 0.15)
    const colorful = pool.filter(x => x.sat > 0.15);

    let domR, domG, domB;

    if (colorful.length >= 3) {
      // Multiple colorful regions = the clothing IS that color
      const sorted = [...colorful].sort((a, b) => a.r - b.r);
      const mid = Math.floor(sorted.length / 2);
      domR = sorted[mid].r; domG = colorful.sort((a,b) => a.g-b.g)[mid].g; domB = colorful.sort((a,b) => a.b-b.b)[mid].b;
      // Use median of each channel independently
      const rs = colorful.map(x => x.r).sort((a,b)=>a-b);
      const gs = colorful.map(x => x.g).sort((a,b)=>a-b);
      const bs = colorful.map(x => x.b).sort((a,b)=>a-b);
      const m = Math.floor(rs.length / 2);
      domR = rs[m]; domG = gs[m]; domB = bs[m];
    } else if (colorful.length >= 1) {
      // 1-2 colorful regions — could be a small accent detail
      // Only trust it if the darkest non-bg region is also somewhat colorful
      const darkest = [...pool].sort((a, b) => a.val - b.val)[0];
      if (darkest.sat > 0.10) {
        domR = darkest.r; domG = darkest.g; domB = darkest.b;
      } else {
        // Single saturated region is likely an accent (buckle, logo, etc.)
        // Use the darkest region — the actual item is dark/black
        domR = darkest.r; domG = darkest.g; domB = darkest.b;
      }
    } else {
      // Fully achromatic — use the darkest non-background region
      const darkest = [...pool].sort((a, b) => a.val - b.val)[0];
      domR = darkest.r; domG = darkest.g; domB = darkest.b;
    }

    console.log(`[Color] Dominant RGB: (${domR}, ${domG}, ${domB})`);
    return rgbToColorName(domR, domG, domB);

  } catch (err) {
    console.error('[Color Detection] Error:', err.message);
    return 'unknown';
  }
};

const rgbToColorName = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const diff = mx - mn;
  const sat = mx > 0 ? diff / mx : 0;
  const val = mx / 255;

  // White
  if (r > 215 && g > 215 && b > 215) return 'white';
  // Black
  if (mx < 45) return 'black';

  // Achromatic
  if (sat < 0.12) {
    if (val < 0.35) return 'dark grey';
    if (val < 0.65) return 'grey';
    return 'light grey';
  }

  // Hue calculation
  let h;
  const rn = r/255, gn = g/255, bn = b/255;
  const mxn = Math.max(rn,gn,bn), mnn = Math.min(rn,gn,bn), d = mxn - mnn;
  if (mxn === rn)      h = ((gn - bn) / d + 6) % 6;
  else if (mxn === gn) h = (bn - rn) / d + 2;
  else                 h = (rn - gn) / d + 4;
  const hue = h * 60;

  if (hue < 15 || hue >= 345) return val < 0.4 ? 'maroon' : (sat < 0.5 ? 'pink' : 'red');
  if (hue < 40)  return val < 0.45 ? 'black' : (val < 0.60 ? 'brown' : 'orange');
  if (hue < 70)  return val < 0.5 ? 'olive' : (sat < 0.5 ? 'beige' : 'yellow');
  if (hue < 150) return sat < 0.20 ? 'olive' : (val < 0.45 ? 'dark green' : 'green');
  if (hue < 195) return val < 0.35 ? 'dark teal' : 'teal';
  if (hue < 255) return val < 0.45 ? 'navy' : (sat < 0.45 ? 'light blue' : 'blue');
  if (hue < 290) return val < 0.40 ? 'indigo' : 'purple';
  return sat < 0.5 ? 'pink' : 'magenta';
};

const getHue = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(h * 60 + (h < 0 ? 360 : 0));
};

// ─── Call Python ML service ────────────────────────────────────────────────────

// ─── Hugging Face free clothing classification ────────────────────────────────
// Uses "microsoft/resnet-50" fine-tuned on fashion via HF Inference API (free).
// Falls back gracefully if token missing or API down.

const HF_CLOTHING_KEYWORDS = {
  // tops
  'shirt': 'top', 'blouse': 'top', 't-shirt': 'top', 'tshirt': 'top',
  'sweater': 'top', 'jersey': 'top', 'pullover': 'top', 'tank': 'top',
  'turtleneck': 'top', 'cardigan': 'top', 'polo': 'top', 'vest': 'top',
  // outerwear
  'hoodie': 'outerwear', 'jacket': 'outerwear', 'coat': 'outerwear',
  'blazer': 'outerwear', 'windbreaker': 'outerwear', 'parka': 'outerwear',
  // bottoms
  'trouser': 'bottom', 'pant': 'bottom', 'jean': 'bottom', 'skirt': 'bottom',
  'short': 'bottom', 'chino': 'bottom', 'legging': 'bottom',
  // dresses
  'dress': 'dress', 'gown': 'dress', 'jumpsuit': 'dress',
  // footwear
  'shoe': 'footwear', 'boot': 'footwear', 'sneaker': 'footwear',
  'sandal': 'footwear', 'heel': 'footwear', 'loafer': 'footwear',
  'oxford': 'footwear', 'slipper': 'footwear',
  // accessories
  'bag': 'accessory', 'handbag': 'accessory', 'backpack': 'accessory',
  'hat': 'accessory', 'cap': 'accessory', 'scarf': 'accessory',
  'tie': 'accessory', 'belt': 'accessory', 'watch': 'accessory',
  'glasses': 'accessory', 'sunglasses': 'accessory', 'gloves': 'accessory',
};

const typeToRaw = {
  top: 'T-shirt', bottom: 'Trouser', dress: 'Dress',
  outerwear: 'Coat', footwear: 'Sneaker', accessory: 'Bag'
};

// Tries multiple HF models in order until one works
const HF_MODELS = [
  // Best fashion-specific classifier on HF (free tier)
  'abyildirim/efficientnet-b0-feature-vector-FashionMNIST',
  // General image classifier — has enough clothing categories
  'google/vit-base-patch16-224',
  // Fallback general classifier
  'microsoft/resnet-50',
];

const classifyWithML = async (imagePath) => {
  const HF_TOKEN = process.env.HF_API_TOKEN;
  if (!HF_TOKEN) {
    console.log('[HF] No HF_API_TOKEN in .env — skipping');
    return null;
  }

  const imageBuffer = fs.readFileSync(imagePath);

  for (const model of HF_MODELS) {
    try {
      const res = await axios.post(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': 'image/jpeg',
          },
          timeout: 20000,
        }
      );

      const predictions = res.data;
      if (!Array.isArray(predictions) || predictions.length === 0) continue;

      console.log(`[HF:${model}] Top predictions:`, predictions.slice(0, 3).map(p => `${p.label}(${(p.score||0).toFixed(2)})`).join(', '));

      // Scan each prediction label for clothing keywords
      for (const pred of predictions) {
        const label = (pred.label || '').toLowerCase().replace(/_/g, ' ');
        const score = pred.score || 0;

        for (const [keyword, fitoraType] of Object.entries(HF_CLOTHING_KEYWORDS)) {
          if (label.includes(keyword)) {
            console.log(`[HF] ✅ "${label}" → ${fitoraType} (score: ${score.toFixed(3)})`);
            return {
              type: typeToRaw[fitoraType] || 'T-shirt',
              fitoraType,
              confidence: score,
              style: ['casual'],
              source: `huggingface:${model}`,
            };
          }
        }
      }

      console.log(`[HF:${model}] No clothing match found, trying next model...`);

    } catch (err) {
      if (err.response?.status === 503) {
        console.log(`[HF:${model}] Cold start (model loading) — skipping`);
      } else if (err.response?.status === 401) {
        console.log('[HF] Invalid token — check HF_API_TOKEN in .env');
        return null; // No point trying other models
      } else {
        console.log(`[HF:${model}] Error:`, err.message);
      }
    }
  }

  console.log('[HF] All models exhausted or no clothing detected');
  return null;
};

// ─── Type/category mapping ────────────────────────────────────────────────────

const TYPE_MAP = {
  'T-shirt': 'top', 'Shirt': 'top', 'Pullover': 'top', 'top': 'top',
  'Trouser': 'bottom', 'bottom': 'bottom', 'jeans': 'bottom', 'pants': 'bottom',
  'Dress': 'dress', 'dress': 'dress',
  'Coat': 'outerwear', 'outerwear': 'outerwear', 'jacket': 'outerwear',
  'Sandal': 'footwear', 'Sneaker': 'footwear', 'Ankle boot': 'footwear', 'footwear': 'footwear', 'shoes': 'footwear',
  'Bag': 'accessory', 'accessory': 'accessory'
};

const CATEGORY_MAP = {
  top: 'Tops', bottom: 'Bottoms', dress: 'Dresses',
  outerwear: 'Outerwear', footwear: 'Shoes', accessory: 'Accessories', other: 'Tops'
};

const getImageUrl = (req, filePath) =>
  `${req.protocol}://${req.get('host')}/uploads/${path.basename(filePath)}`;

// ─── Visual type detection from image shape/composition ──────────────────────
// Analyzes the 3x3 grid of the image to detect footwear vs tops vs bottoms.
// Works for product photos where item fills most of the frame.

const detectTypeFromImage = async (imagePath) => {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(90, 90, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ch = info.channels;
    const W = info.width;

    // Get median brightness for each of 9 grid regions
    const regionBrightness = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const vals = [];
        for (let y = row * 30; y < (row + 1) * 30; y++) {
          for (let x = col * 30; x < (col + 1) * 30; x++) {
            const i = (y * W + x) * ch;
            vals.push(Math.max(data[i], data[i+1], data[i+2]));
          }
        }
        vals.sort((a, b) => a - b);
        regionBrightness.push(vals[Math.floor(vals.length / 2)]);
      }
    }

    // regionBrightness layout (row-major):
    // [0][1][2]  ← top row
    // [3][4][5]  ← middle row
    // [6][7][8]  ← bottom row

    const topRow    = (regionBrightness[0] + regionBrightness[1] + regionBrightness[2]) / 3;
    const midRow    = (regionBrightness[3] + regionBrightness[4] + regionBrightness[5]) / 3;
    const botRow    = (regionBrightness[6] + regionBrightness[7] + regionBrightness[8]) / 3;
    const leftCol   = (regionBrightness[0] + regionBrightness[3] + regionBrightness[6]) / 3;
    const rightCol  = (regionBrightness[2] + regionBrightness[5] + regionBrightness[8]) / 3;
    const midColVal = (regionBrightness[1] + regionBrightness[4] + regionBrightness[7]) / 3;

    // Estimate background brightness from the corners
    const cornerBrightness = (regionBrightness[0] + regionBrightness[2] + regionBrightness[6] + regionBrightness[8]) / 4;
    const itemBrightness   = regionBrightness[4]; // center
    const isDarkItem = itemBrightness < cornerBrightness - 20;
    const isLightItem = itemBrightness > cornerBrightness + 20;

    // FOOTWEAR detection heuristics:
    // 1. Bottom row is much darker than top row (shoe sitting on surface)
    // 2. Bright background at top, dark item at bottom-center
    // 3. Left + right cols roughly equal (symmetric shoe pair side-by-side)
    const bottomHeavy = botRow < topRow - 25;
    const midDark = midRow < topRow - 15;
    const symmetric = Math.abs(leftCol - rightCol) < 30;

    if ((bottomHeavy || midDark) && symmetric) {
      console.log('[VisualType] footwear detected (bottom-heavy dark composition)');
      return { type: 'Sneaker', fitoraType: 'footwear', category: 'Shoes', confidence: 0.65 };
    }

    // BOTTOM (trousers/jeans/skirts) detection:
    // The garment appears to occupy bottom 2/3, usually light background at top
    // Middle column is darker than side columns (leg gap between them)
    const midColDark = midColVal < leftCol - 10 && midColVal < rightCol - 10;
    const bottomPrimary = botRow < topRow - 10 && midRow < topRow - 5;

    if (bottomPrimary && midColDark) {
      console.log('[VisualType] bottom detected (two-column leg structure)');
      return { type: 'Trouser', fitoraType: 'bottom', category: 'Bottoms', confidence: 0.60 };
    }

    // DRESS detection: uniform dark column from top to bottom, narrow width
    // (tall narrow item filling the frame)
    const allRowsSimilar = Math.max(topRow, midRow, botRow) - Math.min(topRow, midRow, botRow) < 25;
    const centerDark = itemBrightness < (leftCol + rightCol) / 2 - 15;
    if (allRowsSimilar && centerDark) {
      console.log('[VisualType] possible dress/full-length item');
      return { type: 'Dress', fitoraType: 'dress', category: 'Dresses', confidence: 0.50 };
    }

    console.log('[VisualType] defaulting to top');
    return null; // can't determine — fall through to default

  } catch (err) {
    console.error('[VisualType] Error:', err.message);
    return null;
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const uploadItem = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image' });

    // ============================================================================
    // FIX: Proper variable declaration and scoping
    // ============================================================================
    
    // Run color analysis, ML, and visual type detection in parallel
    let detectedColor = 'unknown';
    let mlResult = null;
    let visualType = null;
    
    try {
      [detectedColor, mlResult, visualType] = await Promise.all([
        analyzeColor(req.file.path),
        classifyWithML(req.file.path),
        detectTypeFromImage(req.file.path)
      ]);
    } catch (err) {
      console.error('[Upload] Analysis error:', err);
      // Continue with defaults if analysis fails
    }

    // ── Determine type: priority order is manual > name keywords > ML (high confidence only) > default ──
    let rawType = 'T-shirt';
    let fitoraType = 'top';
    let category = 'Tops';
    let classificationSource = 'default';

    if (req.body.type) {
      // 1. User manually specified a type — highest priority
      rawType = req.body.type;
      fitoraType = TYPE_MAP[req.body.type] || req.body.type;
      category = CATEGORY_MAP[fitoraType] || 'Tops';
      classificationSource = 'manual';

    } else if (req.body.name) {
      // 2. Keyword detection from item name — reliable
      const name = req.body.name.toLowerCase();

      if (name.match(/shoe|loafer|sneaker|boot|sandal|heel|slipper|oxford/)) {
        rawType = 'Sneaker'; fitoraType = 'footwear'; category = 'Shoes';
        classificationSource = 'name-keyword';
      } else if (name.match(/jean|pant|trouser|short|skirt|chino/)) {
        rawType = 'Trouser'; fitoraType = 'bottom'; category = 'Bottoms';
        classificationSource = 'name-keyword';
      } else if (name.match(/dress|gown/)) {
        rawType = 'Dress'; fitoraType = 'dress'; category = 'Dresses';
        classificationSource = 'name-keyword';
      } else if (name.match(/jacket|coat|blazer|hoodie/)) {
        rawType = 'Coat'; fitoraType = 'outerwear'; category = 'Outerwear';
        classificationSource = 'name-keyword';
      } else if (mlResult && mlResult.type && (mlResult.confidence || 0) >= 0.60) {
        // 3a. Name didn't match, but ML is confident enough
        rawType = mlResult.type;
        fitoraType = TYPE_MAP[rawType] || 'top';
        category = CATEGORY_MAP[fitoraType] || 'Tops';
        classificationSource = 'ml-service';
      } else if (visualType) {
        // 3b. Visual detection from image composition
        rawType = visualType.type;
        fitoraType = visualType.fitoraType;
        category = visualType.category;
        classificationSource = 'visual-detection';
      }
      // else: keep defaults

    } else if (mlResult && mlResult.type && (mlResult.confidence || 0) >= 0.60) {
      // No name — use ML if confident
      rawType = mlResult.type;
      fitoraType = TYPE_MAP[rawType] || 'top';
      category = CATEGORY_MAP[fitoraType] || 'Tops';
      classificationSource = 'ml-service';
    } else if (visualType) {
      // No name, no ML — use visual detection
      rawType = visualType.type;
      fitoraType = visualType.fitoraType;
      category = visualType.category;
      classificationSource = 'visual-detection';
    }

    console.log(`[Upload] Classification source: ${classificationSource}, type: ${fitoraType}`);

    // ── Parse tags safely — accept JSON array, comma-separated string, or array ──
    let parsedTags = [];
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        parsedTags = req.body.tags;
      } else {
        try {
          const parsed = JSON.parse(req.body.tags);
          parsedTags = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          // Not valid JSON — treat as comma-separated string
          parsedTags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
    }

    const imageUrl = getImageUrl(req, req.file.path);

    const item = await WardrobeItem.create({
      userId: req.user._id,
      name: req.body.name || `${rawType} ${Date.now()}`,
      type: fitoraType,
      category: req.body.category || category,
      color: {
        primary: req.body.color || detectedColor || 'unknown',
        secondary: req.body.secondaryColor
      },
      style: req.body.style ? [req.body.style] : (mlResult?.style || ['casual']),
      occasion: req.body.occasion ? [req.body.occasion] : ['daily'],
      season: req.body.season ? [req.body.season] : ['all'],
      brand: req.body.brand,
      size: req.body.size,
      tags: parsedTags,
      notes: req.body.notes,
      imageUrl,
      imagePath: req.file.path
    });

    res.status(201).json({
      success: true,
      message: 'Item uploaded successfully',
      item,
      classification: {
        detectedType: rawType,
        detectedColor,
        confidence: mlResult?.confidence || 0,
        mlUsed: !!mlResult,
        source: classificationSource
      }
    });
  } catch (err) {
    console.error('[Upload] Error:', err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWardrobe = async (req, res) => {
  try {
    const { type, category, color, style, occasion, season, search } = req.query;
    const filter = { userId: req.user._id, isActive: true };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (color) filter['color.primary'] = new RegExp(color, 'i');
    if (style) filter.style = { $in: [style] };
    if (occasion) filter.occasion = { $in: [occasion] };
    if (season) filter.season = { $in: [season] };
    if (search) filter.name = new RegExp(search, 'i');

    const items = await WardrobeItem.find(filter).sort({ createdAt: -1 });

    const stats = { total: items.length, byType: {}, byCategory: {} };
    items.forEach(i => {
      stats.byType[i.type] = (stats.byType[i.type] || 0) + 1;
      stats.byCategory[i.category] = (stats.byCategory[i.category] || 0) + 1;
    });

    res.json({ success: true, count: items.length, stats, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await WardrobeItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isActive = false;
    await item.save();
    res.json({ success: true, message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};