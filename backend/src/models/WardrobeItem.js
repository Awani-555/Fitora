import mongoose from 'mongoose';

const wardrobeItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'other'],
    lowercase: true
  },
  category: {
    type: String,
    enum: ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Dresses', 'Outerwear'],
    required: true
  },
  color: {
    primary: {
      type: String,
      required: [true, 'Primary color is required'],
      lowercase: true
    },
    secondary: {
      type: String,
      lowercase: true
    }
  },
  style: {
    type: [String],
    enum: ['casual', 'formal', 'sporty', 'trendy', 'classic', 'party', 'minimal'],
    default: ['casual']
  },
  occasion: {
    type: [String],
    enum: ['daily', 'work', 'party', 'date', 'sport', 'formal', 'casual'],
    default: ['daily']
  },
  season: {
    type: [String],
    enum: ['spring', 'summer', 'fall', 'winter', 'all'],
    default: ['all']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  size: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image is required']
  },
  imagePath: {
    type: String // Local file path for cleanup
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
wardrobeItemSchema.index({ userId: 1, type: 1 });
wardrobeItemSchema.index({ userId: 1, 'color.primary': 1 });
wardrobeItemSchema.index({ userId: 1, style: 1 });
wardrobeItemSchema.index({ userId: 1, occasion: 1 });

// Increment timesWorn when item is used in an outfit
wardrobeItemSchema.methods.incrementWorn = async function() {
  this.timesWorn += 1;
  this.lastWorn = new Date();
  return await this.save();
};

export default mongoose.model('WardrobeItem', wardrobeItemSchema);
