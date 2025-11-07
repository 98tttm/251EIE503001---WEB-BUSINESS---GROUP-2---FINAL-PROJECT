# 🚀 QUICK DEPLOY GUIDE - MEDICARE (WINDOWS)

Hướng dẫn deploy nhanh cho Windows Server.

## 📋 YÊU CẦU

- Windows Server 2016+ hoặc Windows 10/11 Pro
- Quyền Administrator
- Domain name đã trỏ về IP server
- Kiến thức cơ bản về PowerShell

---

## ⚡ DEPLOY NHANH (5 BƯỚC)

### Bước 1: Cài đặt môi trường

1. **Cài đặt Node.js:**
   - Tải từ: https://nodejs.org/
   - Chọn LTS version (v20.x)
   - Chạy installer

2. **Cài đặt MongoDB:**
   - Tải từ: https://www.mongodb.com/try/download/community
   - Chọn "Complete" installation
   - Chọn "Install MongoDB as a Service"

3. **Cài đặt IIS (nếu chưa có):**
   ```powershell
   # Mở PowerShell as Administrator
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
   ```

4. **Cài đặt PM2:**
   ```powershell
   npm install -g pm2 pm2-windows-startup
   ```

5. **Cài đặt URL Rewrite:**
   - Tải từ: https://www.iis.net/downloads/microsoft/url-rewrite
   - Chạy installer

### Bước 2: Upload code lên server

```powershell
# Tạo thư mục
New-Item -ItemType Directory -Path "C:\www\medicare" -Force

# Upload code (qua Git, FTP, hoặc copy)
cd C:\www\medicare
# git clone <your-repo> .
# hoặc copy code vào đây
```

### Bước 3: Cấu hình Backend

```powershell
cd C:\www\medicare\backend

# Cài đặt dependencies
npm install --production

# Tạo file .env
notepad .env
# (Xem nội dung trong DEPLOYMENT_GUIDE_WINDOWS.md)

# Khởi tạo database
npm run init-db

# Khởi động với PM2
pm2 start ecosystem.config.js
pm2 save
pm2-startup install
```

### Bước 4: Build và Deploy Frontend

```powershell
# Build Client
cd C:\www\medicare\my_client
npm install
npm run build
New-Item -ItemType Directory -Path "C:\www\medicare\client" -Force
Copy-Item -Path "dist\my_client\browser\*" -Destination "C:\www\medicare\client\" -Recurse -Force

# Build Admin
cd C:\www\medicare\my_admin
npm install
npm run build
New-Item -ItemType Directory -Path "C:\www\medicare\admin" -Force
Copy-Item -Path "dist\my_admin\browser\*" -Destination "C:\www\medicare\admin\" -Recurse -Force
```

### Bước 5: Cấu hình IIS

1. **Mở IIS Manager** (inetmgr)

2. **Tạo Website cho Client:**
   - Right-click **Sites** → **Add Website**
   - Site name: `MediCare-Client`
   - Physical path: `C:\www\medicare\client`
   - Port: `80`
   - Host name: `yourdomain.com`

3. **Tạo Website cho Admin:**
   - Right-click **Sites** → **Add Website**
   - Site name: `MediCare-Admin`
   - Physical path: `C:\www\medicare\admin`
   - Port: `80`
   - Host name: `admin.yourdomain.com`

4. **Cấu hình URL Rewrite:**
   - Chọn website → **URL Rewrite** → **Add Rule**
   - Chọn **Blank Rule**
   - Pattern: `.*`
   - Conditions: 
     - `{REQUEST_FILENAME}` is not a file
     - `{REQUEST_FILENAME}` is not a directory
   - Action: Rewrite to `/index.html`

5. **Cấu hình Reverse Proxy cho API:**
   - Cài đặt ARR: https://www.iis.net/downloads/microsoft/application-request-routing
   - Chọn website → **URL Rewrite** → **Add Rule** → **Reverse Proxy**
   - Inbound rule: `api/(.*)`
   - Rewrite URL: `http://localhost:3000/api/{R:1}`

6. **Cài đặt SSL:**
   - Sử dụng win-acme: https://www.win-acme.com/
   - Hoặc import certificate từ CA

---

## 🔄 CẬP NHẬT CODE

Sử dụng script tự động:

```powershell
cd C:\www\medicare

# Deploy tất cả
.\deploy.ps1 all

# Hoặc từng phần
.\deploy.ps1 backend
.\deploy.ps1 client
.\deploy.ps1 admin
```

---

## 📝 FILE .ENV MẪU

Tạo file `C:\www\medicare\backend\.env`:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=MediCare_database
JWT_SECRET=your_super_secret_key_change_this
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

---

## ✅ KIỂM TRA

```powershell
# Backend
pm2 status
Invoke-WebRequest -Uri http://localhost:3000/api/products

# Frontend
Start-Process http://localhost
Start-Process http://localhost/admin

# MongoDB
mongosh
use MediCare_database
db.products.countDocuments()
```

---

## 🆘 SỬA LỖI NHANH

```powershell
# Backend không chạy
pm2 logs medicare-backend
pm2 restart medicare-backend

# Frontend không load
# Kiểm tra IIS Manager → Sites → View logs

# MongoDB không kết nối
Get-Service MongoDB
Start-Service MongoDB
```

---

Xem file `DEPLOYMENT_GUIDE_WINDOWS.md` để biết chi tiết đầy đủ!

