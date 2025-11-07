/**
 * Script to check image URLs in database
 * Helps identify broken or invalid image URLs
 */

const { MongoClient } = require('mongodb');
const config = require('../config/environment');

const MONGODB_URI = config.mongoUri;
const DB_NAME = config.dbName;

async function checkImageUrls() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Check products
    console.log('\n📦 Checking Products...');
    const products = await db.collection('products').find({}).limit(100).toArray();
    let productImageIssues = 0;
    
    products.forEach(product => {
      if (!product.image || product.image.trim() === '' || product.image === 'null') {
        productImageIssues++;
        console.log(`  ⚠️ Product ${product._id} (${product.name?.substring(0, 50)}) has invalid image:`, product.image);
      }
    });
    console.log(`  ✅ Checked ${products.length} products, found ${productImageIssues} with image issues`);
    
    // Check blogs
    console.log('\n📝 Checking Blogs...');
    const blogs = await db.collection('blogs').find({}).limit(100).toArray();
    let blogImageIssues = 0;
    
    blogs.forEach(blog => {
      const primaryImage = blog.primaryImage || (blog.primary_image && typeof blog.primary_image === 'object' ? blog.primary_image.url : blog.primary_image) || '';
      const imageStr = typeof primaryImage === 'string' ? primaryImage : '';
      if (!imageStr || imageStr.trim() === '' || imageStr === 'null') {
        blogImageIssues++;
        console.log(`  ⚠️ Blog ${blog._id} (${blog.title?.substring(0, 50)}) has invalid primaryImage`);
      }
    });
    console.log(`  ✅ Checked ${blogs.length} blogs, found ${blogImageIssues} with image issues`);
    
    // Check banners
    console.log('\n🎨 Checking Banners...');
    const banners = await db.collection('banners').find({}).toArray();
    let bannerImageIssues = 0;
    
    banners.forEach(banner => {
      const image = banner.image || '';
      const backgroundImage = banner.backgroundImage || banner.background_image || '';
      const slideImage = banner.slideImage || banner.slide_image || '';
      
      if ((!image || image.trim() === '' || image === 'null') && 
          (!backgroundImage || backgroundImage.trim() === '' || backgroundImage === 'null') &&
          (!slideImage || slideImage.trim() === '' || slideImage === 'null')) {
        bannerImageIssues++;
        console.log(`  ⚠️ Banner ${banner._id} (${banner.title || 'No title'}) has no valid images`);
      }
    });
    console.log(`  ✅ Checked ${banners.length} banners, found ${bannerImageIssues} with image issues`);
    
    // Check diseases
    console.log('\n🏥 Checking Diseases...');
    const diseases = await db.collection('benh').find({}).limit(100).toArray();
    let diseaseImageIssues = 0;
    
    diseases.forEach(disease => {
      const primaryImage = disease.primary_image?.url || '';
      if (!primaryImage || primaryImage.trim() === '' || primaryImage === 'null') {
        diseaseImageIssues++;
        console.log(`  ⚠️ Disease ${disease._id} (${disease.name?.substring(0, 50)}) has invalid primary_image`);
      }
    });
    console.log(`  ✅ Checked ${diseases.length} diseases, found ${diseaseImageIssues} with image issues`);
    
    console.log('\n✅ Image URL check completed!');
    
  } catch (error) {
    console.error('❌ Error checking image URLs:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

checkImageUrls();

