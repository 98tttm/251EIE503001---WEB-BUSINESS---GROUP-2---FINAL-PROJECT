/**
 * Script kiểm tra số lượng đơn hàng thực tế trong MongoDB
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

async function checkOrderCount() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const ordersCollection = db.collection('orders');

    // Đếm tổng số đơn hàng
    const totalOrders = await ordersCollection.countDocuments();
    console.log(`📦 Tổng số đơn hàng: ${totalOrders}`);

    // Đếm theo từng trạng thái
    const ordersByStatus = await ordersCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📊 Phân bổ theo trạng thái:');
    ordersByStatus.forEach(item => {
      console.log(`  - ${item._id || 'Unknown'}: ${item.count}`);
    });

    // Lấy 5 đơn hàng mới nhất để kiểm tra
    const recentOrders = await ordersCollection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ orderNumber: 1, status: 1, createdAt: 1, 'pricing.total': 1 })
      .toArray();

    console.log('\n📋 5 đơn hàng mới nhất:');
    recentOrders.forEach(order => {
      console.log(`  - ${order.orderNumber || order._id} | ${order.status} | ${order.pricing?.total || 0} đ | ${new Date(order.createdAt).toLocaleDateString('vi-VN')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
checkOrderCount();

