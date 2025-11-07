# 🔍 Hướng Dẫn Debug Client Không Load Được Dữ Liệu

## ⚠️ Vấn đề hiện tại:
- Backend API trả về OK (`/api/health` hoạt động)
- Client không load được dữ liệu (products, categories, blogs, etc.)

## 🔧 Các bước kiểm tra:

### Bước 1: Kiểm tra CORS trên Railway

1. **Vào Railway Dashboard:**
   - Truy cập: https://railway.app
   - Chọn backend project

2. **Kiểm tra biến môi trường `ALLOWED_ORIGINS`:**
   - Vào tab **Variables**
   - Tìm biến `ALLOWED_ORIGINS`
   - Giá trị phải là:
     ```
     https://medicare-seven-kappa.vercel.app
     ```
   - **QUAN TRỌNG**: 
     - Không có khoảng trắng
     - Không có dấu `/` ở cuối
     - Phải có `https://`

3. **Nếu chưa có, thêm biến:**
   - Click **+ New Variable**
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://medicare-seven-kappa.vercel.app`
   - Save

4. **Redeploy backend:**
   - Vào **Deployments**
   - Click **Redeploy** trên deployment mới nhất

### Bước 2: Kiểm tra Client có gọi đúng URL không

1. **Mở website client:**
   - URL: https://medicare-seven-kappa.vercel.app

2. **Mở DevTools:**
   - Nhấn `F12` hoặc `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Vào tab **Network**

3. **Reload trang và kiểm tra:**
   - Tìm các request đến `/api/...`
   - Kiểm tra **Request URL**:
     - ✅ **ĐÚNG**: `https://medicare-production-70ae.up.railway.app/api/...`
     - ❌ **SAI**: `http://localhost:3000/api/...`

4. **Nếu vẫn gọi localhost:3000:**
   - Vercel đang cache build cũ
   - Làm theo **Bước 3**

### Bước 3: Clear Cache và Redeploy Client trên Vercel

1. **Vào Vercel Dashboard:**
   - Truy cập: https://vercel.com
   - Chọn client project

2. **Clear Build Cache:**
   - Vào **Settings** → **General**
   - Scroll xuống **Build & Development Settings**
   - Tìm **Build Cache**
   - Click **Clear** hoặc **Purge Cache**

3. **Redeploy:**
   - Vào **Deployments**
   - Tìm deployment mới nhất
   - Click **...** (3 chấm) → **Redeploy**
   - Đợi build xong (2-5 phút)

4. **Kiểm tra Build Logs:**
   - Xem logs trong quá trình build
   - Đảm bảo không có lỗi
   - Kiểm tra có dòng "Building for production" không

### Bước 4: Kiểm tra Console Logs

1. **Mở website client:**
   - https://medicare-seven-kappa.vercel.app

2. **Mở DevTools Console:**
   - Nhấn `F12`
   - Vào tab **Console**

3. **Kiểm tra lỗi:**
   - ❌ **Lỗi CORS**: `Access to fetch at '...' has been blocked by CORS policy`
     - → CORS chưa được cấu hình đúng trên Railway
   - ❌ **Lỗi Network**: `Failed to fetch` hoặc `net::ERR_FAILED`
     - → Backend không khởi động hoặc URL sai
   - ❌ **Lỗi 404**: `404 Not Found`
     - → API endpoint không tồn tại
   - ❌ **Lỗi 500**: `500 Internal Server Error`
     - → Backend có lỗi, kiểm tra logs trên Railway

### Bước 5: Test API Endpoints trực tiếp

1. **Test từ trình duyệt:**
   - Mở: `https://medicare-production-70ae.up.railway.app/api/health`
   - Phải trả về JSON với `"status": "OK"`

2. **Test từ client domain:**
   - Mở DevTools Console trên client website
   - Chạy lệnh:
     ```javascript
     fetch('https://medicare-production-70ae.up.railway.app/api/health')
       .then(r => r.json())
       .then(console.log)
       .catch(console.error)
     ```
   - Nếu thành công → CORS OK
   - Nếu lỗi CORS → Cần cấu hình lại ALLOWED_ORIGINS

3. **Test các endpoint khác:**
   ```javascript
   // Test categories
   fetch('https://medicare-production-70ae.up.railway.app/api/categories')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   
   // Test products
   fetch('https://medicare-production-70ae.up.railway.app/api/products?limit=5')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   
   // Test blogs
   fetch('https://medicare-production-70ae.up.railway.app/api/blogs/overview')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

### Bước 6: Kiểm tra Backend Logs trên Railway

1. **Vào Railway Dashboard:**
   - Chọn backend project
   - Vào tab **Deployments**
   - Click vào deployment đang chạy
   - Vào tab **Logs**

2. **Kiểm tra logs:**
   - ✅ **Tốt**: Thấy logs "✅ CORS: Origin allowed: https://medicare-seven-kappa.vercel.app"
   - ❌ **Xấu**: Thấy logs "⚠️ CORS blocked origin: https://medicare-seven-kappa.vercel.app"
   - ❌ **Xấu**: Thấy lỗi MongoDB connection

3. **Nếu thấy lỗi CORS:**
   - Kiểm tra lại biến `ALLOWED_ORIGINS` trên Railway
   - Đảm bảo URL chính xác (không có `/` ở cuối)
   - Redeploy backend

## 🐛 Troubleshooting:

### Vấn đề 1: Client vẫn gọi localhost:3000
**Nguyên nhân**: Vercel cache build cũ

**Giải pháp**:
1. Clear build cache trên Vercel
2. Redeploy client
3. Hard refresh browser (Ctrl+Shift+R)

### Vấn đề 2: Lỗi CORS
**Nguyên nhân**: ALLOWED_ORIGINS chưa được cấu hình hoặc sai

**Giải pháp**:
1. Kiểm tra biến `ALLOWED_ORIGINS` trên Railway
2. Đảm bảo URL chính xác: `https://medicare-seven-kappa.vercel.app`
3. Redeploy backend
4. Kiểm tra logs trên Railway

### Vấn đề 3: API trả về 500
**Nguyên nhân**: Backend có lỗi

**Giải pháp**:
1. Kiểm tra logs trên Railway
2. Kiểm tra MongoDB connection
3. Kiểm tra biến môi trường đã đủ chưa

### Vấn đề 4: API trả về 404
**Nguyên nhân**: Endpoint không tồn tại

**Giải pháp**:
1. Kiểm tra URL endpoint đúng chưa
2. Kiểm tra backend code có endpoint đó không

## ✅ Checklist hoàn chỉnh:

- [ ] Đã thêm `ALLOWED_ORIGINS` trên Railway với giá trị đúng
- [ ] Đã redeploy backend sau khi cập nhật CORS
- [ ] Đã clear cache trên Vercel
- [ ] Đã redeploy client trên Vercel
- [ ] Đã kiểm tra Network tab - API calls gọi đúng URL Railway
- [ ] Đã kiểm tra Console - không còn lỗi CORS
- [ ] Đã test API endpoints trực tiếp từ browser
- [ ] Đã kiểm tra backend logs trên Railway
- [ ] Website client load được dữ liệu

## 📞 Nếu vẫn không được:

1. **Chụp screenshot:**
   - DevTools Console (tất cả lỗi)
   - DevTools Network tab (các request đến API)
   - Railway logs (backend logs)

2. **Gửi thông tin:**
   - URL client: `https://medicare-seven-kappa.vercel.app`
   - URL backend: `https://medicare-production-70ae.up.railway.app`
   - Giá trị `ALLOWED_ORIGINS` trên Railway
   - Các lỗi trong Console

