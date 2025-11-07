# CÁC BƯỚC DEPLOY ĐƠN GIẢN NHẤT

## ✅ CHUẨN BỊ (Đã xong một phần)

Tôi đã tạo sẵn:
- ✅ File `railway.json` và `nixpacks.toml` cho Railway
- ✅ Folder `environments` và file config cho client và admin
- ✅ Đã update một số service files để dùng environment

## 🔧 BƯỚC 1: FIX CÁC URL CÒN LẠI

### Cách 1: Dùng VS Code (Dễ nhất - Khuyên dùng)

1. Mở VS Code
2. Nhấn `Ctrl + Shift + H` (Find and Replace)
3. Thực hiện 2 lần replace:

**Replace lần 1:**
- Find: `http://localhost:3000/api`
- Replace with: `${environment.apiUrl}/api`
- Click icon "Replace All" (hoặc Ctrl + Alt + Enter)

**Replace lần 2:**
- Find: `'http://localhost:3000'`
- Replace with: `environment.apiUrl`
- Click "Replace All"

4. **QUAN TRỌNG:** Sau khi replace, cần thêm import vào các file:
   - Mở mỗi file vừa được replace
   - Thêm dòng này vào đầu file (sau các import khác):
   ```typescript
   import { environment } from '../../environments/environment';
   ```

### Cách 2: Tự động bằng Git Bash (Nhanh)

```bash
# Mở Git Bash tại thư mục project và chạy:
find my_client/src/app -name "*.ts" -type f -exec sed -i "s|http://localhost:3000/api|\${environment.apiUrl}/api|g" {} +
find my_client/src/app -name "*.ts" -type f -exec sed -i "s|'http://localhost:3000'|environment.apiUrl|g" {} +
find my_admin/src/app -name "*.ts" -type f -exec sed -i "s|http://localhost:3000/api|\${environment.apiUrl}/api|g" {} +
find my_admin/src/app -name "*.ts" -type f -exec sed -i "s|'http://localhost:3000'|environment.apiUrl|g" {} +
```

## 🚀 BƯỚC 2: DEPLOY BACKEND LÊN RAILWAY

### 2.1. Đăng ký Railway

1. Truy cập: https://railway.app
2. Click **"Start a New Project"**
3. Đăng nhập bằng GitHub

### 2.2. Tạo Project mới

1. Click **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Authorize repository: `251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT`
4. Chọn repository này

### 2.3. Thêm MongoDB

1. Trong project, click **"+ New"**
2. Chọn **"Database"** → **"Add MongoDB"**
3. Railway tự động tạo database

### 2.4. Cấu hình Backend Service

1. Click vào service Backend
2. Vào tab **"Variables"**, thêm:

```
NODE_ENV=production
PORT=3000
DB_NAME=MediCare_database
JWT_SECRET=your_secret_key_here_change_this
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=*
```

3. Vào tab **"Settings"**:
   - **Root Directory**: để trống
   - **Start Command**: `cd backend && node server.js`
   - **Watch Paths**: `backend/**`

4. Vào **"Networking"** → **"Generate Domain"**

5. **LƯU LẠI URL** (ví dụ: `https://medicare-production.up.railway.app`)

### 2.5. Deploy

- Railway sẽ tự động deploy
- Xem logs ở tab "Deployments"

## 🌐 BƯỚC 3: DEPLOY CLIENT LÊN VERCEL

### 3.1. Cập nhật URL Backend

Mở file `my_client/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_URL'  // ⚠️ Thay bằng URL Railway của bạn
};
```

**VÍ DỤ:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://medicare-production.up.railway.app'
};
```

### 3.2. Commit và Push

```bash
git add .
git commit -m "Update for deployment"
git push
```

### 3.3. Deploy lên Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **"Add New Project"**
4. Chọn repository: `251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT`

5. Cấu hình:
   - **Project Name**: `medicare-client`
   - **Framework Preset**: `Other`
   - **Root Directory**: `my_client`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist/my_client/browser`
   - **Install Command**: `npm install`

6. Click **"Deploy"**

7. Đợi 2-3 phút, copy URL (ví dụ: `https://medicare-client.vercel.app`)

## 🔐 BƯỚC 4: DEPLOY ADMIN LÊN VERCEL

### 4.1. Cập nhật URL Backend

Mở file `my_admin/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_URL'  // URL Railway từ bước 2
};
```

### 4.2. Commit và Push

```bash
git add .
git commit -m "Update admin environment"
git push
```

### 4.3. Deploy Admin

1. Vào Vercel, click **"Add New Project"**
2. Chọn cùng repository
3. Cấu hình:
   - **Project Name**: `medicare-admin`
   - **Root Directory**: `my_admin`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist/my_admin/browser`

4. Click **"Deploy"**

## ⚙️ BƯỚC 5: CẬP NHẬT CORS

Sau khi có URL của Client và Admin:

1. Vào Railway → Backend service → Tab **"Variables"**
2. Sửa `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://medicare-client.vercel.app,https://medicare-admin.vercel.app
```

3. Backend sẽ tự restart

## ✅ HOÀN TẤT!

Website của bạn đã online:
- **Website**: `https://medicare-client.vercel.app`
- **Admin**: `https://medicare-admin.vercel.app`
- **API**: `https://medicare-production.up.railway.app`

## 🐛 KHẮC PHỤC LỖI

### Lỗi: "Cannot connect to backend"

1. Kiểm tra file `environment.prod.ts` có đúng URL không
2. Kiểm tra CORS trong Railway
3. Xem logs trong Railway

### Lỗi: "Database connection failed"

1. Vào Railway → MongoDB service
2. Copy URI
3. Thêm vào Backend Variables: `MONGODB_URI=<uri vừa copy>`

### Lỗi khi build

1. Xem logs trong Vercel
2. Thường do thiếu dependencies, chạy `npm install` local trước

## 📞 LIÊN HỆ

Nếu gặp khó khăn, hãy:
1. Xem logs trong Railway/Vercel
2. Kiểm tra lại các bước
3. Liên hệ team qua email

---

**Chúc bạn deploy thành công! 🎉**

