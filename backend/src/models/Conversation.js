import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  outfitSuggestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outfit'
  }],
  wardrobeItemSuggestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem'
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: 'New Conversation'
  },
  messages: [messageSchema],
  context: {
    occasion: String,
    mood: String,
    season: String,
    weather: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
conversationSchema.index({ userId: 1, createdAt: -1 });

// Method to add message
conversationSchema.methods.addMessage = async function(role, content, suggestions = {}) {
  this.messages.push({
    role,
    content,
    outfitSuggestions: suggestions.outfits || [],
    wardrobeItemSuggestions: suggestions.items || [],
    timestamp: new Date()
  });
  
  // Update conversation title if it's the first user message
  if (this.messages.length === 1 && role === 'user') {
    this.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }
  
  return await this.save();
};

export default mongoose.model('Conversation', conversationSchema);
