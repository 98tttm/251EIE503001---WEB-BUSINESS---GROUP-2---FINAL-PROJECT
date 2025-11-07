/**
 * Script khởi tạo database MediCare_database
 * Tạo database và các collection cơ bản nếu chưa tồn tại
 */

const { MongoClient } = require('mongodb');
const config = require('../config/environment');

const MONGODB_URI = config.mongoUri;
const DB_NAME = config.dbName;

async function initDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    console.log(`📊 Initializing database: ${DB_NAME}`);

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`\n📁 Existing collections: ${collectionNames.length > 0 ? collectionNames.join(', ') : 'None'}`);

    // Create collections by inserting a dummy document (MongoDB creates collection on first insert)
    const collectionsToCreate = [
      'products',
      'categories',
      'users',
      'orders',
      'vouchers',
      'blogs',
      'benh', // diseases
      'banners',
      'carts',
      'notifications',
      'comments',
      'ratings',
      'tuvanthuoc' // medicine requests
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const collectionName of collectionsToCreate) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count === 0 && !collectionNames.includes(collectionName)) {
          // Create collection by inserting and immediately deleting a dummy document
          await collection.insertOne({ _temp: true, createdAt: new Date() });
          await collection.deleteOne({ _temp: true });
          console.log(`✅ Created collection: ${collectionName}`);
          createdCount++;
        } else {
          console.log(`ℹ️  Collection already exists: ${collectionName} (${count} documents)`);
          existingCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating collection ${collectionName}:`, error.message);
      }
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');
    try {
      const { createDatabaseIndexes } = require('../config/database-indexes');
      await createDatabaseIndexes(db);
      console.log('✅ Indexes created successfully');
    } catch (error) {
      console.warn('⚠️  Warning creating indexes:', error.message);
    }

    // Count all documents
    console.log('\n📈 Database Statistics:');
    for (const collectionName of collectionsToCreate) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        if (count > 0) {
          console.log(`  ${collectionName}: ${count} documents`);
        }
      } catch (error) {
        // Collection might not exist, skip
      }
    }

    console.log(`\n✅ Database initialization complete!`);
    console.log(`   Created: ${createdCount} collections`);
    console.log(`   Existing: ${existingCount} collections`);
    console.log(`\n💡 Database "${DB_NAME}" is now ready to use.`);
    console.log(`   You can view it in MongoDB Compass at: ${MONGODB_URI}/${DB_NAME}`);

  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run initialization
initDatabase();



