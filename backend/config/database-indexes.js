/**
 * Database indexes configuration
 * Run this once to create all necessary indexes for optimal performance
 */

async function createDatabaseIndexes(db) {
  console.log('🔧 Creating database indexes...');

  try {
    // ==================== PRODUCTS COLLECTION ====================
    const products = db.collection('products');
    
    // Try to create text index, but skip if it already exists
    try {
      await products.createIndex(
        { name: 'text', description: 'text', brand: 'text' },
        { 
          background: true,
          name: 'idx_product_text_search',
          weights: { name: 10, brand: 5, description: 1 }
        }
      );
      console.log('✅ Text search index created/verified');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('⚠️ Text search index already exists with different options, skipping...');
      } else {
        throw error;
      }
    }
    
    // Create indexes with error handling
    const productIndexes = [
      { key: { brand: 1, categorySlug: 1 }, options: { background: true, name: 'idx_brand_category' } },
      { key: { categoryId: 1 }, options: { background: true, name: 'idx_category_id' } },
      { key: { categoryId: 1, price: 1 }, options: { background: true, name: 'idx_category_id_price' } },
      { key: { price: 1 }, options: { background: true, name: 'idx_price' } },
      { key: { categorySlug: 1, price: 1 }, options: { background: true, name: 'idx_category_price' } },
      { key: { createdAt: -1 }, options: { background: true, name: 'idx_created_desc' } },
      { key: { discount: -1 }, options: { background: true, name: 'idx_discount' } }
    ];
    
    for (const index of productIndexes) {
      try {
        await products.createIndex(index.key, index.options);
        console.log(`✅ Created index: ${index.options.name}`);
      } catch (error) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          console.log(`⚠️ Index ${index.options.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating index ${index.options.name}:`, error.message);
        }
      }
    }

    console.log('✅ Products indexes created');

    // ==================== ORDERS COLLECTION ====================
    const orders = db.collection('orders');
    
    await orders.createIndex(
      { userId: 1, createdAt: -1 },
      { background: true, name: 'idx_user_orders' }
    );
    
    await orders.createIndex(
      { orderNumber: 1 },
      { background: true, name: 'idx_order_number', unique: true }
    );
    
    await orders.createIndex(
      { status: 1, createdAt: -1 },
      { background: true, name: 'idx_status_created' }
    );
    
    await orders.createIndex(
      { 'customerInfo.phone': 1 },
      { background: true, name: 'idx_customer_phone' }
    );
    
    await orders.createIndex(
      { paymentStatus: 1 },
      { background: true, name: 'idx_payment_status' }
    );
    
    await orders.createIndex(
      { confirmedAt: 1 },
      { background: true, name: 'idx_confirmed_at', sparse: true }
    );

    console.log('✅ Orders indexes created');

    // ==================== CARTS COLLECTION ====================
    const carts = db.collection('carts');
    
    await carts.createIndex(
      { userId: 1 },
      { background: true, name: 'idx_user_cart', unique: true }
    );
    
    await carts.createIndex(
      { updatedAt: -1 },
      { background: true, name: 'idx_updated_desc' }
    );

    console.log('✅ Carts indexes created');

    // ==================== USERS COLLECTION ====================
    const users = db.collection('users');
    
    await users.createIndex(
      { email: 1 },
      { background: true, name: 'idx_email', unique: true }
    );
    
    await users.createIndex(
      { phone: 1 },
      { background: true, name: 'idx_phone', sparse: true }
    );
    
    await users.createIndex(
      { roles: 1 },
      { background: true, name: 'idx_roles' }
    );

    console.log('✅ Users indexes created');

    // ==================== PHARMACIST CHATS COLLECTION ====================
    const chats = db.collection('pharmacist_chats');
    
    await chats.createIndex(
      { userId: 1, createdAt: -1 },
      { background: true, name: 'idx_user_chats' }
    );
    
    await chats.createIndex(
      { status: 1, updatedAt: -1 },
      { background: true, name: 'idx_status_updated' }
    );
    
    await chats.createIndex(
      { 'customerInfo.phone': 1 },
      { background: true, name: 'idx_chat_phone' }
    );

    console.log('✅ Pharmacist chats indexes created');

    // ==================== BLOGS COLLECTION ====================
    const blogs = db.collection('blogs');
    
    // Already created in server.js, just verify
    await blogs.createIndex(
      { isApproved: 1, publishedAt: -1 },
      { background: true, name: 'idx_approved_published' }
    );
    
    await blogs.createIndex(
      { slug: 1 },
      { background: true, name: 'idx_slug', unique: true }
    );
    
    await blogs.createIndex(
      { 'categories.fullPathSlug': 1 },
      { background: true, name: 'idx_categories_slug' }
    );

    console.log('✅ Blogs indexes created');

    // ==================== VOUCHERS COLLECTION ====================
    const vouchers = db.collection('vouchers');
    
    await vouchers.createIndex(
      { code: 1 },
      { background: true, name: 'idx_voucher_code', unique: true }
    );
    
    await vouchers.createIndex(
      { isActive: 1, expiresAt: 1 },
      { background: true, name: 'idx_active_expires' }
    );
    
    await vouchers.createIndex(
      { startsAt: 1, expiresAt: 1 },
      { background: true, name: 'idx_validity_period' }
    );

    console.log('✅ Vouchers indexes created');

    // ==================== CATEGORIES COLLECTION ====================
    const categories = db.collection('categories');
    
    await categories.createIndex(
      { slug: 1 },
      { background: true, name: 'idx_category_slug' }
    );
    
    await categories.createIndex(
      { parentId: 1 },
      { background: true, name: 'idx_parent' }
    );
    
    await categories.createIndex(
      { level: 1, displayOrder: 1 },
      { background: true, name: 'idx_level_order' }
    );

    console.log('✅ Categories indexes created');

    console.log('✅ All database indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

module.exports = { createDatabaseIndexes };

