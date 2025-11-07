# 🌐 DEPLOY FRONTEND - HƯỚNG DẪN TỪNG BƯỚC

## 📋 TỔNG QUAN

Chúng ta sẽ deploy:
1. **my_client** → Website khách hàng → Vercel
2. **my_admin** → Admin panel → Vercel

**Thời gian:** ~15 phút

---

## 🎯 BƯỚC 1: LẤY RAILWAY BACKEND URL

### **Cách 1: Từ Railway Dashboard**

1. Vào: https://railway.app
2. Project **MEDICARE** → Service backend
3. Tab **"Settings"**
4. **Networking** → **Public Networking**
5. **Generate Domain** (nếu chưa có)
6. Copy URL

### **Cách 2: Từ Deployments**

1. Tab **"Deployments"**
2. Click deployment thành công gần nhất
3. Xem logs, tìm dòng:
   ```
   💊 Server: http://localhost:8080
   ```
4. Hoặc xem trong Deployment details có URL public

### **URL sẽ có dạng:**
```
https://medicare-production-70ae.up.railway.app
```

⚠️ **LƯU LẠI URL NÀY!**

---

## 🔧 BƯỚC 2: CẬP NHẬT API URLs

### **Option A: Dùng Script (Nhanh - Khuyên dùng)**

Mở PowerShell tại thư mục project:

```powershell
# Thay YOUR_RAILWAY_URL bằng URL thật
.\update-frontend-urls.ps1 "https://medicare-production-70ae.up.railway.app"
```

Script sẽ tự động update cả 2 file:
- ✅ `my_client/src/environments/environment.prod.ts`
- ✅ `my_admin/src/environments/environment.prod.ts`

### **Option B: Update thủ công**

**File 1:** `my_client/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://medicare-production-70ae.up.railway.app'  // ← URL Railway
};
```

**File 2:** `my_admin/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://medicare-production-70ae.up.railway.app'  // ← URL Railway
};
```

---

## 📤 BƯỚC 3: COMMIT & PUSH

```powershell
git add my_client/src/environments my_admin/src/environments
git commit -m "Update production API URLs for deployment"
git push
```

---

## ☁️ BƯỚC 4: DEPLOY CLIENT LÊN VERCEL

### **4.1. Đăng ký/Đăng nhập Vercel**

1. Truy cập: https://vercel.com
2. Click **"Sign Up"** hoặc **"Login"**
3. Chọn **"Continue with GitHub"**
4. Authorize Vercel

### **4.2. Import Project**

1. Click **"Add New..."** → **"Project"**
2. **Import Git Repository**
3. Tìm và chọn repository: **`MEDICARE`** hoặc **`251EIE503001-...`**
4. Click **"Import"**

### **4.3. Configure Project - CLIENT**

**Điền các thông tin sau:**

```
┌─────────────────────────────────────────┐
│ PROJECT NAME                            │
│ medicare-client                         │
├─────────────────────────────────────────┤
│ FRAMEWORK PRESET                        │
│ Other (hoặc Angular)                    │
├─────────────────────────────────────────┤
│ ROOT DIRECTORY                          │
│ my_client                               │
│ [x] Include source files outside root   │
├─────────────────────────────────────────┤
│ BUILD COMMAND                           │
│ npm install && npm run build            │
├─────────────────────────────────────────┤
│ OUTPUT DIRECTORY                        │
│ dist/my_client/browser                  │
├─────────────────────────────────────────┤
│ INSTALL COMMAND                         │
│ npm install                             │
└─────────────────────────────────────────┘
```

**Screenshots để tham khảo:**

```
Root Directory:
┌──────────────────────────────┐
│ Root Directory               │
│ ┌──────────────────────────┐ │
│ │ my_client                │ │
│ └──────────────────────────┘ │
│ ☑ Include source files       │
│   outside of Root Directory  │
└──────────────────────────────┘
```

### **4.4. Deploy**

1. Click **"Deploy"**
2. Đợi 3-5 phút (Vercel sẽ build)
3. Xem Build Logs để theo dõi

### **4.5. Lấy URL Client**

Sau khi deploy xong:

1. Vercel sẽ hiển thị **"Congratulations!"**
2. Click **"Visit"** hoặc copy URL
3. URL có dạng: `https://medicare-client.vercel.app`

⚠️ **LƯU URL NÀY LẠI!**

---

## 🔐 BƯỚC 5: DEPLOY ADMIN LÊN VERCEL

### **5.1. Tạo Project mới**

1. Quay lại Vercel Dashboard
2. Click **"Add New..."** → **"Project"**
3. Chọn **cùng repository** (MEDICARE)
4. Click **"Import"**

### **5.2. Configure Project - ADMIN**

