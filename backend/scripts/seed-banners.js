const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'MediCare_database';

// Banner data from homepage
const banners = [
  // Hero Banners (4 banners)
  {
    name: 'Hero Banner 1 - Xinh khỏe',
    type: 'hero',
    position: 'homepage',
    backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner3.webp',
    slideImage: '/assets/images/theme_banner/HeroBanner3.webp',
    title: 'xinh khỏe',
    subtitle: 'Đẹp từ trong ra ngoài',
    badge1: { text: 'DƯỢC MỸ PHẨM', discount: 'Giảm đến 30%' },
    badge2: { text: 'HÀNG ÂU - MỸ - NHẬT', discount: 'Giảm đến 30%' },
    buttonText: 'MUA NGAY',
    dateRange: '16.10 - 26.10.2025',
    order: 1,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Hero Banner 2',
    type: 'hero',
    position: 'homepage',
    backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner1.webp',
    slideImage: '/assets/images/theme_banner/HeroBanner1.webp',
    title: 'Promotion 2',
    subtitle: 'Subtitle 2',
    badge1: { text: 'Badge 1', discount: '30%' },
    badge2: { text: 'Badge 2', discount: '30%' },
    buttonText: 'MUA NGAY',
    dateRange: '',
    order: 2,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Hero Banner 3',
    type: 'hero',
    position: 'homepage',
    backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner2.webp',
    slideImage: '/assets/images/theme_banner/HeroBanner2.webp',
    title: 'Promotion 3',
    subtitle: 'Subtitle 3',
    badge1: { text: 'ƯU ĐÃI', discount: '20%' },
    badge2: { text: 'HOT', discount: 'MỚI' },
    buttonText: 'MUA NGAY',
    dateRange: '',
    order: 3,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Hero Banner 4',
    type: 'hero',
    position: 'homepage',
    backgroundImage: '/assets/images/theme_banner/theme_herobanner5.webp',
    slideImage: '/assets/images/theme_banner/Herobanner5.webp',
    title: 'Promotion 4',
    subtitle: 'Subtitle 4',
    badge1: { text: 'KHUYẾN MÃI', discount: '25%' },
    badge2: { text: 'HOT', discount: 'MỚI' },
    buttonText: 'MUA NGAY',
    dateRange: '',
    order: 4,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Feature Banners (4 banners with product mapping)
  {
    name: 'Feature Banner 1',
    type: 'feature',
    position: 'homepage',
    image: '/assets/images/theme_banner/feature_banner1.webp',
    productId: '68f1de3a44d747b5d5d888cb',
    link: '/product/68f1de3a44d747b5d5d888cb',
    order: 1,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Feature Banner 2',
    type: 'feature',
    position: 'homepage',
    image: '/assets/images/theme_banner/feature_banner2.webp',
    productId: '68f1de3b44d747b5d5d89728',
    link: '/product/68f1de3b44d747b5d5d89728',
    order: 2,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Feature Banner 3',
    type: 'feature',
    position: 'homepage',
    image: '/assets/images/theme_banner/feature_banner3.webp',
    productId: '68f1de3a44d747b5d5d8877b',
    link: '/product/68f1de3a44d747b5d5d8877b',
    order: 3,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Feature Banner 4',
    type: 'feature',
    position: 'homepage',
    image: '/assets/images/theme_banner/feature_banner4.webp',
    productId: '68f1de3b44d747b5d5d898f3',
    link: '/product/68f1de3b44d747b5d5d898f3',
    order: 4,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Sub Banners (2 banners)
  {
    name: 'Sub Banner 1 - Hỗ trợ, long đờm',
    type: 'sub',
    position: 'homepage',
    image: '/assets/images/Dephiendai/Storytelling.webp',
    title: 'Hỗ trợ, long đờm, giảm đau rát họng',
    discount: '',
    buttonText: 'MUA NGAY',
    order: 1,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Sub Banner 2 - Flash Sale',
    type: 'sub',
    position: 'homepage',
    image: '/assets/images/Dephiendai/Slide2.webp',
    title: 'Flash Sale',
    discount: '20%',
    buttonText: 'XEM NGAY',
    order: 2,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Marketing Banners (3 banners)
  {
    name: 'Marketing Banner 1',
    type: 'marketing',
    position: 'homepage',
    image: '/assets/images/theme_banner/Theme_HeroBanner1.webp',
    link: '/products',
    order: 1,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Marketing Banner 2',
    type: 'marketing',
    position: 'homepage',
    image: '/assets/images/theme_banner/Theme_HeroBanner2.webp',
    link: '/products',
    order: 2,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Marketing Banner 3',
    type: 'marketing',
    position: 'homepage',
    image: '/assets/images/theme_banner/Theme_HeroBanner3.webp',
    link: '/products',
    order: 3,
    status: 'active',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedBanners() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${DB_NAME}\n`);

    const db = client.db(DB_NAME);
    const bannersCollection = db.collection('banners');

    // Check if banners already exist
    const existingCount = await bannersCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing banners in database`);
      console.log('🔄 Clearing existing banners...');
      await bannersCollection.deleteMany({});
      console.log('✅ Cleared existing banners\n');
    }

    // Insert banners
    console.log('📦 Inserting banners...\n');
    let inserted = 0;
    let errors = 0;

    for (const banner of banners) {
      try {
        const result = await bannersCollection.insertOne(banner);
        inserted++;
        console.log(`✅ [${inserted}] ${banner.name} (${banner.type})`);
      } catch (error) {
        errors++;
        console.error(`❌ Error inserting ${banner.name}:`, error.message);
      }
    }

    console.log(`\n✨ Seed completed!`);
    console.log(`   - Inserted: ${inserted}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total: ${banners.length} banners\n`);

    // Show summary by type
    const summary = await bannersCollection.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();

    console.log('📊 Summary by type:');
    summary.forEach(item => {
      console.log(`   - ${item._id}: ${item.count} banners`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run
if (require.main === module) {
  seedBanners()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedBanners };

