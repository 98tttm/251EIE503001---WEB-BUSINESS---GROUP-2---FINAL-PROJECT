# MEDICARE Backend API

Backend API server kết nối với MongoDB database `MediCare_database`.

## Da Ket Noi Thanh Cong!

Database hien co:
- **8,122 san pham** (products)
- **279 danh muc** (categories)
- **8 nguoi dung** (users)
- **3,320 phuong/xa** (wards)
- **34 tinh/thanh** (provinces)
- **30 FAQ**

## Khoi Chay Server

```bash
cd D:\MEDICARE\MEDICARE_FINAL\backend
npm start
```

Server chạy tại: **http://localhost:3000**

## API Endpoints

### Test & Health

- `GET /api/test` - Test API với dữ liệu mẫu
- `GET /api/health` - Kiểm tra trạng thái server & database

### Products (San pham)

- `GET /api/products` - Danh sách sản phẩm
  - Query params: `?limit=20&skip=0&category=...&search=...`
- `GET /api/products/:id` - Chi tiết sản phẩm
- `GET /api/products/hot` - 10 sản phẩm hot (random)
- `GET /api/products/bestseller` - 10 sản phẩm bán chạy (random)
- `GET /api/products/flashsale` - 10 sản phẩm flash sale (giá < 500k)
- `GET /api/products/search?q=keyword` - Tìm kiếm sản phẩm

### Categories (Danh muc)

- `GET /api/categories` - Danh sách danh mục
- `GET /api/categories/:id` - Chi tiết danh mục

### Users (Nguoi dung)

- `GET /api/users` - Danh sách users (thông tin cơ bản)

### Cart (Gio hang)

- `GET /api/carts/:userId` - Lấy giỏ hàng
- `POST /api/carts/:userId/items` - Thêm sản phẩm vào giỏ
  - Body: `{ "productId": "...", "quantity": 1 }`

### FAQ

- `GET /api/faq` - Danh sách câu hỏi thường gặp

### Locations (Dia diem)

- `GET /api/provinces` - Danh sách tỉnh/thành
- `GET /api/wards/:provinceCode` - Danh sách phường/xã theo tỉnh

### Articles (Bai viet Goc suc khoe)

- `GET /api/articles` - Danh sách tất cả bài viết
- `GET /api/articles/:slug` - Chi tiết bài viết theo slug

## Test API

Mở trình duyệt và truy cập:

1. **Health Check**: http://localhost:3000/api/health
2. **Test Data**: http://localhost:3000/api/test
3. **10 Sản phẩm**: http://localhost:3000/api/products?limit=10
4. **Flash Sale**: http://localhost:3000/api/products/flashsale
5. **Danh mục**: http://localhost:3000/api/categories
6. **Tìm kiếm**: http://localhost:3000/api/products/search?q=vitamin

## Response Format

```json
{
  "products": [
    {
      "_id": "...",
      "name": "Tên sản phẩm",
      "price": 218000,
      "brand": "Sanofi",
      "country": "Việt Nam"
    }
  ]
}
```

## Cau Hinh

- MongoDB URI: `mongodb://localhost:27017`
- Database: `MediCare_database`
- Port: `3000`
- CORS: Enabled (cho phép tất cả origins)

## Notes

- Server tự động kết nối với MongoDB khi khởi động
- Nếu kết nối thất bại, kiểm tra MongoDB đã chạy chưa: `net start MongoDB`
- Sử dụng MongoDB Compass để quản lý database

