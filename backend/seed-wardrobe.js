/**
 * seed-wardrobe.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manually inserts wardrobe items into MongoDB Atlas — no image upload needed.
 * Items use emoji placeholders so the app shows them immediately.
 *
 * HOW TO RUN:
 *   1. cd into your backend folder
 *   2. node seed-wardrobe.js
 *
 * HOW TO GET YOUR USER ID:
 *   Option A — After logging in, open your browser / Postman and call:
 *     GET http://localhost:5000/api/auth/me
 *     Header: Authorization: Bearer <your_token>
 *
 *   Option B — Run this first to print all users:
 *     node seed-wardrobe.js --list-users
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';

dotenv.config();

// ── 1. PASTE YOUR USER ID HERE ───────────────────────────────────────────────
//    (the _id from the users collection — looks like 64abc123def456...)
const USER_ID = 'PASTE_YOUR_USER_ID_HERE';

// ── 2. ITEMS TO ADD ──────────────────────────────────────────────────────────
//    imageUrl can be a real URL or a placeholder emoji-based path.
//    The app will show the emoji fallback if the URL 404s, so this is fine.
const ITEMS = [
  {
    name:      'White T-Shirt',
    type:      'top',
    category:  'Tops',
    color:     { primary: 'white' },
    style:     ['casual', 'minimal'],
    occasion:  ['daily', 'casual'],
    season:    ['all'],
    imageUrl:  'https://www.pinterest.com/pin/431078995588764818/',   // app shows 👕 emoji fallback
  },
  {
    name:      'Dark Blue Jeans',
    type:      'bottom',
    category:  'Bottoms',
    color:     { primary: 'navy' },
    style:     ['casual', 'classic'],
    occasion:  ['daily', 'casual'],
    season:    ['all'],
    imageUrl:  'https://www.istockphoto.com/photos/blue-jeans',
  },
  {
    name:      'Black Formal Shirt',
    type:      'top',
    category:  'Tops',
    color:     { primary: 'black' },
    style:     ['formal', 'classic'],
    occasion:  ['work', 'formal'],
    season:    ['all'],
    imageUrl:  'https://www.selectedhomme.in/products/139614405-black?srsltid=AfmBOorDePpUeBLxLIgTK2KGOOFRk4CFL2GnASyFUnkLZpmmn3whfwDh',
  },
  {
    name:      'Beige Chinos',
    type:      'bottom',
    category:  'Bottoms',
    color:     { primary: 'beige' },
    style:     ['casual', 'classic'],
    occasion:  ['work', 'daily'],
    season:    ['spring', 'summer', 'fall'],
    imageUrl:  'https://desiminimals.com/products/beige-relaxed-chinos?srsltid=AfmBOopCh3iRTZLRou0mN9VGj29x3__Fl3c8_Wf4NGiHKbyYmqvTRRou',
  },
  {
    name:      'White Sneakers',
    type:      'footwear',
    category:  'Shoes',
    color:     { primary: 'white' },
    style:     ['casual', 'sporty'],
    occasion:  ['daily', 'casual'],
    season:    ['all'],
    imageUrl:  'placeholder',
  },
  {
    name:      'Black Leather Shoes',
    type:      'footwear',
    category:  'Shoes',
    color:     { primary: 'black' },
    style:     ['formal', 'classic'],
    occasion:  ['work', 'formal'],
    season:    ['all'],
    imageUrl:  'placeholder',
  },
  {
    name:      'Navy Blazer',
    type:      'outerwear',
    category:  'Outerwear',
    color:     { primary: 'navy' },
    style:     ['formal', 'classic'],
    occasion:  ['work', 'formal', 'date'],
    season:    ['fall', 'winter', 'spring'],
    imageUrl:  'placeholder',
  },
  {
    name:      'Grey Hoodie',
    type:      'top',
    category:  'Tops',
    color:     { primary: 'grey' },
    style:     ['casual', 'sporty'],
    occasion:  ['daily', 'casual'],
    season:    ['fall', 'winter'],
    imageUrl:  'placeholder',
  },
  {
    name:      'Black Watch',
    type:      'accessory',
    category:  'Accessories',
    color:     { primary: 'black' },
    style:     ['formal', 'classic', 'minimal'],
    occasion:  ['daily', 'work', 'formal'],
    season:    ['all'],
    imageUrl:  'placeholder',
  },
  {
    name:      'Floral Summer Dress',
    type:      'dress',
    category:  'Dresses',
    color:     { primary: 'multicolor', secondary: 'white' },
    style:     ['casual', 'trendy'],
    occasion:  ['casual', 'date', 'party'],
    season:    ['spring', 'summer'],
    imageUrl:  'placeholder',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const wardrobeItemSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  type:     { type: String, required: true, enum: ['top','bottom','dress','outerwear','footwear','accessory','other'] },
  category: { type: String, required: true, enum: ['Tops','Bottoms','Shoes','Accessories','Dresses','Outerwear'] },
  color:    { primary: { type: String, required: true }, secondary: String },
  style:    { type: [String], default: ['casual'] },
  occasion: { type: [String], default: ['daily'] },
  season:   { type: [String], default: ['all'] },
  brand:    String,
  size:     String,
  imageUrl: { type: String, required: true },
  imagePath:String,
  tags:     [String],
  notes:    String,
  timesWorn:{ type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function main() {
  const args = process.argv.slice(2);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  // ── List users mode ────────────────────────────────────────────────────────
  if (args.includes('--list-users')) {
    const users = await mongoose.connection.db.collection('users').find({}, { projection: { _id:1, name:1, email:1 } }).toArray();
    console.log('\n👥  Users in database:');
    users.forEach(u => console.log(`  _id: ${u._id}  |  name: ${u.name}  |  email: ${u.email}`));
    console.log('\nCopy the _id above and paste it into USER_ID at the top of this script.');
    await mongoose.disconnect();
    return;
  }

  // ── Validate USER_ID ───────────────────────────────────────────────────────
  if (USER_ID === 'PASTE_YOUR_USER_ID_HERE') {
    console.error('\n❌  Please set USER_ID at the top of this script first.');
    console.log('   Run:  node seed-wardrobe.js --list-users   to find your user ID.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(USER_ID)) {
    console.error(`\n❌  "${USER_ID}" is not a valid MongoDB ObjectId.\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const WardrobeItem = mongoose.model('WardrobeItem', wardrobeItemSchema);

  // ── Check if user already has items (avoid duplicates) ───────────────────
  const existing = await WardrobeItem.countDocuments({ userId: USER_ID });
  if (existing > 0) {
    console.log(`\n⚠️   User already has ${existing} wardrobe items.`);
    const answer = await prompt('Add more anyway? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      await mongoose.disconnect();
      return;
    }
  }

  // ── Insert items ───────────────────────────────────────────────────────────
  const docs = ITEMS.map(item => ({ ...item, userId: new mongoose.Types.ObjectId(USER_ID) }));
  const result = await WardrobeItem.insertMany(docs);

  console.log(`\n✅  Added ${result.length} items to wardrobe!\n`);
  result.forEach(i => console.log(`  • ${i.name}  (${i.type}, ${i.color.primary})`));
  console.log('\nRefresh your app — items will appear in the Wardrobe tab.');

  await mongoose.disconnect();
}

// Simple stdin prompt helper
function prompt(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.once('data', d => resolve(d.toString().trim()));
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});