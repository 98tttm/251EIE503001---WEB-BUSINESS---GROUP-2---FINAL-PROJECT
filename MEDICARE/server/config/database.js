const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ✅ Trỏ đúng về database bạn có trong Compass
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MediCare_database';

    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.name} (${conn.connection.host})`);
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
