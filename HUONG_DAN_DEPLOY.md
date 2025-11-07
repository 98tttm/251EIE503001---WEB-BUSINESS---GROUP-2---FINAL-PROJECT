# HƯỚNG DẪN DEPLOY WEBSITE MEDICARE LÊN INTERNET

## 📋 TỔNG QUAN

Website sẽ được deploy thành 3 phần:
1. **Backend API** → Railway.app (miễn phí)
2. **Website khách hàng** (my_client) → Vercel (miễn phí)
3. **Admin panel** (my_admin) → Vercel (miễn phí)

---

## PHẦN 1: DEPLOY BACKEND + DATABASE (Railway.app)

### Bước 1: Đăng ký Railway.app

1. Truy cập: https://railway.app
2. Click **"Login"** → Chọn **"Login with GitHub"**
3. Nếu chưa có GitHub:
   - Truy cập: https://github.com
   - Đăng ký tài khoản mới
   - Quay lại Railway và đăng nhập

### Bước 2: Tạo project mới trên Railway

1. Sau khi đăng nhập Railway, click **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Nếu lần đầu, Railway sẽ yêu cầu kết nối với GitHub:
   - Click **"Configure GitHub App"**
   - Chọn repository: `251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT`
   - Click **"Install & Authorize"**
4. Quay lại Railway, chọn repository vừa authorize

### Bước 3: Thêm MongoDB Database

1. Trong project Railway vừa tạo, click **"+ New"**
2. Chọn **"Database"** → **"Add MongoDB"**
3. Railway sẽ tự động tạo database và cung cấp connection string

### Bước 4: Cấu hình Backend

1. Click vào service backend trong Railway
2. Vào tab **"Variables"**
3. Thêm các biến môi trường sau:

```
NODE_ENV=production
PORT=3000
DB_NAME=MediCare_database
JWT_SECRET=medicare_secret_key_change_this_987654321
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=*
```

**Lưu ý quan trọng:**
- Railway sẽ tự động thêm biến `MONGODB_URI` (lấy từ MongoDB service)
- Nếu không thấy `MONGODB_URI`, click "Add Reference" và chọn MongoDB URI

4. Vào tab **"Settings"**:
   - **Root Directory**: để trống hoặc gõ `/`
   - **Start Command**: `cd backend && node server.js`

5. Click **"Deploy"** (nếu chưa tự deploy)

### Bước 5: Khởi tạo Database

Sau khi backend deploy xong:

1. Vào tab **"Logs"** của backend service
2. Nếu thấy lỗi "Collection not found", cần khởi tạo database:

**Cách 1: Dùng Railway CLI**
```bash
# Cài Railway CLI
npm install -g @railway/cli

# Đăng nhập
railway login

# Link project
railway link

# Chạy init database
railway run cd backend && node scripts/init-database.js
```

**Cách 2: Dùng VS Code (đơn giản hơn)**
- File `backend/scripts/init-database.js` đã sẵn sàng
- Sẽ hướng dẫn chạy từ máy local và kết nối đến Railway MongoDB

### Bước 6: Lấy URL Backend

1. Vào tab **"Settings"** của backend service
2. Scroll xuống **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Copy URL (ví dụ: `https://medicare-backend-production.up.railway.app`)

**⚠️ LƯU Ý:** Lưu URL này lại, bạn sẽ cần nó cho bước tiếp theo!

---

## PHẦN 2: DEPLOY WEBSITE KHÁCH HÀNG (my_client)

### Bước 1: Tạo file cấu hình API

Bạn cần tạo file cấu hình để website biết địa chỉ backend.

**Tạo file:** `my_client/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_BACKEND_URL/api'  // ⚠️ Thay bằng URL Railway của bạn
};
```

**Tạo file:** `my_client/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

### Bước 2: Cập nhật code để dùng environment

**QUAN TRỌNG:** Code hiện tại đang hardcode `http://localhost:3000`. Cần sửa lại!

Mở các file service và thay thế:
- `http://localhost:3000` → `environment.apiUrl`

Ví dụ trong file `my_client/src/app/services/auth.service.ts`:

```typescript
// TRƯỚC KHI SỬA:
private apiUrl = 'http://localhost:3000/api/auth';

// SAU KHI SỬA:
import { environment } from '../../environments/environment';
private apiUrl = `${environment.apiUrl}/auth`;
```

Làm tương tự cho TẤT CẢ các file service trong `my_client/src/app/services/`

### Bước 3: Deploy lên Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập bằng **GitHub**
3. Click **"Add New Project"**
4. Chọn repository: `251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT`
5. Cấu hình:
   - **Framework Preset**: `Angular`
   - **Root Directory**: `my_client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/my_client/browser`

6. Thêm **Environment Variables**:
   ```
   NG_APP_API_URL=https://YOUR_RAILWAY_BACKEND_URL
   ```

7. Click **"Deploy"**

8. Sau khi deploy xong, copy URL (ví dụ: `https://medicare-client.vercel.app`)

---

## PHẦN 3: DEPLOY ADMIN PANEL (my_admin)

Làm tương tự như my_client:

### Bước 1: Tạo file environment

**Tạo file:** `my_admin/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_BACKEND_URL/api'
};
```

### Bước 2: Cập nhật code

Sửa các file service trong `my_admin/src/app/core/services/`:
- Thay `http://localhost:3000` → `environment.apiUrl`

### Bước 3: Deploy lên Vercel

1. Vào Vercel, click **"Add New Project"**
2. Chọn cùng repository
3. Cấu hình:
   - **Root Directory**: `my_admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/my_admin/browser`
4. Click **"Deploy"**

---

## PHẦN 4: CẬP NHẬT CORS TRÊN BACKEND

Sau khi có URL của client và admin, cần cập nhật CORS:

1. Vào Railway → Backend service → Tab **"Variables"**
2. Sửa biến `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://medicare-client.vercel.app,https://medicare-admin.vercel.app
   ```
3. Backend sẽ tự động restart

---

## ✅ HOÀN THÀNH!

Website của bạn đã online tại:
- **Website khách hàng**: `https://medicare-client.vercel.app`
- **Admin panel**: `https://medicare-admin.vercel.app`
- **API**: `https://medicare-backend.railway.app`

---

## 🔧 KHẮC PHỤC SỰ CỐ

### Lỗi CORS
- Kiểm tra biến `ALLOWED_ORIGINS` trong Railway
- Đảm bảo có URL của client và admin

### Lỗi kết nối database
- Kiểm tra biến `MONGODB_URI` trong Railway
- Chạy lại script `init-database.js`

### Lỗi 500 Internal Server Error
- Vào Railway → Backend → Tab "Logs"
- Xem lỗi cụ thể và fix

### Client không kết nối được backend
- Kiểm tra file `environment.prod.ts`
- Đảm bảo URL đúng và có `/api` ở cuối

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, liên hệ team qua email trong README.md

