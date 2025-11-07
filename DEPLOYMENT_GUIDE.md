# 📦 HƯỚNG DẪN DEPLOY TRANG WEB MEDICARE

Hướng dẫn chi tiết để deploy toàn bộ hệ thống MediCare lên server production.

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Chuẩn bị môi trường](#chuẩn-bị-môi-trường)
3. [Deploy MongoDB](#deploy-mongodb)
4. [Deploy Backend API](#deploy-backend-api)
5. [Deploy Frontend Client](#deploy-frontend-client)
6. [Deploy Frontend Admin](#deploy-frontend-admin)
7. [Cấu hình Nginx](#cấu-hình-nginx)
8. [Cấu hình SSL/HTTPS](#cấu-hình-sslhttps)
9. [Kiểm tra và bảo trì](#kiểm-tra-và-bảo-trì)

---

## 🏗️ TỔNG QUAN HỆ THỐNG

Dự án MediCare bao gồm:

- **Backend API**: Node.js + Express.js (Port 3000)
- **Frontend Client**: Angular (Port 4200 - dev, static files - production)
- **Frontend Admin**: Angular (Port 4201 - dev, static files - production)
- **Database**: MongoDB

### Cấu trúc thư mục:
```
MEDICARE_FINAL/
├── backend/          # Backend API Server
├── my_client/        # Frontend Client (User)
└── my_admin/         # Frontend Admin (Admin Panel)
```

---

## 🛠️ CHUẨN BỊ MÔI TRƯỜNG

### Yêu cầu hệ thống:

- **OS**: Ubuntu 20.04+ / CentOS 7+ / Windows Server
- **Node.js**: v18.x hoặc v20.x
- **MongoDB**: v6.0+
- **Nginx**: v1.18+
- **PM2**: Process manager cho Node.js
- **Git**: Để clone/pull code

### Cài đặt các công cụ cần thiết:

#### Trên Ubuntu/Debian:
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js (sử dụng NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Cài đặt Nginx
sudo apt install -y nginx

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt Git
sudo apt install -y git

# Cài đặt Certbot (cho SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### Trên CentOS/RHEL:
```bash
# Cập nhật hệ thống
sudo yum update -y

# Cài đặt Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Cài đặt MongoDB
sudo yum install -y mongodb-org

# Cài đặt Nginx
sudo yum install -y nginx

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt Git
sudo yum install -y git

# Cài đặt Certbot
sudo yum install -y certbot python3-certbot-nginx
```

---

## 🗄️ DEPLOY MONGODB

### 1. Khởi động MongoDB:

```bash
# Khởi động MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Kiểm tra trạng thái
sudo systemctl status mongod
```

### 2. Cấu hình MongoDB (tùy chọn):

Chỉnh sửa file cấu hình: `/etc/mongod.conf`

```yaml
# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Chỉ cho phép localhost, hoặc 0.0.0.0 cho remote

# Security (khuyến nghị cho production)
security:
  authorization: enabled

# Storage
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
```

### 3. Tạo user admin (nếu cần):

```bash
# Kết nối MongoDB
mongosh

# Tạo admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Tạo user cho database MediCare
use MediCare_database
db.createUser({
  user: "medicare_user",
  pwd: "your_secure_password",
  roles: [ { role: "readWrite", db: "MediCare_database" } ]
})
```

### 4. Import dữ liệu (nếu có):

```bash
# Nếu có file backup
mongorestore --db MediCare_database /path/to/backup/directory

# Hoặc import từ file JSON
mongoimport --db MediCare_database --collection products --file products.json
```

---

## 🚀 DEPLOY BACKEND API

### 1. Upload code lên server:

```bash
# Tạo thư mục cho ứng dụng
sudo mkdir -p /var/www/medicare
sudo chown -R $USER:$USER /var/www/medicare

# Clone hoặc upload code
cd /var/www/medicare
git clone <your-repo-url> .  # Hoặc upload qua FTP/SFTP
# Hoặc
scp -r backend/ user@server:/var/www/medicare/
```

### 2. Cài đặt dependencies:

```bash
cd /var/www/medicare/backend
npm install --production
```

### 3. Tạo file `.env`:

```bash
cd /var/www/medicare/backend
nano .env
```

Nội dung file `.env`:
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
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4201,https://yourdomain.com,https://admin.yourdomain.com

# Email Configuration (nếu sử dụng)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Admin Default Credentials (tạo admin đầu tiên)
ADMIN_EMAIL=admin@medicare.com
ADMIN_PASSWORD=your_secure_password
```

### 4. Khởi tạo database:

```bash
cd /var/www/medicare/backend
npm run init-db
```

### 5. Tạo admin user (nếu chưa có):

```bash
cd /var/www/medicare/backend
node scripts/create-admin.js
```

### 6. Cấu hình PM2:

Tạo file `ecosystem.config.js` trong thư mục backend:

```javascript
module.exports = {
  apps: [{
    name: 'medicare-backend',
    script: './server.js',
    instances: 2, // Số instance (hoặc 'max' để dùng tất cả CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 7. Tạo thư mục logs:

```bash
mkdir -p /var/www/medicare/backend/logs
```

### 8. Khởi động với PM2:

```bash
cd /var/www/medicare/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Tạo startup script để tự động khởi động khi server reboot
```

### 9. Kiểm tra:

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs medicare-backend

# Kiểm tra API
curl http://localhost:3000/api/health
```

---

## 🎨 DEPLOY FRONTEND CLIENT

### 1. Build production:

```bash
cd /var/www/medicare/my_client

# Cài đặt dependencies
npm install

# Build production
npm run build

# Output sẽ ở: my_client/dist/my_client/browser/
```

### 2. Cấu hình Angular cho production:

Kiểm tra file `angular.json` và đảm bảo:
- `outputPath`: `dist/my_client/browser`
- `baseHref`: `/` (hoặc domain của bạn)

### 3. Upload files lên server:

```bash
# Copy files build lên thư mục web
sudo cp -r /var/www/medicare/my_client/dist/my_client/browser/* /var/www/medicare/client/

# Hoặc nếu build trên server
sudo mkdir -p /var/www/medicare/client
sudo cp -r dist/my_client/browser/* /var/www/medicare/client/
```

### 4. Cấu hình Nginx (xem phần Nginx bên dưới)

---

## 👨‍💼 DEPLOY FRONTEND ADMIN

### 1. Build production:

```bash
cd /var/www/medicare/my_admin

# Cài đặt dependencies
npm install

# Build production
npm run build

# Output sẽ ở: my_admin/dist/my_admin/browser/
```

### 2. Upload files lên server:

```bash
# Copy files build lên thư mục web
sudo mkdir -p /var/www/medicare/admin
sudo cp -r /var/www/medicare/my_admin/dist/my_admin/browser/* /var/www/medicare/admin/
```

### 3. Cấu hình Nginx (xem phần Nginx bên dưới)

---

## ⚙️ CẤU HÌNH NGINX

### 1. Tạo file cấu hình cho Client:

```bash
sudo nano /etc/nginx/sites-available/medicare-client
```

Nội dung:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/medicare/client;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Angular routing - tất cả requests đều trả về index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Upload files
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /index.html;
}
```

### 2. Tạo file cấu hình cho Admin:

```bash
sudo nano /etc/nginx/sites-available/medicare-admin
```

Nội dung:
```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /var/www/medicare/admin;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Error pages
    error_page 404 /index.html;
}
```

### 3. Kích hoạt sites:

```bash
# Tạo symbolic links
sudo ln -s /etc/nginx/sites-available/medicare-client /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/medicare-admin /etc/nginx/sites-enabled/

# Xóa default site (nếu có)
sudo rm /etc/nginx/sites-enabled/default

# Test cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Cấu hình firewall:

```bash
# Cho phép HTTP và HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 🔒 CẤU HÌNH SSL/HTTPS

### 1. Cài đặt SSL với Let's Encrypt:

```bash
# Lấy SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com

# Hoặc từng domain riêng
sudo certbot --nginx -d yourdomain.com
sudo certbot --nginx -d admin.yourdomain.com
```

### 2. Auto-renewal:

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot tự động tạo cron job để renew
```

### 3. Cập nhật Nginx config sau khi có SSL:

Nginx sẽ tự động cập nhật config để redirect HTTP → HTTPS.

---

## 🔄 CẬP NHẬT API URL TRONG FRONTEND

### 1. Cập nhật Client:

Tìm và thay thế tất cả `http://localhost:3000` thành domain của bạn:

```bash
cd /var/www/medicare/my_client/src

# Tìm tất cả files có localhost:3000
grep -r "localhost:3000" .

# Thay thế (ví dụ)
sed -i 's|http://localhost:3000|https://yourdomain.com|g' app/**/*.ts
```

Hoặc tạo file environment:

**`my_client/src/environments/environment.prod.ts`:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com/api'
};
```

**`my_client/src/environments/environment.ts`:**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

Sau đó sử dụng `environment.apiUrl` trong code.

### 2. Cập nhật Admin:

Tương tự như Client.

---

## ✅ KIỂM TRA VÀ BẢO TRÌ

### 1. Kiểm tra services:

```bash
# Kiểm tra MongoDB
sudo systemctl status mongod

# Kiểm tra PM2
pm2 status
pm2 logs medicare-backend

# Kiểm tra Nginx
sudo systemctl status nginx
sudo nginx -t

# Kiểm tra ports
sudo netstat -tulpn | grep -E ':(80|443|3000|27017)'
```

### 2. Monitoring với PM2:

```bash
# Xem real-time logs
pm2 logs medicare-backend

# Xem thông tin chi tiết
pm2 show medicare-backend

# Restart app
pm2 restart medicare-backend

# Reload app (zero downtime)
pm2 reload medicare-backend

# Stop app
pm2 stop medicare-backend

# Xóa app khỏi PM2
pm2 delete medicare-backend
```

### 3. Backup MongoDB:

```bash
# Tạo backup script
sudo nano /usr/local/bin/backup-mongodb.sh
```

Nội dung:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --db MediCare_database --out $BACKUP_DIR/backup_$DATE
# Xóa backups cũ hơn 7 ngày
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

```bash
# Cấp quyền thực thi
sudo chmod +x /usr/local/bin/backup-mongodb.sh

# Thêm vào crontab (chạy mỗi ngày lúc 2h sáng)
sudo crontab -e
# Thêm dòng:
0 2 * * * /usr/local/bin/backup-mongodb.sh
```

### 4. Log rotation:

```bash
# Cấu hình log rotation cho PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 5. Cập nhật code:

```bash
# Pull code mới
cd /var/www/medicare
git pull origin main

# Backend: Restart PM2
cd backend
npm install --production
pm2 restart medicare-backend

# Frontend: Rebuild và copy
cd ../my_client
npm install
npm run build
sudo cp -r dist/my_client/browser/* /var/www/medicare/client/

cd ../my_admin
npm install
npm run build
sudo cp -r dist/my_admin/browser/* /var/www/medicare/admin/
```

---

## 🚨 TROUBLESHOOTING

### Backend không khởi động:

```bash
# Kiểm tra logs
pm2 logs medicare-backend --lines 100

# Kiểm tra port đã được sử dụng chưa
sudo lsof -i :3000

# Kiểm tra MongoDB connection
mongosh "mongodb://localhost:27017/MediCare_database"
```

### Frontend không load:

```bash
# Kiểm tra Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Kiểm tra permissions
sudo chown -R www-data:www-data /var/www/medicare/client
sudo chown -R www-data:www-data /var/www/medicare/admin

# Kiểm tra file index.html có tồn tại
ls -la /var/www/medicare/client/index.html
```

### API không hoạt động:

```bash
# Test API trực tiếp
curl http://localhost:3000/api/products

# Kiểm tra CORS settings trong backend
# Kiểm tra ALLOWED_ORIGINS trong .env
```

### SSL không hoạt động:

```bash
# Kiểm tra certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Kiểm tra Nginx config
sudo nginx -t
```

---

## 📝 CHECKLIST DEPLOY

- [ ] Cài đặt Node.js, MongoDB, Nginx
- [ ] Cài đặt PM2
- [ ] Cấu hình MongoDB và tạo database
- [ ] Upload và cài đặt Backend
- [ ] Tạo file .env cho Backend
- [ ] Khởi tạo database với `npm run init-db`
- [ ] Tạo admin user
- [ ] Khởi động Backend với PM2
- [ ] Build Frontend Client
- [ ] Upload Client files lên server
- [ ] Build Frontend Admin
- [ ] Upload Admin files lên server
- [ ] Cấu hình Nginx cho Client
- [ ] Cấu hình Nginx cho Admin
- [ ] Cài đặt SSL certificate
- [ ] Cập nhật API URLs trong Frontend
- [ ] Test tất cả chức năng
- [ ] Cấu hình backup MongoDB
- [ ] Cấu hình log rotation
- [ ] Cấu hình firewall

---

## 🔗 LIÊN KẾT HỮU ÍCH

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Let's Encrypt**: https://letsencrypt.org/
- **Angular Deployment**: https://angular.io/guide/deployment

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề trong quá trình deploy, kiểm tra:
1. Logs của PM2: `pm2 logs`
2. Logs của Nginx: `/var/log/nginx/error.log`
3. Logs của MongoDB: `/var/log/mongodb/mongod.log`
4. Network connectivity: `ping`, `curl`, `telnet`

---

**Chúc bạn deploy thành công! 🎉**

