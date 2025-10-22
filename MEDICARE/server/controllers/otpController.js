const nodemailer = require('nodemailer');
const User = require('../models/User');
const crypto = require('crypto');

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = crypto.randomInt(100000, 999999).toString();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });

  await transporter.sendMail({
    from: 'MediCare <no-reply@medicare.vn>',
    to: email,
    subject: 'Xác thực đăng nhập MediCare',
    text: `Mã OTP của bạn là: ${otp}`
  });

  await User.findOneAndUpdate(
    { mail: email },
    { otp, otpExpires: new Date(Date.now() + 5 * 60 * 1000) } // 5 phút
  );

  res.json({ message: 'OTP sent to email' });
};
