const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'MediCare_database';

// Import normalize functions from server.js (simplified versions)
function normalizeDiseasePrimaryImage(primaryImage) {
  if (!primaryImage) {
    return null;
  }
  
  let url = null;
  let alternativeText = null;
  
  // If it's already a string URL, convert to object
  if (typeof primaryImage === 'string') {
    const trimmed = primaryImage.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    url = trimmed;
  }
  // If it's an object with url property
  else if (primaryImage && typeof primaryImage === 'object' && primaryImage.url) {
    const urlValue = primaryImage.url;
    if (typeof urlValue === 'string') {
      const trimmed = urlValue.trim();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return null;
      }
      url = trimmed;
      alternativeText = primaryImage.alternativeText || null;
    } else {
      return null;
    }
  } else {
    return null;
  }
  
  // Always return object format for consistency
  return {
    url: url,
    alternativeText: alternativeText
  };
}

function normalizeDisease(disease) {
  if (!disease) {
    return null;
  }
  
  // Normalize primary_image
  if (disease.primary_image !== undefined) {
    disease.primary_image = normalizeDiseasePrimaryImage(disease.primary_image);
  }
  
  return disease;
}

async function testImageAPI() {
  let client;
  try {
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Test diseases
    console.log('📦 Testing Diseases...');
    const diseases = await db.collection('benh').find({}).limit(5).toArray();
    console.log(`Found ${diseases.length} sample diseases:\n`);
    
    diseases.forEach((disease, index) => {
      console.log(`Disease ${index + 1}:`);
      console.log(`  Name: ${disease.name?.substring(0, 50)}...`);
      console.log(`  Raw primary_image:`, JSON.stringify(disease.primary_image).substring(0, 150));
      console.log(`  Raw type: ${typeof disease.primary_image}`);
      
      const normalized = normalizeDisease({ ...disease });
      console.log(`  Normalized primary_image:`, JSON.stringify(normalized.primary_image).substring(0, 150));
      console.log(`  Has valid image: ${!!normalized.primary_image?.url}`);
      console.log('');
    });

    // Test blogs
    console.log('📰 Testing Blogs...');
    const blogs = await db.collection('blogs').find({}).limit(3).toArray();
    console.log(`Found ${blogs.length} sample blogs:\n`);
    
    blogs.forEach((blog, index) => {
      console.log(`Blog ${index + 1}:`);
      console.log(`  Title: ${blog.title?.substring(0, 50)}...`);
      console.log(`  Raw primaryImage:`, JSON.stringify(blog.primaryImage).substring(0, 200));
      console.log(`  Raw type: ${typeof blog.primaryImage}`);
      
      // Simulate resolveArticleImage
      let resolvedImage = null;
      if (blog.primaryImage && typeof blog.primaryImage === 'string' && blog.primaryImage.trim() !== '' && blog.primaryImage !== 'null') {
        resolvedImage = blog.primaryImage;
      } else if (blog.primaryImage?.url && typeof blog.primaryImage.url === 'string' && blog.primaryImage.url.trim() !== '' && blog.primaryImage.url !== 'null') {
        resolvedImage = blog.primaryImage.url;
      }
      
      console.log(`  Resolved primaryImage: ${resolvedImage || 'null'}`);
      console.log(`  Has valid image: ${!!resolvedImage}`);
      console.log('');
    });

    console.log('✅ Image API test completed!');
  } catch (error) {
    console.error('❌ Error testing image API:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

testImageAPI();

