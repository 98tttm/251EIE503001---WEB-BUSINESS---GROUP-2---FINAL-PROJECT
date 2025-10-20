# MediCare - Nhà Thuốc Online

Website thương mại điện tử chuyên về bán thuốc và sản phẩm y tế, được xây dựng với Node.js, MongoDB và vanilla JavaScript.

## 🚀 Tính năng chính

### Frontend
- ✅ Giao diện responsive, hiện đại
- ✅ Tìm kiếm sản phẩm thông minh
- ✅ Giỏ hàng và quản lý đơn hàng
- ✅ Hệ thống đăng ký/đăng nhập
- ✅ Chatbot hỗ trợ khách hàng
- ✅ Slider và animation mượt mà

### Backend
- ✅ RESTful API với Node.js & Express
- ✅ Database MongoDB với Mongoose
- ✅ Authentication & Authorization
- ✅ JWT Token Security
- ✅ Input Validation & Error Handling
- ✅ Rate Limiting & Security Headers

### E-commerce Features
- ✅ Quản lý sản phẩm (266,240+ sản phẩm)
- ✅ Phân loại sản phẩm (1,676+ categories)
- ✅ Giỏ hàng persistent
- ✅ Hệ thống đánh giá sản phẩm
- ✅ Tìm kiếm và lọc nâng cao

## 🛠️ Công nghệ sử dụng

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling với CSS Grid & Flexbox
- **Vanilla JavaScript** - ES6+ modules
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Development Tools
- **Nodemon** - Development server
- **Morgan** - HTTP request logger
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## 📦 Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- MongoDB >= 4.4.0
- npm hoặc yarn

### 1. Clone repository
```bash
git clone <repository-url>
cd MEDICARE
```

### 2. Cài đặt dependencies
```bash
# Backend dependencies
cd server
npm install

# Hoặc sử dụng yarn
yarn install
```

### 3. Cấu hình môi trường
Tạo file `.env` trong thư mục `server/`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/medicare

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Khởi động MongoDB
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 5. Import dữ liệu
```bash
cd server
node scripts/importData.js
```

### 6. Khởi động server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 7. Truy cập website
- **Frontend**: Mở file `src/html/index.html` trong browser
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 📁 Cấu trúc thư mục

```
MEDICARE/
├── server/                 # Backend Node.js
│   ├── config/            # Database & environment config
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Custom middlewares
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── scripts/          # Utility scripts
│   ├── app.js            # Main application file
│   └── package.json      # Dependencies
├── src/                  # Frontend
│   ├── components/       # Reusable components
│   ├── css/             # Stylesheets
│   ├── html/            # HTML pages
│   ├── js/              # JavaScript modules
│   └── assets/          # Images, fonts, icons
├── data/                # JSON data files
└── docs/               # Documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user
- `PUT /api/auth/profile` - Cập nhật profile
- `POST /api/auth/logout` - Đăng xuất

### Products
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `GET /api/products/featured` - Sản phẩm nổi bật
- `GET /api/products/category/:id` - Sản phẩm theo danh mục
- `POST /api/products/:id/reviews` - Thêm đánh giá

### Categories
- `GET /api/categories` - Lấy danh sách danh mục
- `GET /api/categories/tree` - Cây danh mục
- `GET /api/categories/:id` - Chi tiết danh mục

### Cart
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart/add` - Thêm vào giỏ hàng
- `PUT /api/cart/update` - Cập nhật giỏ hàng
- `DELETE /api/cart/remove` - Xóa khỏi giỏ hàng

## 🎯 Roadmap

### Phase 1: Backend Foundation ✅
- [x] Database setup & models
- [x] Authentication system
- [x] Basic CRUD operations
- [x] API endpoints

### Phase 2: Frontend Integration ✅
- [x] API integration
- [x] State management
- [x] Component refactoring
- [x] User authentication UI

### Phase 3: E-commerce Features 🚧
- [ ] Shopping cart
- [ ] Checkout process
- [ ] Payment integration
- [ ] Order management

### Phase 4: Advanced Features 📋
- [ ] Prescription system
- [ ] Pharmacist consultation
- [ ] Admin panel
- [ ] Analytics

### Phase 5: Optimization 📋
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Testing & bug fixes
- [ ] Deployment

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

- **Email**: support@medicare.com
- **Phone**: 1900 0908
- **Website**: https://medicare.com

## 🙏 Acknowledgments

- Dữ liệu sản phẩm từ Long Châu Pharmacy
- Icons từ Flaticon
- Fonts từ Google Fonts
- Inspiration từ các website thương mại điện tử hàng đầu
