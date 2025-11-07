/**
 * Script để hoàn thành một số đơn hàng mẫu
 * Cập nhật status = 'delivered' và paymentStatus = 'paid' để hiển thị doanh thu
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

async function completeSampleOrders() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const ordersCollection = db.collection('orders');

    // Lấy tất cả đơn hàng đang pending hoặc shipping
    const orders = await ordersCollection.find({
      status: { $in: ['pending', 'shipping'] }
    }).limit(10).toArray();

    console.log(`\n📦 Found ${orders.length} orders to complete\n`);

    if (orders.length === 0) {
      console.log('⚠️  No orders found. Please create some orders first.');
      return;
    }

    // Cập nhật từng đơn với thời gian deliveredAt khác nhau trong 30 ngày qua
    const now = new Date();
    const updates = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Phân bổ đều đơn hàng trong 30 ngày qua
      const daysAgo = Math.floor((i / orders.length) * 30);
      const deliveredDate = new Date(now);
      deliveredDate.setDate(deliveredDate.getDate() - daysAgo);

      const statusHistoryEntry = {
        status: 'delivered',
        note: 'Đơn hàng đã được giao thành công (Cập nhật bằng script)',
        timestamp: deliveredDate
      };

      const updateResult = await ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'delivered',
            paymentStatus: 'paid',
            deliveredAt: deliveredDate,
            updatedAt: deliveredDate
          },
          $push: {
            statusHistory: statusHistoryEntry
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        updates.push({
          orderNumber: order.orderNumber,
          total: order.pricing?.total || 0,
          deliveredAt: deliveredDate.toISOString()
        });
        
        console.log(`✅ Order ${order.orderNumber || order._id} - ${(order.pricing?.total || 0).toLocaleString('vi-VN')} đ - Delivered: ${deliveredDate.toLocaleDateString('vi-VN')}`);
      }
    }

    console.log(`\n🎉 Successfully completed ${updates.length} orders!`);
    console.log(`\n📊 Total revenue: ${updates.reduce((sum, o) => sum + o.total, 0).toLocaleString('vi-VN')} đ\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
completeSampleOrders();

