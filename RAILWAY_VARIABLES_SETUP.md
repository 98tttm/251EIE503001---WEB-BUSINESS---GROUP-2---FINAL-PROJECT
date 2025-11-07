# 🔧 THIẾT LẬP VARIABLES RAILWAY

## ✅ HIỆN TẠI CÓ (Đã OK):

```
✅ MONGO_URI - MongoDB Atlas connection string
✅ NODE_ENV - production  
✅ PORT - 8080
```

---

## ⚠️ CẦN THÊM NGAY:

Vào Railway → Service MEDICARE → Tab **"Variables"** → Click **"+ New Variable"**

### **1. DB_NAME**
```
Name: DB_NAME
Value: MediCare_database
```

### **2. JWT_SECRET**
```
Name: JWT_SECRET
Value: medicare_production_secret_2025_change_this_to_random_string
```
⚠️ **Đổi thành chuỗi ngẫu nhiên của bạn!**

### **3. JWT_EXPIRES_IN**
```
Name: JWT_EXPIRES_IN
Value: 7d
```

### **4. ALLOWED_ORIGINS**
```
Name: ALLOWED_ORIGINS
Value: *
```
📝 **Sau khi deploy frontend, đổi thành:**
```
Value: https://medicare-client.vercel.app,https://medicare-admin.vercel.app
```

---

## 📋 BẢNG TỔNG KẾT:

| Biến | Giá trị | Bắt buộc | Mô tả |
|------|---------|----------|-------|
| `MONGO_URI` | `mongodb+srv://...` | ✅ Có | MongoDB connection |
| `NODE_ENV` | `production` | ✅ Có | Environment |
| `PORT` | `8080` | ✅ Có | Port (Railway tự set) |
| `DB_NAME` | `MediCare_database` | ⚠️ Cần thêm | Database name |
| `JWT_SECRET` | `your_secret_here` | ⚠️ Cần thêm | JWT secret key |
| `JWT_EXPIRES_IN` | `7d` | ⚠️ Cần thêm | Token expiry |
| `ALLOWED_ORIGINS` | `*` hoặc URLs | ⚠️ Cần thêm | CORS origins |

---

## 🚀 SAU KHI THÊM:

1. Railway sẽ **tự động redeploy** backend
2. Đợi 2-3 phút
3. Kiểm tra logs → Không còn lỗi
4. Lấy Public URL để deploy frontend

---

## 🔍 KIỂM TRA LOGS:

Sau khi redeploy, logs sẽ hiển thị:

### ✅ ĐÚNG:
```
✅ Connected to MongoDB
✅ Database: MediCare_database
✅ Server is running on port 8080
📊 Database indexes created
```

### ❌ SAI (nếu thiếu variables):
```
❌ Error auto-completing orders
❌ Cannot read properties of undefined
```

---

## 💡 LƯU Ý:

- **MONGO_URI vs MONGODB_URI**: Code đã được update để support cả 2
- **JWT_SECRET**: Nên dùng chuỗi ngẫu nhiên dài >32 ký tự
- **ALLOWED_ORIGINS**: 
  - Development: `*` (cho phép tất cả)
  - Production: Chỉ cho phép domain cụ thể

