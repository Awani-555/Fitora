import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const classifyWithCloudinary = async (imagePath) => {
  try {
    // Upload to Cloudinary with auto-tagging
    const result = await cloudinary.uploader.upload(imagePath, {
      categorization: 'google_tagging',
      auto_tagging: 0.6,  // 60% confidence threshold
      resource_type: 'auto'
    });
    
    // Get tags
    const tags = result.tags || [];
    
    // Map tags to clothing types
    const typeMapping = {
      'shirt': 'top',
      'tshirt': 'top',
      't-shirt': 'top',
      'sweater': 'top',
      'blouse': 'top',
      'pants': 'bottom',
      'jeans': 'bottom',
      'trousers': 'bottom',
      'skirt': 'bottom',
      'dress': 'dress',
      'jacket': 'outerwear',
      'coat': 'outerwear',
      'shoe': 'footwear',
      'sneaker': 'footwear',
      'boot': 'footwear',
      'sandal': 'footwear'
    };
    
    // Find best match
    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      for (const [keyword, type] of Object.entries(typeMapping)) {
        if (normalized.includes(keyword)) {
          return {
            type,
            confidence: result.info?.categorization?.google_tagging?.confidence || 0.7,
            tags,
            imageUrl: result.secure_url  // Use Cloudinary URL
          };
        }
      }
    }
    
    return {
      type: 'top',  // Default fallback
      confidence: 0,
      tags,
      imageUrl: result.secure_url
    };
    
  } catch (err) {
    console.error('[Cloudinary] Classification failed:', err);
    return null;
  }
};