# Cấu hình Environment Variables

## Tạo file .env

Tạo file `.env` trong thư mục `server/` với nội dung sau:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medicare
JWT_SECRET=medicare_jwt_secret_key_2024_secure
FRONTEND_URL=http://localhost:3000
```

## Giải thích các biến:

- `NODE_ENV`: Môi trường chạy (development/production)
- `PORT`: Port chạy server (5000)
- `MONGODB_URI`: Đường dẫn kết nối MongoDB
- `JWT_SECRET`: Secret key cho JWT authentication
- `FRONTEND_URL`: URL của frontend (để cấu hình CORS)
