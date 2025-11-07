# 🚀 Hướng Dẫn Deploy MediCare Website

## 📋 Tổng Quan

Website MediCare gồm 3 components:
- **Backend**: Node.js API trên Railway
- **Client**: Angular frontend trên Vercel
- **Admin**: Angular admin panel trên Vercel

---

## 🔧 1. Deploy Backend (Railway)

### Bước 1: Tạo Project trên Railway
1. Vào https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Chọn repository của bạn
4. Railway sẽ tự động detect và deploy

### Bước 2: Cấu hình Biến Môi Trường
Vào **Variables** tab, thêm các biến sau:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/MediCare_database?retryWrites=true&w=majority
DB_NAME=MediCare_database
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://medicare-seven-kappa.vercel.app,https://medicare-admin-mu.vercel.app
EMAIL_USER=nhathuocmedicare@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Bước 3: Kiểm Tra
- URL backend: `https://medicare-production-70ae.up.railway.app`
- Health check: `https://medicare-production-70ae.up.railway.app/api/health`

---

## 🌐 2. Deploy Client (Vercel)

### Bước 1: Tạo Project trên Vercel
1. Vào https://vercel.com
2. Click **Add New...** → **Project**
3. Import Git Repository
4. Cấu hình:
   - **Root Directory**: `my_client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/my_client/browser`
5. Click **Deploy**

### Bước 2: Kiểm Tra
- URL client: `https://medicare-seven-kappa.vercel.app`
- Mở website và kiểm tra hoạt động

---

## 👨‍💼 3. Deploy Admin (Vercel)

### Bước 1: Tạo Project trên Vercel
1. Vào https://vercel.com
2. Click **Add New...** → **Project**
3. Import Git Repository (cùng repo)
4. Cấu hình:
   - **Root Directory**: `my_admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/my_admin/browser`
5. Click **Deploy**

### Bước 2: Cập Nhật CORS
Sau khi có Admin URL, cập nhật `ALLOWED_ORIGINS` trên Railway:
```
https://medicare-seven-kappa.vercel.app,https://medicare-admin-mu.vercel.app
```

### Bước 3: Kiểm Tra
- URL admin: `https://medicare-admin-mu.vercel.app`
- Đăng nhập và kiểm tra hoạt động

---

## ✅ Checklist Hoàn Chỉnh

### Backend:
- [ ] Đã deploy trên Railway
- [ ] Đã thêm tất cả biến môi trường
- [ ] Health check trả về OK
- [ ] MongoDB kết nối thành công

### Client:
- [ ] Đã deploy trên Vercel
- [ ] Website load được
- [ ] API calls đến Railway (không phải localhost)
- [ ] Không có lỗi CORS

### Admin:
- [ ] Đã deploy trên Vercel
- [ ] Đã thêm Admin URL vào ALLOWED_ORIGINS
- [ ] Đăng nhập thành công
- [ ] Tất cả chức năng hoạt động

---

## 🔗 URLs

- **Backend**: https://medicare-production-70ae.up.railway.app
- **Client**: https://medicare-seven-kappa.vercel.app
- **Admin**: https://medicare-admin-mu.vercel.app

---

## 📊 Kiểm Tra Hiệu Suất

Xem file `HUONG_DAN_KIEM_TRA_METRICS.md` để biết cách kiểm tra metrics và performance.

---

## 🐛 Troubleshooting

Nếu gặp lỗi, kiểm tra:
1. **CORS**: Đảm bảo URLs đã được thêm vào `ALLOWED_ORIGINS`
2. **MongoDB**: Kiểm tra connection string đúng
3. **Environment**: Đảm bảo `environment.prod.ts` có URL đúng
4. **Build**: Clear cache và redeploy nếu cần

