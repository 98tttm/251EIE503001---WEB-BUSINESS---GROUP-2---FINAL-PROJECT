# ⚡ HƯỚNG DẪN DEPLOY NHANH (30 PHÚT)

## 🎯 TÓM TẮT KIẾN TRÚC

```
Database (Atlas) → Backend (Railway) → Frontend (Vercel)
     FREE             FREE ($5)           FREE
   [512MB]          [512MB RAM]       [Unlimited]
```

---

## 📋 CHECKLIST 5 BƯỚC

### ✅ BƯỚC 1: TỐI ƯU DATABASE (5 phút)

**Mở MongoDB Compass → Connect local → Chạy:**

```javascript
// Xóa field không cần thiết
use MediCare_database
db.blogs.updateMany({}, { $unset: { contentText: "", content: "" } })

// Chỉ giữ 15K bài mới nhất (nếu vẫn quá lớn)
db.blogs.deleteMany({ publishedAt: { $lt: ISODate("2023-01-01") } })
```

---

### ✅ BƯỚC 2: MONGODB ATLAS (10 phút)

1. **Tạo account:** https://www.mongodb.com/cloud/atlas/register
2. **Create cluster:** FREE M0 → Singapore → Create
3. **Network Access:** Allow `0.0.0.0/0`
4. **Database User:** 
   - Username: `medicare_admin`
   - Password: `Medicare2025!`
5. **Get Connection String:**
   ```
   mongodb+srv://medicare_admin:Medicare2025!@cluster.xxxxx.mongodb.net/
   ```
6. **Import data:**
   ```powershell
   mongorestore --uri="<connection_string>" --db=MediCare_database <backup_folder>
   ```

---

### ✅ BƯỚC 3: DEPLOY BACKEND (5 phút)

1. **Railway:** https://railway.app → Login GitHub
2. **New Project** → Deploy from GitHub → Chọn repo
3. **Settings:**
   - Root Directory: `backend`
4. **Variables:**
   ```
   MONGODB_URI=mongodb+srv://medicare_admin:Medicare2025!@cluster.xxxxx.mongodb.net/
   NODE_ENV=production
   DB_NAME=MediCare_database
   JWT_SECRET=your_secret_here
   ALLOWED_ORIGINS=*
   ```
5. **Generate Domain** → Copy URL

---

### ✅ BƯỚC 4: DEPLOY FRONTEND (8 phút)

**A. Update API URLs:**

`my_client/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_URL'
};
```

`my_admin/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR_RAILWAY_URL'
};
```

**Commit & Push:**
```powershell
git add .
git commit -m "Update production URLs"
git push
```

**B. Deploy to Vercel:**

**Client:**
```
Vercel → New Project → Import repo
Root Directory: my_client
Build: npm install && npm run build
Output: dist/my_client/browser
→ Deploy
```

**Admin:**
```
Vercel → New Project → Import same repo
Root Directory: my_admin
Build: npm install && npm run build
Output: dist/my_admin/browser
→ Deploy
```

---

### ✅ BƯỚC 5: CẬP NHẬT CORS (2 phút)

Railway Backend → Variables → Edit `ALLOWED_ORIGINS`:
```
https://medicare-client.vercel.app,https://medicare-admin.vercel.app
```

---

## 🎉 HOÀN TẤT!

| Service | URL | Status |
|---------|-----|--------|
| Backend | `https://medicare-xxx.up.railway.app` | ✅ |
| Client | `https://medicare-client.vercel.app` | ✅ |
| Admin | `https://medicare-admin.vercel.app` | ✅ |

---

## 🐛 LỖI THƯỜNG GẶP

### Lỗi: "Cannot connect to MongoDB"
→ Kiểm tra MONGODB_URI và Network Access (0.0.0.0/0)

### Lỗi: "CORS blocked"
→ Update ALLOWED_ORIGINS với URL Vercel chính xác

### Lỗi: "502 Bad Gateway"
→ Đợi 2-3 phút để service khởi động

---

## 💰 CHI PHÍ

- **Hoàn toàn MIỄN PHÍ** nếu database <512MB
- **~$10/tháng** nếu cần MongoDB Atlas M10 (10GB)

---

## 📚 TÀI LIỆU CHI TIẾT

Xem file: **`HUONG_DAN_DEPLOY_TOI_UU.md`**

