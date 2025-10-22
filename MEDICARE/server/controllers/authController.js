// ===============================
// 🧠 AUTH CONTROLLER – MediCare
// ===============================
const bcrypt = require("bcrypt");
const User = require("../models/user");

// ===============================
// Đăng ký người dùng mới
// ===============================
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Kiểm tra đầu vào
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
    }

    // Kiểm tra trùng email hoặc phone
    const existingUser = await User.findOne({ $or: [{ phone }, { "mail": email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email hoặc số điện thoại đã tồn tại!" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = new User({
      phone,
      mail: [email],
      profile: { fullName: `${firstName} ${lastName}` },
      otp: null,
      otpExpires: null,
    });

    // Thêm mật khẩu như 1 trường tạm (tùy mô hình)
    newUser.password = hashedPassword;

    // Lưu vào database
    await newUser.save();

    res.status(201).json({
      message: "Đăng ký thành công!",
      user: {
        id: newUser._id,
        fullName: newUser.profile.fullName,
        email,
        phone
      }
    });
  } catch (error) {
    console.error("❌ Lỗi đăng ký:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi đăng ký." });
  }
};

// ===============================
// Đăng nhập người dùng
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user theo email
    const user = await User.findOne({ mail: email });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu!" });

    res.status(200).json({
      message: "Đăng nhập thành công!",
      user: {
        id: user._id,
        fullName: user.profile.fullName,
        email: user.mail[0],
        phone: user.phone,
      }
    });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi đăng nhập." });
  }
};

// ===============================
// Thông tin người dùng hiện tại
// ===============================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
};
