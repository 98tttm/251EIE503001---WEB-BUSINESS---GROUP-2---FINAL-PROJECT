const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

// Import models
const Product = require('../models/Product');
const Category = require('../models/Category');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Import categories
const importCategories = async () => {
  try {
    console.log('📂 Importing categories...');
    
    const categoriesPath = path.join(__dirname, '../../data/longchau_categories.json');
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    
    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');
    
    // Insert new categories
    await Category.insertMany(categoriesData);
    console.log(`✅ Imported ${categoriesData.length} categories`);
    
  } catch (error) {
    console.error('❌ Error importing categories:', error);
  }
};

// Import products
const importProducts = async () => {
  try {
    console.log('📦 Importing products...');
    
    // Try to use normalized data first, fallback to original
    const normalizedPath = path.join(__dirname, '../../data/longchau_products_normalized.json');
    const originalPath = path.join(__dirname, '../../data/longchau_products.json');
    
    let productsPath;
    if (fs.existsSync(normalizedPath)) {
      productsPath = normalizedPath;
      console.log('✅ Using normalized data file');
    } else {
      productsPath = originalPath;
      console.log('⚠️  Using original data file (consider running normalization first)');
    }
    
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');
    
    // Process products in batches
    const batchSize = 1000;
    const totalProducts = productsData.length;
    
    for (let i = 0; i < totalProducts; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize);
      
      // If using original data, add additional fields
      if (productsPath === originalPath) {
        const processedBatch = batch.map(product => ({
          ...product,
          // Fix date format
          createDate: new Date(product.createDate || Date.now()),
          expiredDate: new Date(product.expiredDate || Date.now() + 365 * 24 * 60 * 60 * 1000),
          // Fix prescription required
          prescriptionRequired: product.prescriptionRequired === 'Có' || product.prescriptionRequired === true,
          // Add e-commerce fields
          isActive: true,
          isFeatured: Math.random() < 0.1,
          tags: generateTags(product),
          specifications: {
            weight: product.unit || 'N/A',
            origin: product.country || 'N/A',
            manufacturer: product.brand || 'N/A'
          },
          ratings: {
            average: Math.random() * 2 + 3,
            count: Math.floor(Math.random() * 50) + 1
          },
          reviews: []
        }));
        
        await Product.insertMany(processedBatch);
      } else {
        // Use normalized data as-is
        await Product.insertMany(batch);
      }
      
      console.log(`📦 Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalProducts / batchSize)}`);
    }
    
    console.log(`✅ Imported ${totalProducts} products`);
    
  } catch (error) {
    console.error('❌ Error importing products:', error);
  }
};

// Generate tags based on product data
const generateTags = (product) => {
  const tags = [];
  
  if (product.brand) {
    tags.push(product.brand.toLowerCase());
  }
  
  if (product.country) {
    tags.push(product.country.toLowerCase());
  }
  
  if (product.prescriptionRequired === 'Không') {
    tags.push('otc'); // Over the counter
  } else {
    tags.push('prescription');
  }
  
  // Add category-based tags
  if (product.categoryId) {
    tags.push('category-' + product.categoryId);
  }
  
  return [...new Set(tags)]; // Remove duplicates
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    console.log('🔍 Creating indexes...');
    
    // Product indexes
    await Product.collection.createIndex({ name: 'text', description: 'text', brand: 'text' });
    await Product.collection.createIndex({ categoryId: 1 });
    await Product.collection.createIndex({ price: 1 });
    await Product.collection.createIndex({ isActive: 1 });
    await Product.collection.createIndex({ isFeatured: 1 });
    await Product.collection.createIndex({ 'ratings.average': -1 });
    
    // Category indexes
    await Category.collection.createIndex({ slug: 1 });
    await Category.collection.createIndex({ parentId: 1 });
    await Category.collection.createIndex({ isActive: 1 });
    
    console.log('✅ Indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Main import function
const importData = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting data import...');
    
    await importCategories();
    await importProducts();
    await createIndexes();
    
    console.log('🎉 Data import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
    process.exit(0);
  }
};

// Run import if this file is executed directly
if (require.main === module) {
  importData();
}

module.exports = { importData, importCategories, importProducts };
