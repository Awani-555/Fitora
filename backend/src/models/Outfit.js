import mongoose from 'mongoose';

const outfitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Outfit name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true
    },
    type: {
      type: String,
      enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'other'],
      required: true
    }
  }],
  occasion: {
    type: String,
    enum: ['daily', 'work', 'party', 'date', 'sport', 'formal', 'casual'],
    required: true
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'all'],
    default: 'all'
  },
  mood: {
    type: String,
    enum: ['confident', 'minimal', 'bold', 'comfortable', 'elegant'],
    default: 'comfortable'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiReasoning: {
    type: String,
    maxlength: [1000, 'AI reasoning cannot exceed 1000 characters']
  },
  imageUrl: {
    type: String // Optional: combined outfit image
  },
  tags: [String],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  timesWorn: {
    type: Number,
    default: 0,
    min: 0
  },
  lastWorn: {
    type: Date
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
outfitSchema.index({ userId: 1, occasion: 1 });
outfitSchema.index({ userId: 1, createdAt: -1 });
outfitSchema.index({ userId: 1, aiGenerated: 1 });

// Method to increment timesWorn
outfitSchema.methods.incrementWorn = async function() {
  this.timesWorn += 1;
  this.lastWorn = new Date();
  
  // Also increment timesWorn for each item in the outfit
  const WardrobeItem = mongoose.model('WardrobeItem');
  const itemIds = this.items.map(item => item.itemId);
  
  await WardrobeItem.updateMany(
    { _id: { $in: itemIds } },
    { 
      $inc: { timesWorn: 1 },
      $set: { lastWorn: new Date() }
    }
  );
  
  return await this.save();
};

export default mongoose.model('Outfit', outfitSchema);
