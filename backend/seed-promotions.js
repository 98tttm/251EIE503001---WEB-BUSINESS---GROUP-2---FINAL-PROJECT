// Script to seed sample promotion/voucher codes into MongoDB
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'MediCare_database';

const samplePromotions = [
  {
    code: 'WELCOME10',
    title: 'Chào mừng khách hàng mới',
    description: 'Giảm 10% cho đơn hàng đầu tiên',
    discountPercent: 10,
    discount: null, // null for percentage-based, amount for fixed discount
    minOrderAmount: 0,
    maxUsage: 1000,
    usedCount: 0,
    isActive: true,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'SAVE20',
    title: 'Tiết kiệm lớn',
    description: 'Giảm 20% cho đơn hàng từ 500.000đ',
    discountPercent: 20,
    discount: null,
    minOrderAmount: 500000,
    maxUsage: 500,
    usedCount: 0,
    isActive: true,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'SUMMER25',
    title: 'Khuyến mãi mùa hè',
    description: 'Giảm 25% cho đơn hàng từ 1.000.000đ',
    discountPercent: 25,
    discount: null,
    minOrderAmount: 1000000,
    maxUsage: 200,
    usedCount: 0,
    isActive: true,
    startsAt: new Date('2024-06-01'),
    expiresAt: new Date('2024-08-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'VIP30',
    title: 'Ưu đãi VIP',
    description: 'Giảm 30% cho khách hàng VIP',
    discountPercent: 30,
    discount: null,
    minOrderAmount: 2000000,
    maxUsage: 100,
    usedCount: 0,
    isActive: true,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'FLASH15',
    title: 'Flash Sale',
    description: 'Giảm 15% nhanh chóng',
    discountPercent: 15,
    discount: null,
    minOrderAmount: 300000,
    maxUsage: 1000,
    usedCount: 0,
    isActive: true,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedPromotions() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection('promotions');

    // Check if promotions already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing promotions. Skipping seed.`);
      console.log('💡 To reseed, delete existing promotions first or modify this script.');
      return;
    }

    // Insert sample promotions
    const result = await collection.insertMany(samplePromotions);
    console.log(`✅ Successfully inserted ${result.insertedCount} promotion codes:`);
    
    samplePromotions.forEach(promo => {
      console.log(`   - ${promo.code}: ${promo.discountPercent}% off (min: ${promo.minOrderAmount.toLocaleString('vi-VN')}đ)`);
    });

    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding promotions:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedPromotions();

