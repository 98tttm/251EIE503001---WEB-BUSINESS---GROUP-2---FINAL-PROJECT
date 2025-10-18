# Hướng dẫn kết nối Database lên Frontend

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn kết nối MongoDB database với frontend MediCare một cách hoàn chỉnh.

## 🔧 Bước 1: Cài đặt MongoDB

### 1.1 Tải MongoDB Community Server
- Truy cập: https://www.mongodb.com/try/download/community
- Chọn Windows và tải về
- Chạy file installer và làm theo hướng dẫn

### 1.2 Khởi động MongoDB
```bash
# Mở Command Prompt với quyền Administrator
net start MongoDB
```

### 1.3 Kiểm tra MongoDB
```bash
# Mở Command Prompt
mongosh
# Nếu kết nối thành công, bạn sẽ thấy MongoDB shell
```

## 🔧 Bước 2: Cấu hình Environment

### 2.1 Tạo file .env
Tạo file `server\.env` với nội dung:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medicare
JWT_SECRET=medicare_jwt_secret_key_2024_secure
FRONTEND_URL=http://localhost:3000
```

### 2.2 Kiểm tra file .env
```bash
# Chạy script kiểm tra
check-connection.bat
```

## 🔧 Bước 3: Khởi động Server

### 3.1 Chạy script tự động (Khuyến nghị)
```bash
start-server.bat
```

### 3.2 Hoặc chạy thủ công
```bash
cd server
npm install
node scripts/importData.js
npm start
```

## 🔧 Bước 4: Kiểm tra kết nối

### 4.1 Kiểm tra API
```bash
# Chạy script test
test-api.bat

# Hoặc test thủ công
curl http://localhost:5000/health
curl http://localhost:5000/api/categories
```

### 4.2 Kiểm tra Database
```bash
# Mở MongoDB shell
mongosh

# Chuyển đến database medicare
use medicare

# Kiểm tra collections
show collections

# Đếm số lượng documents
db.categories.countDocuments()
db.products.countDocuments()
```

## 🔧 Bước 5: Mở Frontend

### 5.1 Mở website
- Mở file `src/html/ListProduct.html` trong trình duyệt
- Hoặc sử dụng Live Server extension trong VS Code

### 5.2 Kiểm tra kết nối
- Bạn sẽ thấy indicator ở góc phải màn hình:
  - 🟢 "API Connected" - Kết nối thành công
  - 🔴 "Using JSON Fallback" - Sử dụng dữ liệu JSON

## 🔧 Bước 6: Test tính năng

### 6.1 Test Navigation
1. Click vào "Thực phẩm chức năng"
2. Click vào "Sinh lý - Nội tiết tố"
3. Kiểm tra breadcrumb có cập nhật không
4. Kiểm tra sản phẩm có hiển thị không

### 6.2 Test API Endpoints
```bash
# Lấy danh sách categories
curl http://localhost:5000/api/categories

# Lấy category cụ thể
curl http://localhost:5000/api/categories/9bed0236c5b87c043200fb11

# Lấy sản phẩm theo category
curl "http://localhost:5000/api/products/category/9bed0236c5b87c043200fb11?limit=5"
```

## 🐛 Troubleshooting

### Lỗi "MongoDB is not running"
```bash
# Khởi động MongoDB service
net start MongoDB

# Hoặc khởi động thủ công
mongod --dbpath "C:\data\db"
```

### Lỗi "Cannot connect to MongoDB"
1. Kiểm tra MongoDB service đã chạy chưa
2. Kiểm tra port 27017 có bị block không
3. Kiểm tra MONGODB_URI trong file .env

### Lỗi "CORS policy"
1. Kiểm tra FRONTEND_URL trong file .env
2. Đảm bảo frontend chạy trên đúng port
3. Kiểm tra CORS configuration trong server

### Lỗi "Module not found"
```bash
# Cài đặt lại dependencies
cd server
npm install
```

### Dữ liệu không hiển thị
1. Chạy lại script import: `node scripts/importData.js`
2. Kiểm tra console log để debug
3. Kiểm tra database có dữ liệu không

## 📊 Cấu trúc dữ liệu

### Categories Collection
```json
{
  "_id": "9bed0236c5b87c043200fb11",
  "name": "Sinh lý - Nội tiết tố",
  "parentId": "2c47f2df71bb5d8376f041ee",
  "slug": "sinh-ly-noi-tiet-to",
  "isActive": true
}
```

### Products Collection
```json
{
  "_id": "product_id",
  "name": "Tên sản phẩm",
  "price": 100000,
  "discount": 10000,
  "categoryId": "9bed0236c5b87c043200fb11",
  "image": "url_to_image",
  "unit": "Hộp",
  "isActive": true
}
```

## 🚀 API Endpoints

### Categories
- `GET /api/categories` - Lấy tất cả categories
- `GET /api/categories/:id` - Lấy category theo ID
- `GET /api/categories/:id/children` - Lấy subcategories
- `GET /api/categories/:id/path` - Lấy breadcrumb path

### Products
- `GET /api/products` - Lấy tất cả sản phẩm (có filter)
- `GET /api/products/category/:categoryId` - Lấy sản phẩm theo category
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `GET /api/products/featured` - Lấy sản phẩm nổi bật

## 📝 Ghi chú

- Server chạy trên port 5000
- Database tên "medicare"
- Frontend sử dụng ApiService để quản lý kết nối
- Có fallback về JSON file nếu API không khả dụng
- Indicator hiển thị trạng thái kết nối real-time

## 🆘 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Chạy `check-connection.bat` để kiểm tra
2. Xem console log trong trình duyệt
3. Kiểm tra server log
4. Tạo issue hoặc liên hệ team phát triển
