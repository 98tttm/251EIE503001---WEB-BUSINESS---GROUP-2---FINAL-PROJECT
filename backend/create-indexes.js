const { MongoClient } = require('mongodb');
require('dotenv').config();
const { createDatabaseIndexes } = require('./config/database-indexes');

(async () => {
  let client;
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db(process.env.DB_NAME);
    
    console.log('🔧 Creating database indexes...');
    await createDatabaseIndexes(db);
    
    console.log('✅ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
})();

