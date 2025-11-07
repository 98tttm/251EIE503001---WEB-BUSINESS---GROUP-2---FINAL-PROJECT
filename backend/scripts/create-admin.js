const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'MediCare_database';

const ADMIN_EMAIL = 'thinh@medicare.vn';
const ADMIN_PASSWORD = '1234567890';

async function ensureAdminAccount() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const users = db.collection('users');

    const existingUser = await users.findOne({ mail: ADMIN_EMAIL });

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (existingUser) {
      await users.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            password: passwordHash,
            roles: ['admin'],
            status: 'active',
            profile: {
              ...(existingUser.profile || {}),
              name: existingUser.profile?.name || 'Admin MediCare',
            },
            updatedAt: new Date(),
          },
        }
      );

      console.log('🔁 Updated existing admin account');
    } else {
      await users.insertOne({
        mail: ADMIN_EMAIL,
        password: passwordHash,
        phone: '0900000000',
        roles: ['admin'],
        status: 'active',
        profile: {
          name: 'Admin MediCare',
          gender: 'Nam',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Created new admin account');
    }

    console.log('\nĐăng nhập admin:');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to ensure admin account:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('🔒 MongoDB connection closed');
  }
}

ensureAdminAccount();

