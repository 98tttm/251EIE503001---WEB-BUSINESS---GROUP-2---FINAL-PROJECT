# 🔧 FIX LỖI RAILWAY DEPLOY

## ❌ Lỗi bạn đang gặp:
```
Error creating build plan with Railpack
```

## ✅ CÁCH FIX (2 phút)

### Bước 1: Push code mới lên GitHub

Tôi đã sửa file cấu hình và copy vào backend. Giờ push lên GitHub:

```powershell
git add .
git commit -m "Fix Railway deployment config"
git push
```

### Bước 2: Cấu hình Root Directory trên Railway

1. **Vào Railway Dashboard** (https://railway.app)
2. Click vào project **MEDICARE** của bạn
3. Click vào service **backend** (hoặc service đang failed)
4. Vào tab **"Settings"** (ở menu bên trái)
5. Tìm mục **"Root Directory"**
6. Nhập: `backend`
7. Click **"Save"** hoặc **"Update"**

### Bước 3: Redeploy

1. Vào tab **"Deployments"**
2. Click vào deployment failed gần nhất
3. Click nút **"Redeploy"** (hoặc **"Retry"**)

Hoặc đơn giản hơn:
- Click nút **"Deploy"** ở góc trên bên phải

### Bước 4: Kiểm tra

1. Đợi 2-3 phút
2. Xem tab **"Deployments"** → Logs
3. Nếu thành công, bạn sẽ thấy ✅ **"Success"**

---

## 🎯 CẤU HÌNH ĐÚNG CHO RAILWAY

### Service Settings phải có:

**Root Directory:** `backend`  
**Start Command:** `node server.js` (Railway sẽ tự detect)  
**Watch Paths:** `backend/**`

### Variables cần có:

```env
NODE_ENV=production
PORT=3000
DB_NAME=MediCare_database
JWT_SECRET=your_secret_key_here_123456
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=*
```

**Lưu ý:** Biến `MONGODB_URI` sẽ tự động có khi bạn thêm MongoDB service.

---

## 🐛 NẾU VẪN LỖI

### Lỗi: "Cannot find module"
- Kiểm tra file `backend/package.json` có đầy đủ dependencies không
- Xem logs có thiếu package gì không

### Lỗi: "MongoDB connection failed"
- Vào MongoDB service → Tab **"Connect"**
- Copy **"MongoDB Connection URL"**
- Vào Backend service → Tab **"Variables"**
- Thêm biến: `MONGODB_URI=<url_vừa_copy>`

### Lỗi: "Port already in use"
- Không set biến `PORT` hoặc để PORT=3000
- Railway sẽ tự động assign port

### Vẫn lỗi build:
**Thử phương án 2 - Deploy Backend riêng:**

1. Vào GitHub, vào repository của bạn
2. Click **"Settings"** → **"Deploy keys"**
3. Hoặc tạo repository mới chỉ chứa backend:

```bash
# Tạo repo mới cho backend
cd backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/medicare-backend.git
git push -u origin main
```

4. Quay lại Railway, tạo project mới từ repo backend này

---

## 📸 HÌNH ẢNH HƯỚNG DẪN

### Nơi set Root Directory:
```
Railway Dashboard
  → Project: MEDICARE
    → Service: backend
      → Settings (tab bên trái)
        → Root Directory: backend  ← NHẬP VÀO ĐÂY
```

### Nơi xem logs:
```
Railway Dashboard
  → Project: MEDICARE
    → Service: backend
      → Deployments (tab bên trái)
        → Click vào deployment mới nhất
          → Xem logs ở đây
```

---

## ✅ KHI THÀNH CÔNG

Khi deploy thành công, bạn sẽ thấy:
- ✅ Status: **"Success"** (màu xanh)
- Logs cuối cùng: `Server is running on port 3000`
- Tab **"Settings"** → **"Networking"** → có **"Generate Domain"**

Lấy URL và cập nhật vào frontend!

---

**Chúc bạn fix thành công! 🚀**

