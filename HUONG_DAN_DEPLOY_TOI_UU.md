# 🚀 HƯỚNG DẪN DEPLOY WEBSITE MEDICARE TỐI ƯU NHẤT

## 📋 MỤC LỤC
1. [Chuẩn bị](#chuẩn-bị)
2. [Bước 1: Tối ưu Database](#bước-1-tối-ưu-database)
3. [Bước 2: Setup MongoDB Atlas](#bước-2-setup-mongodb-atlas)
4. [Bước 3: Deploy Backend (Railway)](#bước-3-deploy-backend-railway)
5. [Bước 4: Deploy Frontend (Vercel)](#bước-4-deploy-frontend-vercel)
6. [Bước 5: Kiểm tra & Testing](#bước-5-kiểm-tra--testing)
7. [Bảo trì & Monitoring](#bảo-trì--monitoring)

---

## 🎯 CHUẨN BỊ

### **Checklist trước khi deploy:**
- ✅ Git đã cài (check: `git --version`)
- ✅ Node.js v18+ đã cài (check: `node --version`)
- ✅ MongoDB Compass đã cài
- ✅ Code đã push lên GitHub
- ✅ Tài khoản: GitHub, Railway, Vercel, MongoDB Atlas

### **Các file quan trọng đã có:**
- ✅ `railway.json` - Config cho Railway
- ✅ `backend/nixpacks.toml` - Build config
- ✅ `backend/package.json` - có engines Node.js
- ✅ `my_client/src/environments/` - Environment files
- ✅ `my_admin/src/environments/` - Environment files

---

## 🗄️ BƯỚC 1: TỐI ƯU DATABASE (QUAN TRỌNG)

### **1.1. Phân tích dung lượng:**

| Collection | Documents | Size | Tối ưu |
|-----------|-----------|------|--------|
| blogs | 75,000 | 861 MB | ⚠️ CẦN TỐI ƯU |
| benh | 1,700 | 33 MB | ✅ OK |
| products | 8,100 | 46 MB | ✅ OK |
| orders | 50 | 45 KB | ✅ OK |
| users | ? | ? | ✅ OK |

**Tổng:** ~1.1 GB → **CẦN GIẢM xuống <512MB** (Atlas Free)

### **1.2. Tối ưu collection Blogs:**

**Mở MongoDB Compass:**

1. Connect to: `mongodb://localhost:27017`
2. Database: `MediCare_database`
3. Collection: `blogs`
4. Click tab **"Aggregations"** hoặc Shell

**Chạy các lệnh sau:**

```javascript
// 1. Xóa field contentText (không cần thiết)
db.blogs.updateMany(
  {},
  { $unset: { contentText: "", content: "" } }
)

// 2. Chỉ giữ lại 15,000 bài mới nhất
// Tìm cutoff date
db.blogs.find({}).sort({publishedAt: -1}).limit(15000).skip(14999).toArray()
// Copy _id của bài thứ 15,000

// Xóa các bài cũ hơn
db.blogs.deleteMany({
  publishedAt: { $lt: ISODate("2023-01-01T00:00:00Z") } // Điều chỉnh date
})

// 3. Compact collection để giảm size
db.runCommand({ compact: "blogs", force: true })
```

**Kết quả mong đợi:** blogs giảm từ 861MB → ~150MB

### **1.3. Backup trước khi deploy:**

```powershell
# Export toàn bộ database
mongodump --uri="mongodb://localhost:27017/MediCare_database" --out="D:\medicare_backup_$(Get-Date -Format 'yyyyMMdd')"

# Nén backup
Compress-Archive -Path "D:\medicare_backup_*" -DestinationPath "D:\medicare_backup.zip"
```

---

## ☁️ BƯỚC 2: SETUP MONGODB ATLAS

### **2.1. Tạo tài khoản & Cluster:**

1. **Truy cập:** https://www.mongodb.com/cloud/atlas/register
2. **Sign up** bằng Google (nhanh nhất)
3. **Chọn plan:** FREE (M0 Sandbox)
4. **Cloud Provider:** AWS
5. **Region:** Singapore (ap-southeast-1)
6. **Cluster Name:** `medicare-cluster`
7. Click **"Create Cluster"** → Đợi 3-5 phút

### **2.2. Cấu hình Security:**

**Network Access:**
1. Sidebar → **"Network Access"**
2. **"Add IP Address"**
3. Chọn: **"Allow Access from Anywhere"**
4. IP: `0.0.0.0/0`
5. **"Confirm"**

**Database User:**
1. Sidebar → **"Database Access"**
2. **"Add New Database User"**
3. Authentication: **Password**
4. Username: `medicare_admin`
5. Password: `Medicare2025!` (hoặc tạo password mạnh)
6. Privileges: **"Read and write to any database"**
7. **"Add User"**

### **2.3. Lấy Connection String:**

1. Sidebar → **"Database"**
2. Click **"Connect"** trên cluster
3. **"Connect your application"**
4. Driver: Node.js 6.7 or later
5. Copy connection string:
   ```
   mongodb+srv://medicare_admin:<password>@medicare-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Thay `<password>`** bằng password thật:
   ```
   mongodb+srv://medicare_admin:Medicare2025!@medicare-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

⚠️ **LƯU CONNECTION STRING NÀY LẠI!**

### **2.4. Import dữ liệu:**

**Cách 1: Dùng mongorestore (Khuyên dùng - Nhanh nhất)**

```powershell
# Từ backup đã tạo
mongorestore --uri="mongodb+srv://medicare_admin:Medicare2025!@medicare-cluster.xxxxx.mongodb.net/" --db=MediCare_database "D:\medicare_backup_20251107\MediCare_database"
```

**Cách 2: Dùng MongoDB Compass (Dễ hơn)**

1. Mở MongoDB Compass
2. **"New Connection"**
3. Paste connection string Atlas
4. **"Connect"**
5. Tạo database: `MediCare_database`
6. Với mỗi collection:
   - Export từ local (JSON)
   - Import vào Atlas

**Kiểm tra:**
```javascript
// Trong Atlas MongoDB Shell
use MediCare_database
db.getCollectionNames()
db.products.countDocuments()  // Should return 8100
db.blogs.countDocuments()     // Should return ~15000
```

---

## 🚂 BƯỚC 3: DEPLOY BACKEND LÊN RAILWAY

### **3.1. Chuẩn bị code:**

**Kiểm tra các file:**

```powershell
# Kiểm tra file quan trọng tồn tại
Test-Path railway.json          # Should be True
Test-Path backend/package.json  # Should be True
Test-Path backend/nixpacks.toml # Should be True
```

**Commit & Push code:**

```powershell
git status
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### **3.2. Tạo project trên Railway:**

1. **Truy cập:** https://railway.app
2. **Login with GitHub**
3. Click **"New Project"**
4. Chọn **"Deploy from GitHub repo"**
5. Authorize GitHub (lần đầu)
6. Chọn repository: `MEDICARE`
7. Railway sẽ tự động detect và bắt đầu deploy

### **3.3. Cấu hình Service:**

**A. Set Root Directory:**

1. Click vào service vừa tạo
2. Tab **"Settings"**
3. Tìm mục **"Source"**
4. Click **"Add Root Directory"** (hoặc edit nếu đã có)
5. Nhập: `backend`
6. Railway tự động save

**B. Thêm Environment Variables:**

1. Tab **"Variables"**
2. Click **"+ New Variable"**, thêm các biến sau:

```env
NODE_ENV=production
PORT=8080
DB_NAME=MediCare_database
JWT_SECRET=medicare_secret_production_2025_change_this
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=*
MONGODB_URI=mongodb+srv://medicare_admin:Medicare2025!@medicare-cluster.xxxxx.mongodb.net/
```

⚠️ **QUAN TRỌNG:** Thay `MONGODB_URI` bằng connection string Atlas thật!

**C. Deploy:**

Railway sẽ tự động deploy sau khi thêm variables. Nếu không:
- Tab **"Deployments"** → Click **"Deploy"**

### **3.4. Kiểm tra logs:**

1. Tab **"Deployments"**
2. Click deployment mới nhất
3. Xem **Deploy Logs**

**Logs thành công:**
```
✅ Connected to MongoDB
✅ Database: MediCare_database
✅ Server is running on port 8080
📊 Collections: 20
🚀 MEDICARE Backend Server
```

### **3.5. Lấy Public URL:**

1. Tab **"Settings"**
2. Scroll xuống **"Networking"**
3. **"Generate Domain"** (nếu chưa có)
4. Copy URL (ví dụ: `https://medicare-production-70ae.up.railway.app`)

⚠️ **LƯU URL NÀY LẠI!** - Cần cho bước tiếp theo

---

## 🌐 BƯỚC 4: DEPLOY FRONTEND LÊN VERCEL

### **4.1. Cập nhật API URLs:**

**File 1:** `my_client/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://medicare-production-70ae.up.railway.app'
};
```

**File 2:** `my_admin/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://medicare-production-70ae.up.railway.app'
};
```

⚠️ **Thay URL bằng URL Railway thật của bạn!**

**Commit changes:**

```powershell
git add my_client/src/environments/environment.prod.ts
git add my_admin/src/environments/environment.prod.ts
git commit -m "Update production API URLs"
git push origin main
```

### **4.2. Deploy Client lên Vercel:**

1. **Truy cập:** https://vercel.com
2. **Sign Up with GitHub**
3. Click **"Add New Project"**
4. **Import** repository: `MEDICARE`
5. **Cấu hình:**

```
Project Name: medicare-client
Framework Preset: Other (hoặc Angular)
Root Directory: my_client
Build Command: npm install && npm run build
Output Directory: dist/my_client/browser
Install Command: npm install
```

6. **Environment Variables:** (Không cần, đã có trong code)

7. Click **"Deploy"**

8. Đợi 3-5 phút, deploy xong copy URL:
   ```
   https://medicare-client.vercel.app
   ```

### **4.3. Deploy Admin lên Vercel:**

1. Vào Vercel Dashboard
2. Click **"Add New Project"**
3. **Import** cùng repository: `MEDICARE`
4. **Cấu hình:**

```
Project Name: medicare-admin
Framework Preset: Other
Root Directory: my_admin
Build Command: npm install && npm run build
Output Directory: dist/my_admin/browser
Install Command: npm install
```

5. Click **"Deploy"**

6. Copy URL admin:
   ```
   https://medicare-admin.vercel.app
   ```

### **4.4. Cập nhật CORS:**

Quay lại Railway Backend:

1. Tab **"Variables"**
2. Edit biến `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://medicare-client.vercel.app,https://medicare-admin.vercel.app
   ```
3. Backend sẽ tự động redeploy

---

## ✅ BƯỚC 5: KIỂM TRA & TESTING

### **5.1. Test Backend:**

```powershell
# Test health endpoint
curl https://medicare-production-70ae.up.railway.app/api/health

# Test products endpoint
curl https://medicare-production-70ae.up.railway.app/api/products?page=1&limit=10
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": [...],
  "total": 8100
}
```

### **5.2. Test Client:**

1. Mở browser: `https://medicare-client.vercel.app`
2. Kiểm tra:
   - ✅ Homepage load được
   - ✅ Danh sách sản phẩm hiển thị
   - ✅ Search hoạt động
   - ✅ Chi tiết sản phẩm load được
   - ✅ Thêm vào giỏ hàng
   - ✅ Đăng nhập/đăng ký

### **5.3. Test Admin:**

1. Mở browser: `https://medicare-admin.vercel.app`
2. **Đăng nhập:**
   - Email: `thinh@medicare.vn`
   - Password: `1234567890`
3. Kiểm tra:
   - ✅ Dashboard hiển thị số liệu
   - ✅ Danh sách products
   - ✅ Danh sách orders
   - ✅ CRUD operations

### **5.4. Test Database Connection:**

Trong Railway Backend logs, kiểm tra:
```
✅ Connected to MongoDB
✅ Database indexes created
📊 Collections: 20
```

Không có lỗi:
```
❌ Cannot read properties of undefined (reading 'collection')
```

---

## 📊 BẢNG TỔNG KẾT

| Component | Platform | URL | Status | Cost |
|-----------|----------|-----|--------|------|
| **Backend** | Railway | `medicare-production-70ae.up.railway.app` | ✅ | FREE ($5 credit) |
| **Database** | MongoDB Atlas | (internal) | ✅ | FREE (M0) hoặc $10/tháng |
| **Client** | Vercel | `medicare-client.vercel.app` | ✅ | FREE |
| **Admin** | Vercel | `medicare-admin.vercel.app` | ✅ | FREE |

**Tổng chi phí:** FREE - $10/tháng (tùy size database)

---

## 🔧 BẢO TRÌ & MONITORING

### **Monitoring Backend:**

1. **Railway Dashboard:**
   - Tab "Metrics": CPU, Memory, Network usage
   - Tab "Deployments": Deployment history
   - Tab "Logs": Real-time logs

2. **Setup Alerts:**
   - Railway Settings → Notifications
   - Thêm email để nhận alerts khi service down

### **Monitoring Frontend:**

1. **Vercel Dashboard:**
   - Analytics: Page views, performance
   - Logs: Build logs, runtime logs
   - Deployments: History & rollback

### **Backup Strategy:**

**Database Backup (Weekly):**

```powershell
# Tạo script backup-mongodb.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "D:\backups\medicare_$date"

mongodump --uri="mongodb+srv://medicare_admin:Medicare2025!@medicare-cluster.xxxxx.mongodb.net/MediCare_database" --out="$backupPath"

# Nén và upload lên Google Drive hoặc OneDrive
Compress-Archive -Path $backupPath -DestinationPath "$backupPath.zip"
```

**Code Backup:**
- Đã có trên GitHub
- Tạo release tags: `v1.0.0`, `v1.1.0`...

---

## 🐛 XỬ LÝ SỰ CỐ THƯỜNG GẶP

### **Lỗi 1: Backend không kết nối được MongoDB**

**Triệu chứng:**
```
Error: connect ETIMEDOUT
```

**Giải pháp:**
1. Kiểm tra MongoDB Atlas Network Access
2. Đảm bảo IP `0.0.0.0/0` được whitelist
3. Kiểm tra `MONGODB_URI` đúng format

### **Lỗi 2: CORS error**

**Triệu chứng:**
```
Access to fetch at ... from origin ... has been blocked by CORS
```

**Giải pháp:**
1. Kiểm tra `ALLOWED_ORIGINS` trong Railway Variables
2. Phải có URL chính xác của Vercel
3. Không có dấu `/` cuối URL

### **Lỗi 3: 404 Not Found trên Frontend**

**Triệu chứng:**
- Refresh page → 404 error

**Giải pháp:**
- Vercel tự động config rewrites cho Angular
- Nếu vẫn lỗi, thêm file `vercel.json`:

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

### **Lỗi 4: Out of memory**

**Triệu chứng:**
```
JavaScript heap out of memory
```

**Giải pháp:**
- Railway: Upgrade plan (có thể cần $5-20/tháng)
- Tối ưu code: Giảm memory usage

---

## 📈 NÂNG CẤP SAU NÀY

### **Khi cần scale:**

1. **Database:**
   - Atlas M10 ($10/tháng): 10GB, 2GB RAM
   - Atlas M20 ($40/tháng): 20GB, 4GB RAM

2. **Backend:**
   - Railway Pro ($5/tháng): 8GB RAM, unlimited bandwidth
   - Railway Team ($20/tháng): Multiple services

3. **CDN:**
   - Cloudflare (FREE): Cache static assets
   - Setup custom domain

4. **Monitoring:**
   - Sentry.io (FREE tier): Error tracking
   - LogRocket: Session replay

---

## 🎯 CHECKLIST HOÀN TẤT

- [ ] MongoDB Atlas setup & data imported
- [ ] Backend deployed on Railway
- [ ] Backend URL working
- [ ] Client deployed on Vercel
- [ ] Admin deployed on Vercel
- [ ] CORS configured correctly
- [ ] All endpoints tested
- [ ] Login/Register working
- [ ] Products listing working
- [ ] Orders working
- [ ] Admin CRUD working
- [ ] Backup strategy set up
- [ ] Monitoring configured

---

## 📞 HỖ TRỢ

**Railway:** https://railway.app/help  
**Vercel:** https://vercel.com/support  
**MongoDB Atlas:** https://www.mongodb.com/cloud/atlas/support

---

**🎉 CHÚC MỪNG! Website đã online và sẵn sàng cho người dùng! 🎉**

---

**Tài liệu này được tạo:** 07/11/2025  
**Phiên bản:** 1.0  
**Tác giả:** AI Assistant