```
┌─────────────────────────────────────────┐
│ PROJECT NAME                            │
│ medicare-admin                          │
├─────────────────────────────────────────┤
│ FRAMEWORK PRESET                        │
│ Other (hoặc Angular)                    │
├─────────────────────────────────────────┤
│ ROOT DIRECTORY                          │
│ my_admin                                │
│ [x] Include source files outside root   │
├─────────────────────────────────────────┤
│ BUILD COMMAND                           │
│ npm install && npm run build            │
├─────────────────────────────────────────┤
│ OUTPUT DIRECTORY                        │
│ dist/my_admin/browser                   │
├─────────────────────────────────────────┤
│ INSTALL COMMAND                         │
│ npm install                             │
└─────────────────────────────────────────┘
```

### **5.3. Deploy**

1. Click **"Deploy"**
2. Đợi 3-5 phút
3. Lấy URL: `https://medicare-admin.vercel.app`

---

## 🔄 BƯỚC 6: CẬP NHẬT CORS TRÊN BACKEND

Giờ backend cần biết domain của frontend để cho phép CORS.

### **6.1. Vào Railway**

1. https://railway.app
2. Project **MEDICARE** → Service backend
3. Tab **"Variables"**

### **6.2. Update ALLOWED_ORIGINS**

Tìm biến `ALLOWED_ORIGINS` và sửa thành:

```
ALLOWED_ORIGINS=https://medicare-client.vercel.app,https://medicare-admin.vercel.app
```

**Lưu ý:**
- Không có dấu cách sau dấu phẩy
- Không có dấu `/` cuối URL
- Thay bằng URL Vercel thật của bạn

### **6.3. Backend sẽ tự động redeploy**

Railway detect thay đổi variables và redeploy (~2 phút)

---

## ✅ BƯỚC 7: KIỂM TRA & TESTING

### **7.1. Test Backend**

```powershell
# Test API
curl https://medicare-production-70ae.up.railway.app/api/health

# Hoặc mở browser:
https://medicare-production-70ae.up.railway.app/api/products?page=1&limit=10
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": [...],
  "total": 8124
}
```

### **7.2. Test Client Website**

Mở browser: `https://medicare-client.vercel.app`

**Checklist:**
- [ ] Homepage load được
- [ ] Danh sách sản phẩm hiển thị
- [ ] Search hoạt động
- [ ] Chi tiết sản phẩm load được
- [ ] Thêm vào giỏ hàng
- [ ] Đăng nhập/đăng ký

### **7.3. Test Admin Panel**

Mở browser: `https://medicare-admin.vercel.app`

**Đăng nhập:**
- Email: `thinh@medicare.vn`
- Password: `1234567890`

**Checklist:**
- [ ] Login thành công
- [ ] Dashboard hiển thị statistics
- [ ] Danh sách products load
- [ ] Danh sách orders load
- [ ] CRUD operations hoạt động

---

## 🐛 TROUBLESHOOTING

### **Lỗi 1: "Failed to build"**

**Triệu chứng:** Build fails trên Vercel

**Giải pháp:**
1. Kiểm tra **Root Directory** đúng chưa
2. Kiểm tra **Output Directory** đúng format
3. Xem Build Logs để biết lỗi cụ thể

### **Lỗi 2: "CORS blocked"**

**Triệu chứng:**
```
Access-Control-Allow-Origin blocked
```

**Giải pháp:**
1. Kiểm tra `ALLOWED_ORIGINS` trong Railway
2. Đảm bảo URL Vercel chính xác (không có `/` cuối)
3. Backend đã redeploy chưa

### **Lỗi 3: "404 Not Found" khi refresh page**

**Triệu chứng:** Refresh trang → 404

**Giải pháp:**
Tạo file `vercel.json` trong root directory (my_client và my_admin):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### **Lỗi 4: "Cannot GET /api/..."**

**Triệu chứng:** API calls bị 404

**Giải pháp:**
1. Kiểm tra `environment.prod.ts` có đúng URL không
2. Kiểm tra Railway backend đang chạy
3. Test API trực tiếp bằng Postman/curl

---

## 📊 BẢNG TỔNG KẾT

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| **Backend** | Railway | `medicare-production-70ae.up.railway.app` | ✅ |
| **Client** | Vercel | `medicare-client.vercel.app` | ✅ |
| **Admin** | Vercel | `medicare-admin.vercel.app` | ✅ |
| **Database** | MongoDB Atlas | (internal) | ✅ |

---

## 🎉 HOÀN THÀNH!

Website đã online và sẵn sàng cho người dùng!

### **Các URL:**
- 🌐 **Website:** https://medicare-client.vercel.app
- 🔐 **Admin:** https://medicare-admin.vercel.app
- 🔌 **API:** https://medicare-production-70ae.up.railway.app

### **Bước tiếp theo:**
1. ✅ Test toàn bộ chức năng
2. ✅ Setup custom domain (tùy chọn)
3. ✅ Setup monitoring & analytics
4. ✅ Backup database định kỳ

---

**🎊 CHÚC MỪNG! Bạn đã deploy thành công website MEDICARE! 🎊**

