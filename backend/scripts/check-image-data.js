const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'MediCare_database';

async function checkImageData() {
  let client;
  try {
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Check products
    console.log('📦 Checking Products...');
    const products = await db.collection('products').find({}).limit(5).toArray();
    console.log(`Found ${products.length} sample products:\n`);
    
    products.forEach((product, index) => {
      console.log(`Product ${index + 1}:`);
      console.log(`  ID: ${product._id}`);
      console.log(`  Name: ${product.name?.substring(0, 50)}...`);
      console.log(`  image field: ${product.image || 'MISSING'}`);
      console.log(`  image type: ${typeof product.image}`);
      if (product.image) {
        console.log(`  image value: ${JSON.stringify(product.image).substring(0, 100)}`);
      }
      console.log(`  gallery field: ${product.gallery ? 'EXISTS' : 'MISSING'}`);
      console.log(`  gallery type: ${typeof product.gallery}`);
      if (product.gallery) {
        if (Array.isArray(product.gallery)) {
          console.log(`  gallery length: ${product.gallery.length}`);
          if (product.gallery.length > 0) {
            console.log(`  gallery[0]: ${JSON.stringify(product.gallery[0]).substring(0, 100)}`);
          }
        } else {
          console.log(`  gallery value: ${JSON.stringify(product.gallery).substring(0, 100)}`);
        }
      }
      console.log('');
    });

    // Check blogs
    console.log('📰 Checking Blogs...');
    const blogs = await db.collection('blogs').find({}).limit(5).toArray();
    console.log(`Found ${blogs.length} sample blogs:\n`);
    
    blogs.forEach((blog, index) => {
      console.log(`Blog ${index + 1}:`);
      console.log(`  ID: ${blog._id}`);
      console.log(`  Title: ${blog.title?.substring(0, 50)}...`);
      console.log(`  primaryImage field: ${blog.primaryImage ? 'EXISTS' : 'MISSING'}`);
      console.log(`  primaryImage type: ${typeof blog.primaryImage}`);
      if (blog.primaryImage) {
        if (typeof blog.primaryImage === 'string') {
          console.log(`  primaryImage value: ${blog.primaryImage.substring(0, 100)}`);
        } else if (typeof blog.primaryImage === 'object') {
          console.log(`  primaryImage object: ${JSON.stringify(blog.primaryImage).substring(0, 200)}`);
        }
      }
      console.log(`  primary_image field: ${blog.primary_image ? 'EXISTS' : 'MISSING'}`);
      console.log(`  primary_image type: ${typeof blog.primary_image}`);
      if (blog.primary_image) {
        if (typeof blog.primary_image === 'string') {
          console.log(`  primary_image value: ${blog.primary_image.substring(0, 100)}`);
        } else if (typeof blog.primary_image === 'object') {
          console.log(`  primary_image object: ${JSON.stringify(blog.primary_image).substring(0, 200)}`);
        }
      }
      if (blog.detailSeo?.openGraph?.image?.url) {
        console.log(`  detailSeo.openGraph.image.url: ${blog.detailSeo.openGraph.image.url.substring(0, 100)}`);
      }
      console.log('');
    });

    // Check banners
    console.log('🎨 Checking Banners...');
    const banners = await db.collection('banners').find({}).limit(3).toArray();
    console.log(`Found ${banners.length} sample banners:\n`);
    
    banners.forEach((banner, index) => {
      console.log(`Banner ${index + 1}:`);
      console.log(`  ID: ${banner._id}`);
      console.log(`  Name: ${banner.name || 'N/A'}`);
      console.log(`  image: ${banner.image || 'MISSING'}`);
      console.log(`  backgroundImage: ${banner.backgroundImage || 'MISSING'}`);
      console.log(`  slideImage: ${banner.slideImage || 'MISSING'}`);
      console.log('');
    });

    console.log('✅ Image data check completed!');
  } catch (error) {
    console.error('❌ Error checking image data:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

checkImageData();

