# 🔧 FIX LỖI VERCEL BUILD - "ng: command not found"

## ❌ LỖI GẶP PHẢI:

```
sh: line 1: ng: command not found
Error: Command "ng build" exited with 127
```

**Nguyên nhân:** Vercel đang cố chạy `ng build` trực tiếp nhưng Angular CLI không có trong PATH. Cần chạy qua npm script.

---

## ✅ GIẢI PHÁP:

### **1. Đã tạo file `vercel.json`**

Tôi đã tạo 2 file:
- ✅ `my_client/vercel.json`
- ✅ `my_admin/vercel.json`

### **2. Đã update build script**

Updated `package.json` để build production:
```json
"build": "ng build --configuration production"
```

### **3. Cấu hình Vercel Project**

**QUAN TRỌNG:** Trong Vercel UI, đảm bảo:

#### **For Client:**
```
Root Directory:    my_client
Build Command:     npm run build  ← PHẢI LÀ NPM RUN BUILD
Output Directory:  dist/my_client/browser
Install Command:   npm install
```

#### **For Admin:**
```
Root Directory:    my_admin
Build Command:     npm run build  ← PHẢI LÀ NPM RUN BUILD
Output Directory:  dist/my_admin/browser
Install Command:   npm install
```

**⚠️ KHÔNG DÙNG:**
- ❌ `ng build` (sẽ lỗi)
- ❌ `ng build --configuration production` (sẽ lỗi)

**✅ DÙNG:**
- ✅ `npm run build` (đúng!)

---

## 📋 CÁC BƯỚC FIX:

### **Bước 1: Commit & Push code mới**

```powershell
git add my_client/vercel.json my_admin/vercel.json
git add my_client/package.json my_admin/package.json
git commit -m "Fix: Add vercel.json and update build scripts for Vercel deployment"
git push
```

### **Bước 2: Update Vercel Project Settings**

#### **A. Client Project:**

1. Vào Vercel Dashboard
2. Click vào project **medicare-client**
3. Tab **"Settings"**
4. Scroll xuống **"Build & Development Settings"**
5. Update:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/my_client/browser`
   - **Install Command:** `npm install`
6. Click **"Save"**

#### **B. Admin Project:**

Làm tương tự:
- **Build Command:** `npm run build`
- **Output Directory:** `dist/my_admin/browser`

### **Bước 3: Redeploy**

1. Tab **"Deployments"**
2. Click **"Redeploy"** hoặc **"Deploy"**
3. Đợi build xong (~3-5 phút)

---

## 🔍 KIỂM TRA BUILD LOGS:

### **✅ Build thành công sẽ hiển thị:**

```
✓ Installing dependencies
✓ Running "npm run build"
✓ Building Angular application
✓ Compiled successfully
✓ Build completed
✓ Uploading build outputs
```

### **❌ Nếu vẫn lỗi:**

Kiểm tra:
1. Root Directory đúng chưa? (`my_client` hoặc `my_admin`)
2. Build Command có đúng `npm run build` không?
3. Output Directory có đúng format không?
4. File `vercel.json` có trong repo chưa?

---

## 💡 TẠI SAO PHẢI DÙNG `npm run build`?

### **Vấn đề:**
- `ng` command không có trong PATH của Vercel build environment
- Cần chạy qua npm script: `npm run build`
- npm script sẽ tự động tìm `ng` trong `node_modules/.bin/`

### **Giải pháp:**
```json
// package.json
{
  "scripts": {
    "build": "ng build --configuration production"
  },
  "devDependencies": {
    "@angular/cli": "^20.3.7"  // ← CLI ở đây
  }
}
```

Khi chạy `npm run build`:
1. npm install → Cài `@angular/cli` vào `node_modules`
2. npm run build → Tự động tìm `node_modules/.bin/ng`
3. Chạy `ng build --configuration production`

---

## 🎯 ALTERNATIVE: Nếu vẫn lỗi

### **Option 1: Dùng npx**

Thay `npm run build` bằng:
```
npx ng build --configuration production
```

### **Option 2: Install Angular CLI globally trong build**

Thêm vào `package.json`:
```json
{
  "scripts": {
    "build": "npm install -g @angular/cli && ng build --configuration production"
  }
}
```

**Nhưng cách này không khuyên dùng** vì chậm hơn.

---

## ✅ SAU KHI FIX:

1. ✅ Build thành công
2. ✅ Website deploy lên Vercel
3. ✅ URL hoạt động
4. ✅ API calls hoạt động

---

**Hãy update Vercel settings và redeploy! 🚀**

