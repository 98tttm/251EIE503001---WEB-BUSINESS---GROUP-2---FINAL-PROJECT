# Tạo file .env cho server

## Bước 1: Tạo file .env

Tạo file `.env` trong thư mục `server/` với nội dung sau:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medicare
JWT_SECRET=medicare_jwt_secret_key_2024_secure
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

## Bước 2: Kiểm tra file .env

Đảm bảo file `.env` được tạo trong đúng vị trí:
```
MEDICARE/
├── server/
│   ├── .env          ← File này
│   ├── app.js
│   ├── package.json
│   └── ...
```

## Bước 3: Chạy server

Sau khi tạo file .env, chạy:
```bash
start-server.bat
```

## Lưu ý:
- File .env chứa thông tin nhạy cảm, không commit vào git
- Thay đổi JWT_SECRET trong production
- Đảm bảo MongoDB đang chạy trước khi start server
