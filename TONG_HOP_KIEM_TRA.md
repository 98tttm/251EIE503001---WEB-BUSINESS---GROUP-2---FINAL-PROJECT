# ✅ Tổng Hợp Kiểm Tra và Sửa Lỗi

## 🔍 Vấn đề đã phát hiện và sửa:

### 1. ✅ **Angular không sử dụng environment.prod.ts khi build**
**Vấn đề**: `angular.json` thiếu `fileReplacements` trong production config
- **Hậu quả**: Client vẫn dùng `environment.ts` (localhost:3000) thay vì `environment.prod.ts` (Railway URL)
- **Đã sửa**: ✅ Thêm `fileReplacements` vào `angular.json`

### 2. ✅ **Backend chatbot-service.js hardcode MongoDB URI**
**Vấn đề**: File này dùng `mongodb://localhost:27017` thay vì config
- **Đã sửa**: ✅ Sửa để dùng `config.mongoUri` từ `environment.js`

### 3. ✅ **Tất cả API URLs đã được thay thế**
**Đã kiểm tra**: Tất cả files trong `my_client/src/app` đã dùng `environment.apiUrl`
- ✅ Không còn hardcode `localhost:3000` trong code

### 4. ⚠️ **CORS chưa được cấu hình trên Railway**
**Cần làm**: Thêm biến `ALLOWED_ORIGINS` trên Railway

---

## 📋 Checklist Hoàn Chỉnh:

### Backend (Railway):

- [ ] **MONGODB_URI**: Đã thêm connection string từ MongoDB Atlas
  - Format: `mongodb+srv://user:pass@cluster.mongodb.net/MediCare_database?retryWrites=true&w=majority`
  
- [ ] **ALLOWED_ORIGINS**: Đã thêm với giá trị:
  ```
  https://medicare-seven-kappa.vercel.app
  ```
  - Không có khoảng trắng
  - Không có `/` ở cuối
  - Phải có `https://`

- [ ] **DB_NAME**: `MediCare_database`

- [ ] **JWT_SECRET**: Secret key ngẫu nhiên (ví dụ: dùng `openssl rand -base64 32`)

- [ ] **JWT_EXPIRES_IN**: `7d`

- [ ] **EMAIL_USER**: `nhathuocmedicare@gmail.com`

- [ ] **EMAIL_PASSWORD**: App password từ Gmail

- [ ] **Backend đã redeploy** sau khi cập nhật biến môi trường

### Client (Vercel):

- [ ] **Code đã được push** lên GitHub (đã có `fileReplacements`)

- [ ] **Clear Build Cache** trên Vercel:
  - Settings → General → Build & Development Settings → Clear Cache

- [ ] **Redeploy client** trên Vercel:
  - Deployments → Redeploy (deployment mới nhất)

- [ ] **Kiểm tra build logs**:
  - Phải thấy "Building for production"
  - Không có lỗi

### Kiểm tra sau khi deploy:

- [ ] **Backend health check**:
  - URL: `https://medicare-production-70ae.up.railway.app/api/health`
  - Phải trả về: `{"status": "OK", "database": "Connected"}`

- [ ] **Client website**:
  - URL: `https://medicare-seven-kappa.vercel.app`
  - Mở DevTools (F12) → Network tab
  - Reload trang
  - Kiểm tra các request đến `/api/...`:
    - ✅ **ĐÚNG**: `https://medicare-production-70ae.up.railway.app/api/...`
    - ❌ **SAI**: `http://localhost:3000/api/...`

- [ ] **Console không có lỗi CORS**:
  - DevTools → Console tab
  - Không có: "Access to fetch... blocked by CORS policy"

- [ ] **Dữ liệu load được**:
  - Products hiển thị
  - Categories hiển thị
  - Website hoạt động bình thường

---

## 🐛 Troubleshooting:

### Vấn đề: Client vẫn gọi localhost:3000

**Nguyên nhân có thể**:
1. Vercel cache build cũ
2. Browser cache

**Giải pháp**:
1. Clear build cache trên Vercel
2. Redeploy client
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
4. Clear browser cache: DevTools → Application → Clear storage

### Vấn đề: Lỗi CORS

**Nguyên nhân**: `ALLOWED_ORIGINS` chưa được cấu hình hoặc sai

**Giải pháp**:
1. Kiểm tra biến `ALLOWED_ORIGINS` trên Railway
2. Đảm bảo URL chính xác: `https://medicare-seven-kappa.vercel.app`
3. Không có khoảng trắng, không có `/` ở cuối
4. Redeploy backend
5. Kiểm tra logs trên Railway:
   - ✅ `✅ CORS: Origin allowed: https://medicare-seven-kappa.vercel.app`
   - ❌ `⚠️ CORS blocked origin: ...`

### Vấn đề: Backend không kết nối MongoDB

**Nguyên nhân**: `MONGODB_URI` chưa được cấu hình hoặc sai

**Giải pháp**:
1. Kiểm tra biến `MONGODB_URI` trên Railway
2. Đảm bảo connection string đúng format
3. Kiểm tra MongoDB Atlas:
   - Network Access: IP `0.0.0.0/0` (allow all) hoặc Railway IP
   - Database User: username/password đúng
4. Kiểm tra logs trên Railway xem có lỗi connection không

### Vấn đề: Images lỗi 500

**Nguyên nhân**: CDN bên ngoài (`cdn.nhathuoclongchau.com.vn`) có vấn đề

**Giải pháp**:
- Đây là vấn đề của CDN bên ngoài, không ảnh hưởng đến API
- Website vẫn hoạt động bình thường, chỉ images không load được
- Có thể bỏ qua hoặc thêm fallback images

---

## 📝 Tóm tắt các file đã sửa:

1. ✅ `my_client/angular.json` - Thêm `fileReplacements` cho production
2. ✅ `backend/chatbot-service.js` - Sửa MongoDB URI
3. ✅ `backend/server.js` - Thêm CORS logging
4. ✅ Tất cả files trong `my_client/src/app` - Đã dùng `environment.apiUrl`

---

## 🚀 Bước tiếp theo:

1. **Cấu hình biến môi trường trên Railway** (quan trọng nhất)
2. **Clear cache và redeploy trên Vercel**
3. **Kiểm tra lại website**

Sau khi làm xong, website sẽ hoạt động đầy đủ! 🎉

