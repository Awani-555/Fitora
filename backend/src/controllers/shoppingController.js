import WardrobeItem from '../models/WardrobeItem.js';

const WARDROBE_ESSENTIALS = [
  { type: 'top',       min: 5, name: 'Tops',       priority: 'high',   icon: '👕' },
  { type: 'bottom',    min: 3, name: 'Bottoms',     priority: 'high',   icon: '👖' },
  { type: 'footwear',  min: 2, name: 'Footwear',    priority: 'high',   icon: '👟' },
  { type: 'outerwear', min: 1, name: 'Outerwear',   priority: 'medium', icon: '🧥' },
  { type: 'accessory', min: 2, name: 'Accessories', priority: 'low',    icon: '⌚' },
  { type: 'dress',     min: 1, name: 'Dresses/Formals', priority: 'low', icon: '👗' }
];

const buildLinks = (searchQuery) => {
  const q = encodeURIComponent(searchQuery);
  const mqSlug = searchQuery.toLowerCase().replace(/\s+/g, '-');
  return {
    myntra:   `https://www.myntra.com/${mqSlug}`,
    amazon:   `https://www.amazon.in/s?k=${q}&i=fashion`,
    flipkart: `https://www.flipkart.com/search?q=${q}&otracker=search`
  };
};

const RECOMMENDATIONS_DB = {
  top: [
    { name: 'White Oxford Shirt',     reason: 'Most versatile top you can own — works formal & casual', price: '₹800–2,000',  query: 'men white oxford shirt' },
    { name: 'Grey Crew Neck T-Shirt', reason: 'Pairs with literally everything in your wardrobe',       price: '₹400–1,200',  query: 'grey crew neck t shirt' },
    { name: 'Navy Blue Polo',         reason: 'Smart casual staple for college + outings',              price: '₹600–1,500',  query: 'navy polo t shirt men' }
  ],
  bottom: [
    { name: 'Dark Wash Slim Jeans',   reason: 'Most versatile bottom — dress up or down easily',       price: '₹1,200–3,000', query: 'dark wash slim fit jeans men' },
    { name: 'Beige Chinos',           reason: 'Bridges the gap between casual and formal',             price: '₹1,000–2,500', query: 'beige chinos men' },
    { name: 'Black Trousers',         reason: 'Instant formal look — essential for any wardrobe',      price: '₹800–2,000',  query: 'black formal trousers men' }
  ],
  footwear: [
    { name: 'White Canvas Sneakers',  reason: 'Works with 90% of casual outfits effortlessly',        price: '₹1,500–4,000', query: 'white canvas sneakers men' },
    { name: 'Brown Leather Loafers',  reason: 'Elevates any smart-casual look instantly',             price: '₹2,000–5,000', query: 'brown leather loafers men' }
  ],
  outerwear: [
    { name: 'Classic Denim Jacket',   reason: 'Adds depth and texture to any casual outfit',          price: '₹1,500–3,500', query: 'classic denim jacket men' },
    { name: 'Olive Bomber Jacket',    reason: 'Trendy and functional — great for transitions',        price: '₹2,000–4,000', query: 'olive bomber jacket men' }
  ],
  accessory: [
    { name: 'Brown Leather Belt',     reason: 'Ties your footwear and bottom together',               price: '₹500–1,500',  query: 'brown leather belt men' },
    { name: 'Minimalist Watch',       reason: 'Single biggest outfit upgrade you can make',           price: '₹1,000–5,000', query: 'minimalist analog watch men' }
  ],
  dress: [
    { name: 'Little Black Dress',     reason: 'Works for dates, parties, and semi-formals',           price: '₹1,000–3,000', query: 'little black dress women' },
    { name: 'Floral Midi Dress',      reason: 'Versatile for brunches, dates, and casual days',      price: '₹800–2,500',  query: 'floral midi dress women' }
  ]
};

export const getShopping = async (req, res) => {
  try {
    const wardrobe = await WardrobeItem.find({ userId: req.user._id, isActive: true });

    // Count by type
    const counts = {};
    wardrobe.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });

    // Find gaps
    const gaps = WARDROBE_ESSENTIALS
      .filter(e => (counts[e.type] || 0) < e.min)
      .map(e => ({
        ...e,
        have:    counts[e.type] || 0,
        need:    e.min,
        missing: e.min - (counts[e.type] || 0)
      }))
      .sort((a, b) => b.missing - a.missing);

    // Build recommendations with shopping links
    const recommendations = gaps.slice(0, 5).flatMap(gap => {
      const items = RECOMMENDATIONS_DB[gap.type] || [];
      return items.slice(0, 2).map(item => ({
        ...item,
        category: gap.name,
        type: gap.type,
        icon: gap.icon,
        priority: gap.priority,
        links: buildLinks(item.query)
      }));
    });

    // Wardrobe health score
    const totalPoints = WARDROBE_ESSENTIALS.length;
    const earnedPoints = WARDROBE_ESSENTIALS.filter(e => (counts[e.type] || 0) >= e.min).length;
    const wardrobeScore = Math.round((earnedPoints / totalPoints) * 100);

    // Color analysis
    const colors = {};
    wardrobe.forEach(i => {
      const c = i.color?.primary;
      if (c && c !== 'unknown') colors[c] = (colors[c] || 0) + 1;
    });
    const topColors = Object.entries(colors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => ({ color, count }));

    res.json({
      success: true,
      wardrobeScore,
      wardrobeHealth: wardrobeScore >= 80 ? '🟢 Complete' : wardrobeScore >= 50 ? '🟡 Building' : '🔴 Getting Started',
      totalItems: wardrobe.length,
      gaps,
      recommendations,
      colorPalette: topColors,
      message: gaps.length === 0
        ? '🎉 Your wardrobe is well-stocked! You have all the essentials covered.'
        : `You're missing ${gaps.length} essential categor${gaps.length > 1 ? 'ies' : 'y'}. Here's what to add next to maximize your outfits.`,
      shoppingNote: '💡 All links go to Myntra, Amazon & Flipkart — free browsing, no commission.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
