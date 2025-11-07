# 🚀 QUICK DEPLOY GUIDE - MEDICARE

Hướng dẫn deploy nhanh cho người mới bắt đầu.

## 📋 YÊU CẦU

- Server Ubuntu 20.04+ với quyền root/sudo
- Domain name đã trỏ về IP server
- Kiến thức cơ bản về Linux terminal

---

## ⚡ DEPLOY NHANH (5 BƯỚC)

### Bước 1: Cài đặt môi trường

```bash
# Chạy script cài đặt tự động
curl -fsSL https://raw.githubusercontent.com/nodesource/distributions/master/deb/setup_20.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs nginx mongodb-org git
sudo npm install -g pm2
```

### Bước 2: Upload code lên server

```bash
# Tạo thư mục
sudo mkdir -p /var/www/medicare
sudo chown -R $USER:$USER /var/www/medicare

# Upload code (qua Git, FTP, hoặc SCP)
cd /var/www/medicare
# git clone <your-repo> .
# hoặc upload qua FTP/SFTP
```

### Bước 3: Cấu hình Backend

```bash
cd /var/www/medicare/backend

# Cài đặt dependencies
npm install --production

# Tạo file .env
nano .env
# (Xem nội dung trong DEPLOYMENT_GUIDE.md)

# Khởi tạo database
npm run init-db

# Khởi động với PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Bước 4: Build và Deploy Frontend

```bash
# Build Client
cd /var/www/medicare/my_client
npm install
npm run build
sudo mkdir -p /var/www/medicare/client
sudo cp -r dist/my_client/browser/* /var/www/medicare/client/

# Build Admin
cd /var/www/medicare/my_admin
npm install
npm run build
sudo mkdir -p /var/www/medicare/admin
sudo cp -r dist/my_admin/browser/* /var/www/medicare/admin/

# Cấp quyền
sudo chown -R www-data:www-data /var/www/medicare/client
sudo chown -R www-data:www-data /var/www/medicare/admin
```

### Bước 5: Cấu hình Nginx và SSL

```bash
# Copy config files từ DEPLOYMENT_GUIDE.md vào:
sudo nano /etc/nginx/sites-available/medicare-client
sudo nano /etc/nginx/sites-available/medicare-admin

# Kích hoạt
sudo ln -s /etc/nginx/sites-available/medicare-client /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/medicare-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Cài SSL
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com
```

---

## 🔄 CẬP NHẬT CODE

Sử dụng script tự động:

```bash
cd /var/www/medicare

# Cấp quyền thực thi
chmod +x deploy.sh scripts/*.sh

# Deploy tất cả
./deploy.sh all

# Hoặc từng phần
./deploy.sh backend
./deploy.sh client
./deploy.sh admin
```

---

## 📝 FILE .ENV MẪU

Tạo file `/var/www/medicare/backend/.env`:

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

```bash
# Backend
pm2 status
curl http://localhost:3000/api/products

# Frontend
curl http://localhost
curl http://localhost/admin

# MongoDB
mongosh
use MediCare_database
db.products.countDocuments()
```

---

## 🆘 SỬA LỖI NHANH

```bash
# Backend không chạy
pm2 logs medicare-backend
pm2 restart medicare-backend

# Frontend không load
sudo tail -f /var/log/nginx/error.log
sudo systemctl reload nginx

# MongoDB không kết nối
sudo systemctl status mongod
sudo systemctl restart mongod
```

---

Xem file `DEPLOYMENT_GUIDE.md` để biết chi tiết đầy đủ!

