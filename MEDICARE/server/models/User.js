const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: String,
  fullName: String,
  phone: String,
  line1: String,
  ward: String,
  district: String,
  province: String,
  isDefault: Boolean
});

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  mail: [String],
  password: { type: String, required: true },  // ✅ thêm dòng này
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  profile: {
    fullName: String,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dob: Date
  },
  addresses: [addressSchema],
  roles: { type: [String], default: ['customer'] },
  otp: { type: String },
  otpExpires: { type: Date }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
