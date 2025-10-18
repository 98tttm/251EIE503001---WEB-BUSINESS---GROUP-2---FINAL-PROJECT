# MediCare Setup Guide

## Cài đặt và chạy dự án

### 1. Cài đặt MongoDB
- Tải và cài đặt MongoDB Community Server từ: https://www.mongodb.com/try/download/community
- Khởi động MongoDB service

### 2. Cấu hình Environment Variables
Tạo file `.env` trong thư mục `server/` với nội dung:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medicare
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Chạy Server
```bash
# Chạy script tự động (khuyến nghị)
start-server.bat

# Hoặc chạy thủ công:
cd server
npm install
node scripts/importData.js
npm start
```

### 4. Test API
```bash
# Chạy script test
test-api.bat

# Hoặc test thủ công:
curl http://localhost:5000/health
curl http://localhost:5000/api/categories
curl http://localhost:5000/api/products/category/9bed0236c5b87c043200fb11
```

### 5. Mở Website
- Mở file `src/html/ListProduct.html` trong trình duyệt
- Hoặc sử dụng Live Server extension trong VS Code

## Tính năng đã được fix

### ✅ 1. Fix lỗi popup navigation
- Popup sẽ biến mất khi di chuyển chuột ra ngoài header
- Cải thiện UX với delay và smooth transition

### ✅ 2. Breadcrumb động
- Tự động cập nhật khi chọn danh mục trên navigation
- Hiển thị đường dẫn: Trang chủ / Thực phẩm chức năng / Sinh lý - Nội tiết tố
- Hỗ trợ URL routing với browser back/forward

### ✅ 3. Tích hợp MongoDB
- API endpoints để lấy sản phẩm theo category ID
- Fallback về JSON file nếu API không khả dụng
- Import dữ liệu tự động vào MongoDB

### ✅ 4. Load dữ liệu cho danh mục "Sinh lý - Nội tiết tố"
- Category ID: `9bed0236c5b87c043200fb11`
- Parent ID: `2c47f2df71bb5d8376f041ee` (Thực phẩm chức năng)
- Load sản phẩm từ MongoDB hoặc JSON file

## API Endpoints

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

## Cấu trúc dữ liệu

### Category
```json
{
  "_id": "9bed0236c5b87c043200fb11",
  "name": "Sinh lý - Nội tiết tố",
  "parentId": "2c47f2df71bb5d8376f041ee",
  "slug": "sinh-ly-noi-tiet-to",
  "isActive": true
}
```

### Product
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

## Troubleshooting

### Lỗi kết nối MongoDB
- Kiểm tra MongoDB service đã chạy chưa
- Kiểm tra MONGODB_URI trong file .env

### Lỗi CORS
- Đảm bảo FRONTEND_URL trong .env đúng
- Kiểm tra port của frontend

### Dữ liệu không hiển thị
- Chạy lại script import: `node scripts/importData.js`
- Kiểm tra console log để debug

## Liên hệ
Nếu gặp vấn đề, vui lòng tạo issue hoặc liên hệ team phát triển.
