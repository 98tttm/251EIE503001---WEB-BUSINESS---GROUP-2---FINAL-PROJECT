const fs = require('fs');
const path = require('path');

// Function to normalize date format
function normalizeDate(dateString) {
  if (!dateString) return new Date();
  
  try {
    // Handle the problematic date format
    if (dateString.includes('+00:00')) {
      // Remove the problematic timezone format
      const cleanDate = dateString.replace('+00:00', 'Z');
      return new Date(cleanDate);
    }
    
    // Try to parse as ISO date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date(); // Return current date if invalid
    }
    return date;
  } catch (error) {
    console.warn(`Invalid date format: ${dateString}, using current date`);
    return new Date();
  }
}

// Function to normalize prescription required field
function normalizePrescriptionRequired(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    return lowerValue === 'có' || lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1';
  }
  return false;
}

// Function to normalize price fields
function normalizePrice(price) {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const numPrice = parseFloat(price.replace(/[^\d.-]/g, ''));
    return isNaN(numPrice) ? 0 : numPrice;
  }
  return 0;
}

// Function to normalize stock
function normalizeStock(stock) {
  if (typeof stock === 'number') return Math.max(0, stock);
  if (typeof stock === 'string') {
    const numStock = parseInt(stock.replace(/[^\d]/g, ''));
    return isNaN(numStock) ? 0 : Math.max(0, numStock);
  }
  return 0;
}

// Function to clean and validate strings
function cleanString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
}

// Function to validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Function to normalize image URLs
function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  // Clean the URL
  const cleanUrl = url.trim();
  
  // If it's a valid URL, return it
  if (isValidUrl(cleanUrl)) {
    return cleanUrl;
  }
  
  // If it's a relative path, make it absolute
  if (cleanUrl.startsWith('/')) {
    return `https://cdn.nhathuoclongchau.com.vn${cleanUrl}`;
  }
  
  return '';
}

// Function to normalize gallery array
function normalizeGallery(gallery) {
  if (!Array.isArray(gallery)) return [];
  
  return gallery
    .map(url => normalizeImageUrl(url))
    .filter(url => url !== '');
}

// Function to normalize product data
function normalizeProduct(product) {
  return {
    _id: cleanString(product._id),
    name: cleanString(product.name),
    brand: cleanString(product.brand),
    country: cleanString(product.country),
    description: cleanString(product.description),
    price: normalizePrice(product.price),
    discount: normalizePrice(product.discount),
    stock: normalizeStock(product.stock),
    unit: cleanString(product.unit),
    image: normalizeImageUrl(product.image),
    gallery: normalizeGallery(product.gallery),
    usage: cleanString(product.usage),
    ingredients: cleanString(product.ingredients),
    warnings: cleanString(product.warnings),
    prescriptionRequired: normalizePrescriptionRequired(product.prescriptionRequired),
    createDate: normalizeDate(product.createDate),
    expiredDate: normalizeDate(product.expiredDate),
    categoryId: cleanString(product.categoryId),
    activeIngredientIds: Array.isArray(product.activeIngredientIds) 
      ? product.activeIngredientIds.map(id => cleanString(id)).filter(id => id !== '')
      : [],
    herbIds: Array.isArray(product.herbIds) 
      ? product.herbIds.map(id => cleanString(id)).filter(id => id !== '')
      : [],
    // Add additional fields for e-commerce
    isActive: true,
    isFeatured: Math.random() < 0.1, // 10% chance to be featured
    tags: generateTags(product),
    specifications: {
      weight: product.unit || 'N/A',
      origin: product.country || 'N/A',
      manufacturer: product.brand || 'N/A'
    },
    ratings: {
      average: Math.random() * 2 + 3, // Random rating between 3-5
      count: Math.floor(Math.random() * 50) + 1 // Random review count 1-50
    },
    reviews: []
  };
}

// Function to generate tags based on product data
function generateTags(product) {
  const tags = [];
  
  if (product.brand) {
    tags.push(product.brand.toLowerCase().replace(/\s+/g, '-'));
  }
  
  if (product.country) {
    tags.push(product.country.toLowerCase().replace(/\s+/g, '-'));
  }
  
  if (product.prescriptionRequired === 'Không' || product.prescriptionRequired === false) {
    tags.push('otc'); // Over the counter
  } else {
    tags.push('prescription');
  }
  
  // Add category-based tags
  if (product.categoryId) {
    tags.push('category-' + product.categoryId);
  }
  
  // Add unit-based tags
  if (product.unit) {
    tags.push('unit-' + product.unit.toLowerCase().replace(/\s+/g, '-'));
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

// Main function to normalize data
async function normalizeData() {
  try {
    console.log('🔄 Starting data normalization...');
    
    const inputPath = path.join(__dirname, '../../data/longchau_products.json');
    const outputPath = path.join(__dirname, '../../data/longchau_products_normalized.json');
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    
    console.log('📖 Reading input file...');
    const rawData = fs.readFileSync(inputPath, 'utf8');
    
    console.log('🔍 Parsing JSON data...');
    const products = JSON.parse(rawData);
    
    if (!Array.isArray(products)) {
      throw new Error('Invalid JSON format: Expected array of products');
    }
    
    console.log(`📦 Processing ${products.length} products...`);
    
    const normalizedProducts = [];
    const errors = [];
    
    for (let i = 0; i < products.length; i++) {
      try {
        const product = products[i];
        
        // Validate required fields
        if (!product._id || !product.name) {
          errors.push(`Product at index ${i}: Missing required fields (_id or name)`);
          continue;
        }
        
        const normalizedProduct = normalizeProduct(product);
        normalizedProducts.push(normalizedProduct);
        
        // Progress indicator
        if ((i + 1) % 10000 === 0) {
          console.log(`✅ Processed ${i + 1}/${products.length} products`);
        }
        
      } catch (error) {
        errors.push(`Product at index ${i}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully normalized ${normalizedProducts.length} products`);
    
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors encountered:`);
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }
    
    console.log('💾 Writing normalized data to file...');
    fs.writeFileSync(outputPath, JSON.stringify(normalizedProducts, null, 2));
    
    console.log('🎉 Data normalization completed successfully!');
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`📊 Total products: ${normalizedProducts.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    // Generate summary report
    const summary = {
      totalProducts: normalizedProducts.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 50), // First 50 errors
      timestamp: new Date().toISOString(),
      features: {
        hasImages: normalizedProducts.filter(p => p.image).length,
        hasGallery: normalizedProducts.filter(p => p.gallery.length > 0).length,
        prescriptionRequired: normalizedProducts.filter(p => p.prescriptionRequired).length,
        featured: normalizedProducts.filter(p => p.isFeatured).length
      }
    };
    
    const summaryPath = path.join(__dirname, '../../data/normalization_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📋 Summary report: ${summaryPath}`);
    
  } catch (error) {
    console.error('❌ Error during normalization:', error);
    process.exit(1);
  }
}

// Run normalization if this file is executed directly
if (require.main === module) {
  normalizeData();
}

module.exports = { normalizeData, normalizeProduct };

