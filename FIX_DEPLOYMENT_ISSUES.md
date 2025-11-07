# 🔧 Hướng Dẫn Sửa Lỗi Deployment

## ⚠️ Vấn đề hiện tại:

### 1. Backend không kết nối được MongoDB
**Lỗi**: `connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017`

**Nguyên nhân**: Backend đang cố kết nối đến `localhost:27017` thay vì MongoDB Atlas.

**Giải pháp**: 
- ✅ Đã sửa `chatbot-service.js` để sử dụng config từ `environment.js`
- ⚠️ **CẦN LÀM**: Thêm biến môi trường `MONGODB_URI` trên Railway

### 2. Client vẫn gọi `localhost:3000`
**Lỗi**: `Access to fetch at 'http://localhost:3000/api/...' has been blocked by CORS policy`

**Nguyên nhân**: Vercel đang cache build cũ hoặc build không sử dụng `environment.prod.ts`.

**Giải pháp**: 
- ✅ Code đã đúng, `environment.prod.ts` đã có URL đúng
- ⚠️ **CẦN LÀM**: Clear cache và redeploy trên Vercel

---

## 📋 Checklist Sửa Lỗi:

### Bước 1: Cấu hình MongoDB trên Railway

1. **Lấy MongoDB Atlas Connection String:**
   - Vào MongoDB Atlas Dashboard
   - Chọn cluster của bạn
   - Click **Connect** → **Connect your application**
   - Copy connection string (dạng: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)

2. **Thêm biến môi trường trên Railway:**
   - Vào Railway Dashboard → Backend project → **Variables**
   - Thêm biến: `MONGODB_URI`
   - Giá trị: Paste connection string từ MongoDB Atlas
   - **QUAN TRỌNG**: Thêm database name vào cuối:
     ```
     mongodb+srv://username:password@cluster.mongodb.net/MediCare_database?retryWrites=true&w=majority
     ```
     (Thay `MediCare_database` bằng tên database của bạn nếu khác)

3. **Thêm các biến môi trường khác (nếu chưa có):**
   - `DB_NAME`: `MediCare_database`
   - `JWT_SECRET`: (tạo một secret key ngẫu nhiên, ví dụ: `openssl rand -base64 32`)
   - `JWT_EXPIRES_IN`: `7d`
   - `ALLOWED_ORIGINS`: `https://medicare-seven-kappa.vercel.app`
   - `EMAIL_USER`: `nhathuocmedicare@gmail.com`
   - `EMAIL_PASSWORD`: (App password từ Gmail)

4. **Redeploy Backend:**
   - Railway sẽ tự động redeploy khi bạn cập nhật biến môi trường
   - Hoặc vào **Deployments** → **Redeploy**

### Bước 2: Fix Client Build trên Vercel

1. **Vào Vercel Dashboard:**
   - Truy cập: https://vercel.com
   - Chọn project client của bạn

2. **Clear Build Cache:**
   - Vào **Settings** → **General**
   - Scroll xuống **Build & Development Settings**
   - Tìm **Build Cache** và click **Clear**

3. **Redeploy với Production Config:**
   - Vào **Deployments**
   - Click **...** (3 chấm) trên deployment mới nhất
   - Chọn **Redeploy**
   - **QUAN TRỌNG**: Đảm bảo build command là:
     ```
     npm run build
     ```
     (Angular sẽ tự động sử dụng production config)

4. **Kiểm tra Build Logs:**
   - Xem build logs trên Vercel
   - Đảm bảo không có lỗi
   - Kiểm tra xem có thông báo "Using production configuration" không

### Bước 3: Kiểm tra lại

1. **Kiểm tra Backend:**
   - Mở: `https://medicare-production-70ae.up.railway.app/api/health`
   - Phải trả về: `{"status":"ok"}`
   - Kiểm tra logs trên Railway xem có lỗi MongoDB không

2. **Kiểm tra Client:**
   - Mở: `https://medicare-seven-kappa.vercel.app`
   - Mở DevTools (F12) → Console
   - Kiểm tra:
     - ✅ Không còn lỗi CORS
     - ✅ Không còn lỗi "Failed to fetch"
     - ✅ API calls đang gọi đến `https://medicare-production-70ae.up.railway.app` (KHÔNG phải localhost)
     - ✅ Dữ liệu load được

---

## 🐛 Troubleshooting:

### Vẫn lỗi MongoDB:
- Kiểm tra MongoDB Atlas đã whitelist IP `0.0.0.0/0` (allow all) chưa
- Kiểm tra username/password trong connection string đúng chưa
- Kiểm tra database name trong connection string đúng chưa

### Vẫn gọi localhost:3000:
- Kiểm tra file `my_client/src/environments/environment.prod.ts` có URL đúng không
- Clear cache trên Vercel và redeploy
- Kiểm tra build logs xem có sử dụng production config không
- Thử hard refresh browser (Ctrl+Shift+R hoặc Cmd+Shift+R)

### Lỗi CORS:
- Kiểm tra `ALLOWED_ORIGINS` trên Railway có URL client đúng không
- Đảm bảo URL không có dấu `/` ở cuối
- Redeploy backend sau khi cập nhật `ALLOWED_ORIGINS`

---

## ✅ Sau khi hoàn thành:

Backend sẽ:
- ✅ Kết nối được MongoDB Atlas
- ✅ Không còn lỗi "ECONNREFUSED"
- ✅ Chatbot service hoạt động bình thường

Client sẽ:
- ✅ Gọi API đến Railway backend (không phải localhost)
- ✅ Load được dữ liệu từ API
- ✅ Không còn lỗi CORS
- ✅ Website hoạt động đầy đủ chức năng

---

## 📝 Ghi chú:

- **MongoDB URI**: Phải có format đầy đủ với database name:
  ```
  mongodb+srv://user:pass@cluster.mongodb.net/MediCare_database?retryWrites=true&w=majority
  ```

- **CORS Origins**: Phân cách bằng dấu phẩy, KHÔNG có khoảng trắng:
  ```
  https://medicare-seven-kappa.vercel.app,https://admin-url.vercel.app
  ```

- **Build Cache**: Vercel có thể cache build cũ, nên cần clear cache khi có thay đổi về environment.

