/**
 * Image Helper Utility
 * Provides functions to validate, sanitize, and handle image URLs
 */

/**
 * Removes CDN wrapper from image URLs
 * Removes: https://cdn.nhathuoclongchau.com.vn/unsafe/.../filters:quality(...)/
 * Keeps only the original URL
 */
export function cleanImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  const trimmed = url.trim();
  
  // Pattern to match: https://cdn.nhathuoclongchau.com.vn/unsafe/.../filters:quality(...)/https://...
  const cdnPattern = /^https:\/\/cdn\.nhathuoclongchau\.com\.vn\/unsafe\/[^/]+\/filters:quality\([^)]+\)\/(https?:\/\/.+)$/;
  const match = trimmed.match(cdnPattern);
  
  if (match && match[1]) {
    // Return the original URL (the part after the CDN wrapper)
    return match[1];
  }
  
  // If no match, return original URL
  return trimmed;
}

/**
 * Validates if a URL is valid
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  // Check for common invalid values
  const invalidValues = ['null', 'undefined', 'none', 'N/A', 'N/A'];
  if (invalidValues.includes(url.trim().toLowerCase())) {
    return false;
  }

  // Check if it's a valid URL format
  try {
    // For relative paths, they're valid
    if (url.startsWith('/') || url.startsWith('./')) {
      return true;
    }
    
    // For absolute URLs, validate the format
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    // If URL parsing fails, it might still be a valid relative path
    return url.startsWith('/') || url.startsWith('./');
  }
}

/**
 * Sanitizes an image URL by removing invalid characters and normalizing
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  // Return null for invalid values
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }

  return trimmed;
}

/**
 * Gets a fallback image URL
 * Uses local placeholder images instead of external service
 */
export function getFallbackImage(type: 'product' | 'blog' | 'banner' | 'default' = 'default'): string {
  // Use local placeholder images from assets
  const fallbackImages = {
    product: '/assets/images/icon/logo_tròn.png', // Use logo as product placeholder
    blog: '/assets/images/icon/logo_tròn.png', // Use logo as blog placeholder
    banner: '/assets/images/icon/logo_tròn.png', // Use logo as banner placeholder
    default: '/assets/images/icon/logo_tròn.png' // Use logo as default placeholder
  };

  return fallbackImages[type] || fallbackImages.default;
}

/**
 * Handles image load error and returns fallback
 */
export function handleImageError(
  event: Event, 
  fallbackType: 'product' | 'blog' | 'banner' | 'default' = 'default'
): void {
  const img = event.target as HTMLImageElement;
  
  // Prevent infinite loop
  if (img.src === getFallbackImage(fallbackType)) {
    return;
  }

  // Log error for debugging
  console.warn('⚠️ Image failed to load:', img.src);
  
  // Set fallback
  img.src = getFallbackImage(fallbackType);
  img.onerror = null; // Prevent further error handling
}

/**
 * Validates and returns a safe image URL
 * Automatically cleans CDN wrapper URLs
 */
export function getSafeImageUrl(
  url: string | null | undefined,
  fallbackType: 'product' | 'blog' | 'banner' | 'default' = 'default'
): string {
  const sanitized = sanitizeImageUrl(url);
  
  if (!sanitized || !isValidImageUrl(sanitized)) {
    return getFallbackImage(fallbackType);
  }

  // Clean CDN wrapper if present
  const cleaned = cleanImageUrl(sanitized);
  return cleaned || getFallbackImage(fallbackType);
}

