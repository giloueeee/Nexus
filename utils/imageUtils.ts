
import { NewsCategory } from './rssUtils';

// Using high-quality Unsplash images to ensure reliability in the web preview environment
// Keys must match the lowercase topic names exactly (e.g. "Sciences" -> "sciences")
export const CATEGORY_IMAGES: Record<string, string> = {
  finance: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1170&auto=format&fit=crop&w=800&q=80', // Blue Line Chart
  medicine: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80', // Stethoscope/Blue
  space: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', // Earth/Space
  sciences: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80', // Science/Tech - Fixed key from 'science' to 'sciences'
  politics: 'https://misterprepa.net/wp-content/uploads/2024/01/AdobeStock_66941618-1024x630.jpg', // Capitol Building (Unsplash)
  sports: 'https://plus.unsplash.com/premium_photo-1713360590902-1ade983e1969?q=80&w=1170&auto=format&fit=crop&w=800&q=80', // Runner/Track
  custom: 'https://plus.unsplash.com/premium_vector-1761061546456-fda1aec556f0?q=80&w=870&auto=format&fit=crop&w=800&q=80' // Generic Podcast/Mic
};

export const getImageUrl = (category?: string | null): string => {
  const normalizedCat = category?.toLowerCase();
  
  // Default to finance/custom if category not found
  if (!normalizedCat || !(normalizedCat in CATEGORY_IMAGES)) {
    return CATEGORY_IMAGES.custom;
  }
  
  return CATEGORY_IMAGES[normalizedCat];
};
