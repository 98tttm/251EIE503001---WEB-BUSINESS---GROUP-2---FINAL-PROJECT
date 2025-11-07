# 📦 HƯỚNG DẪN DEPLOY TRANG WEB MEDICARE - WINDOWS SERVER

Hướng dẫn chi tiết để deploy toàn bộ hệ thống MediCare lên Windows Server.

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Chuẩn bị môi trường Windows](#chuẩn-bị-môi-trường-windows)
3. [Cài đặt MongoDB trên Windows](#cài-đặt-mongodb-trên-windows)
4. [Deploy Backend API trên Windows](#deploy-backend-api-trên-windows)
5. [Deploy Frontend Client](#deploy-frontend-client)
6. [Deploy Frontend Admin](#deploy-frontend-admin)
7. [Cấu hình IIS (Internet Information Services)](#cấu-hình-iis)
8. [Cấu hình SSL/HTTPS](#cấu-hình-sslhttps)
9. [Tự động khởi động với Windows Service](#tự-động-khởi-động)

---

## 🏗️ TỔNG QUAN HỆ THỐNG

Dự án MediCare bao gồm:

- **Backend API**: Node.js + Express.js (Port 3000)
- **Frontend Client**: Angular (Static files)
- **Frontend Admin**: Angular (Static files)
- **Database**: MongoDB
- **Web Server**: IIS (Internet Information Services)

---

## 🛠️ CHUẨN BỊ MÔI TRƯỜNG WINDOWS

### Yêu cầu hệ thống:

- **OS**: Windows Server 2016+ / Windows 10/11 Pro
- **Node.js**: v18.x hoặc v20.x
- **MongoDB**: v6.0+
- **IIS**: Windows Server hoặc cài đặt thêm trên Windows 10/11
- **PM2**: Process manager cho Node.js
- **Git**: Để clone/pull code

### Cài đặt các công cụ cần thiết:

#### 1. Cài đặt Node.js:

1. Tải Node.js từ: https://nodejs.org/
2. Chọn phiên bản LTS (v20.x)
3. Chạy installer và cài đặt
4. Kiểm tra:
   ```powershell
   node --version
   npm --version
   ```

#### 2. Cài đặt MongoDB:

1. Tải MongoDB Community Server từ: https://www.mongodb.com/try/download/community
2. Chạy installer, chọn "Complete" installation
3. Chọn "Install MongoDB as a Service"
4. Kiểm tra:
   ```powershell
   mongosh --version
   ```

#### 3. Cài đặt IIS (nếu chưa có):

**Trên Windows Server:**
- IIS đã được cài đặt sẵn

**Trên Windows 10/11:**
```powershell
# Mở PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationInit
Enable-WindowsOptionalFeature -Online -FeatureName IIS-URLRewriting
```

#### 4. Cài đặt PM2:

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

#### 5. Cài đặt Git:

1. Tải Git từ: https://git-scm.com/download/win
2. Chạy installer
3. Kiểm tra:
   ```powershell
   git --version
   ```

#### 6. Cài đặt URL Rewrite cho IIS:

1. Tải từ: https://www.iis.net/downloads/microsoft/url-rewrite
2. Chạy installer

---

## 🗄️ CÀI ĐẶT MONGODB TRÊN WINDOWS

### 1. Khởi động MongoDB Service:

```powershell
# Kiểm tra service
Get-Service MongoDB

# Khởi động nếu chưa chạy
Start-Service MongoDB

# Đặt tự động khởi động
Set-Service -Name MongoDB -StartupType Automatic
```

### 2. Kết nối MongoDB:

```powershell
mongosh
```

### 3. Tạo database và user (tùy chọn):

```javascript
// Trong mongosh
use MediCare_database

// Tạo user (nếu cần authentication)
db.createUser({
  user: "medicare_user",
  pwd: "your_secure_password",
  roles: [ { role: "readWrite", db: "MediCare_database" } ]
})
```

### 4. Import dữ liệu (nếu có):

```powershell
# Nếu có file backup
mongorestore --db MediCare_database "C:\path\to\backup\directory"

# Hoặc import từ file JSON
mongoimport --db MediCare_database --collection products --file products.json
```

---

## 🚀 DEPLOY BACKEND API TRÊN WINDOWS

### 1. Tạo thư mục cho ứng dụng:

```powershell
# Tạo thư mục
New-Item -ItemType Directory -Path "C:\www\medicare" -Force
New-Item -ItemType Directory -Path "C:\www\medicare\backend" -Force
New-Item -ItemType Directory -Path "C:\www\medicare\backend\logs" -Force
```

### 2. Upload code lên server:

```powershell
# Clone hoặc copy code vào C:\www\medicare\backend
# Hoặc sử dụng Git
cd C:\www\medicare
git clone <your-repo-url> .
```

### 3. Cài đặt dependencies:

```powershell
cd C:\www\medicare\backend
npm install --production
```

### 4. Tạo file `.env`:

Tạo file `C:\www\medicare\backend\.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
# Hoặc với authentication:
# MONGODB_URI=mongodb://medicare_user:password@localhost:27017/MediCare_database?authSource=MediCare_database
DB_NAME=MediCare_database

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost,https://yourdomain.com,https://admin.yourdomain.com

# Email Configuration (nếu sử dụng)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 5. Khởi tạo database:

```powershell
cd C:\www\medicare\backend
npm run init-db
```

### 6. Tạo admin user (nếu chưa có):

```powershell
cd C:\www\medicare\backend
node scripts\create-admin.js
```

### 7. Cấu hình PM2:

File `ecosystem.config.js` đã có sẵn trong backend folder.

### 8. Khởi động với PM2:

```powershell
cd C:\www\medicare\backend
pm2 start ecosystem.config.js
pm2 save
pm2-startup install  # Tạo Windows Service
```

### 9. Kiểm tra:

```powershell
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs medicare-backend

# Kiểm tra API
Invoke-WebRequest -Uri http://localhost:3000/api/products
```

---

## 🎨 DEPLOY FRONTEND CLIENT

### 1. Build production:

```powershell
cd C:\www\medicare\my_client

# Cài đặt dependencies
npm install

# Build production
npm run build

# Output sẽ ở: my_client\dist\my_client\browser\
```

### 2. Copy files lên thư mục web:

```powershell
# Tạo thư mục
New-Item -ItemType Directory -Path "C:\www\medicare\client" -Force

# Copy files
Copy-Item -Path "dist\my_client\browser\*" -Destination "C:\www\medicare\client\" -Recurse -Force
```

---

## 👨‍💼 DEPLOY FRONTEND ADMIN

### 1. Build production:

```powershell
cd C:\www\medicare\my_admin

# Cài đặt dependencies
npm install

# Build production
npm run build

# Output sẽ ở: my_admin\dist\my_admin\browser\
```

### 2. Copy files lên thư mục web:

```powershell
# Tạo thư mục
New-Item -ItemType Directory -Path "C:\www\medicare\admin" -Force

# Copy files
Copy-Item -Path "dist\my_admin\browser\*" -Destination "C:\www\medicare\admin\" -Recurse -Force
```

---

## ⚙️ CẤU HÌNH IIS (INTERNET INFORMATION SERVICES)

### 1. Tạo Website cho Client:

1. Mở **IIS Manager** (inetmgr)
2. Right-click **Sites** → **Add Website**
3. Cấu hình:
   - **Site name**: `MediCare-Client`
   - **Application pool**: Tạo mới `MediCare-Client-Pool` (.NET CLR Version: No Managed Code)
   - **Physical path**: `C:\www\medicare\client`
   - **Binding**: 
     - Type: `http`
     - IP address: `All Unassigned`
     - Port: `80`
     - Host name: `yourdomain.com` (hoặc để trống)

### 2. Tạo Website cho Admin:

1. Right-click **Sites** → **Add Website**
2. Cấu hình:
   - **Site name**: `MediCare-Admin`
   - **Application pool**: Tạo mới `MediCare-Admin-Pool` (.NET CLR Version: No Managed Code)
   - **Physical path**: `C:\www\medicare\admin`
   - **Binding**: 
     - Type: `http`
     - IP address: `All Unassigned`
     - Port: `80`
     - Host name: `admin.yourdomain.com`

### 3. Cấu hình URL Rewrite cho Angular:

#### Cho Client Website:

1. Chọn website `MediCare-Client`
2. Double-click **URL Rewrite**
3. Click **Add Rule** → **Inbound Rules** → **Blank Rule**
4. Cấu hình:
   - **Name**: `Angular Routes`
   - **Requested URL**: Matches the Pattern
   - **Using**: Regular Expressions
   - **Pattern**: `.*`
   - **Conditions**: 
     - Logical grouping: Match All
     - Condition input: `{REQUEST_FILENAME}`
     - Check if input string: Is not a file
     - Condition input: `{REQUEST_FILENAME}`
     - Check if input string: Is not a directory
   - **Action type**: Rewrite
   - **Rewrite URL**: `/index.html`

#### Cho Admin Website:

Làm tương tự như Client.

### 4. Cấu hình Reverse Proxy cho API:

#### Cài đặt Application Request Routing (ARR):

1. Tải ARR từ: https://www.iis.net/downloads/microsoft/application-request-routing
2. Cài đặt

#### Cấu hình Proxy:

1. Chọn website `MediCare-Client`
2. Double-click **URL Rewrite**
3. Click **Add Rule** → **Inbound Rules** → **Reverse Proxy**
4. Cấu hình:
   - **Inbound rule**: `api/(.*)`
   - **Rewrite URL**: `http://localhost:3000/api/{R:1}`
   - Check **Append query string**

Làm tương tự cho Admin website.

### 5. Cấu hình Web.config (Tùy chọn):

Tạo file `C:\www\medicare\client\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

Tạo tương tự cho Admin.

### 6. Cấu hình Gzip Compression:

1. Chọn website
2. Double-click **Compression**
3. Enable **Enable dynamic content compression**
4. Enable **Enable static content compression**

---

## 🔒 CẤU HÌNH SSL/HTTPS

### 1. Cài đặt SSL Certificate:

#### Option 1: Sử dụng Let's Encrypt với win-acme:

1. Tải win-acme từ: https://www.win-acme.com/
2. Chạy `wacs.exe`
3. Chọn option để tạo certificate
4. Chọn website trong IIS
5. win-acme sẽ tự động cấu hình

#### Option 2: Sử dụng Certificate từ CA:

1. Import certificate vào Windows Certificate Store
2. Trong IIS, chọn website → **Bindings** → **Add**
3. Chọn:
   - Type: `https`
   - SSL certificate: Chọn certificate của bạn
   - Port: `443`

### 2. Redirect HTTP to HTTPS:

1. Chọn website
2. Double-click **URL Rewrite**
3. Click **Add Rule** → **Inbound Rules** → **Blank Rule**
4. Cấu hình:
   - **Name**: `HTTP to HTTPS Redirect`
   - **Requested URL**: Matches the Pattern
   - **Pattern**: `(.*)`
   - **Conditions**: 
     - Condition input: `{HTTPS}`
     - Check if input string: Matches the Pattern
     - Pattern: `^OFF$`
   - **Action type**: Redirect
   - **Redirect URL**: `https://{HTTP_HOST}/{R:1}`
   - **Redirect type**: Permanent (301)

---

## 🔄 CẬP NHẬT API URL TRONG FRONTEND

### 1. Cập nhật Client:

Tìm và thay thế tất cả `http://localhost:3000` thành domain của bạn:

```powershell
cd C:\www\medicare\my_client\src

# Tìm tất cả files có localhost:3000
Select-String -Path "app\**\*.ts" -Pattern "localhost:3000"

# Thay thế (PowerShell)
Get-ChildItem -Path "app" -Recurse -Filter "*.ts" | ForEach-Object {
    (Get-Content $_.FullName) -replace 'http://localhost:3000', 'https://yourdomain.com' | Set-Content $_.FullName
}
```

Hoặc tạo file environment (xem DEPLOYMENT_GUIDE.md).

### 2. Cập nhật Admin:

Tương tự như Client.

---

## 🔄 TỰ ĐỘNG KHỞI ĐỘNG VỚI WINDOWS SERVICE

### 1. PM2 Windows Service:

```powershell
# Đã chạy ở bước deploy backend
pm2-startup install

# Kiểm tra
pm2 save
```

### 2. MongoDB Service:

MongoDB đã tự động cài đặt như Windows Service.

### 3. IIS Service:

IIS tự động khởi động với Windows.

---

## ✅ KIỂM TRA VÀ BẢO TRÌ

### 1. Kiểm tra services:

```powershell
# Kiểm tra MongoDB
Get-Service MongoDB

# Kiểm tra PM2
pm2 status
pm2 logs medicare-backend

# Kiểm tra IIS
Get-Service W3SVC
```

### 2. Monitoring với PM2:

```powershell
# Xem real-time logs
pm2 logs medicare-backend

# Xem thông tin chi tiết
pm2 show medicare-backend

# Restart app
pm2 restart medicare-backend

# Reload app
pm2 reload medicare-backend

# Stop app
pm2 stop medicare-backend
```

### 3. Backup MongoDB:

Tạo file `C:\scripts\backup-mongodb.ps1`:

```powershell
$BackupDir = "C:\backups\mongodb"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$BackupDir\backup_$Date"

New-Item -ItemType Directory -Path $BackupDir -Force

mongodump --db MediCare_database --out $BackupPath

# Compress backup
Compress-Archive -Path $BackupPath -DestinationPath "$BackupPath.zip"
Remove-Item -Path $BackupPath -Recurse -Force

# Xóa backups cũ hơn 7 ngày
Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-7)
} | Remove-Item
```

Tạo Scheduled Task để chạy backup hàng ngày.

### 4. Cập nhật code:

```powershell
cd C:\www\medicare

# Pull code mới
git pull origin main

# Backend: Restart PM2
cd backend
npm install --production
pm2 restart medicare-backend

# Frontend: Rebuild và copy
cd ..\my_client
npm install
npm run build
Copy-Item -Path "dist\my_client\browser\*" -Destination "C:\www\medicare\client\" -Recurse -Force

cd ..\my_admin
npm install
npm run build
Copy-Item -Path "dist\my_admin\browser\*" -Destination "C:\www\medicare\admin\" -Recurse -Force
```

---

## 🚨 TROUBLESHOOTING

### Backend không khởi động:

```powershell
# Kiểm tra logs
pm2 logs medicare-backend --lines 100

# Kiểm tra port đã được sử dụng chưa
netstat -ano | findstr :3000

# Kiểm tra MongoDB connection
mongosh "mongodb://localhost:27017/MediCare_database"
```

### Frontend không load:

```powershell
# Kiểm tra IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC*\*.log" -Tail 50

# Kiểm tra permissions
icacls "C:\www\medicare\client" /grant "IIS_IUSRS:(OI)(CI)F"
icacls "C:\www\medicare\admin" /grant "IIS_IUSRS:(OI)(CI)F"

# Kiểm tra file index.html có tồn tại
Test-Path "C:\www\medicare\client\index.html"
```

### API không hoạt động:

```powershell
# Test API trực tiếp
Invoke-WebRequest -Uri http://localhost:3000/api/products

# Kiểm tra CORS settings trong backend
# Kiểm tra ALLOWED_ORIGINS trong .env
```

### SSL không hoạt động:

```powershell
# Kiểm tra certificate
Get-ChildItem Cert:\LocalMachine\My

# Kiểm tra binding trong IIS
```

---

## 📝 CHECKLIST DEPLOY

- [ ] Cài đặt Node.js
- [ ] Cài đặt MongoDB
- [ ] Cài đặt IIS và URL Rewrite
- [ ] Cài đặt PM2
- [ ] Cấu hình MongoDB và tạo database
- [ ] Upload và cài đặt Backend
- [ ] Tạo file .env cho Backend
- [ ] Khởi tạo database với `npm run init-db`
- [ ] Tạo admin user
- [ ] Khởi động Backend với PM2
- [ ] Cấu hình PM2 Windows Service
- [ ] Build Frontend Client
- [ ] Copy Client files lên server
- [ ] Build Frontend Admin
- [ ] Copy Admin files lên server
- [ ] Tạo Website trong IIS cho Client
- [ ] Tạo Website trong IIS cho Admin
- [ ] Cấu hình URL Rewrite cho Angular
- [ ] Cấu hình Reverse Proxy cho API
- [ ] Cài đặt SSL certificate
- [ ] Cập nhật API URLs trong Frontend
- [ ] Test tất cả chức năng
- [ ] Cấu hình backup MongoDB
- [ ] Cấu hình Scheduled Tasks

---

## 🔗 LIÊN KẾT HỮU ÍCH

- **IIS Documentation**: https://docs.microsoft.com/en-us/iis/
- **PM2 Windows**: https://pm2.keymetrics.io/docs/usage/startup/
- **MongoDB Windows**: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
- **win-acme**: https://www.win-acme.com/

---

**Chúc bạn deploy thành công trên Windows Server! 🎉**

