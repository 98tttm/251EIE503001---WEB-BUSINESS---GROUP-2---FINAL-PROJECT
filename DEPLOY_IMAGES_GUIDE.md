# Hướng dẫn Deploy Ảnh lên Vercel

## Vấn đề hiện tại
Các ảnh trong folder `my_client/public/assets/images/` không hiển thị được trên Vercel sau khi deploy.

## Nguyên nhân
1. ✅ **Đã sửa**: Cấu hình Angular (`angular.json`) - thêm `"output": "/"`
2. ✅ **Đã sửa**: Cấu hình Vercel (`vercel.json`) - thêm headers cho static files
3. ⚠️ **Cần kiểm tra**: Các file ảnh có được commit vào Git không?

## Các bước để fix

### Bước 1: Kiểm tra file ảnh có trong Git không

```bash
# Kiểm tra xem ảnh có được track trong Git
git ls-files my_client/public/assets/images/

# Nếu không có output, nghĩa là ảnh chưa được commit
```

### Bước 2: Thêm ảnh vào Git (nếu chưa có)

```bash
# Thêm tất cả ảnh vào Git
git add my_client/public/assets/images/
git add my_admin/public/

# Kiểm tra lại
git status my_client/public/assets/
```

### Bước 3: Commit các thay đổi cấu hình

```bash
# Commit các file cấu hình đã sửa
git add my_client/angular.json
git add my_client/vercel.json
git add my_admin/angular.json
git add my_admin/vercel.json
git add backend/server.js
git add IMAGE_FIX_SUMMARY.md
git add my_client/verify-images.md

# Commit
git commit -m "Fix: Cấu hình hiển thị ảnh trên Vercel - Update Angular và Vercel configs"
```

### Bước 4: Push lên GitHub

```bash
# Push lên GitHub (Vercel sẽ tự động deploy)
git push origin main
```

### Bước 5: Kiểm tra trên Vercel

1. Vào Vercel Dashboard: https://vercel.com/dashboard
2. Chọn project "medicare"
3. Đợi deployment hoàn thành (thường mất 1-2 phút)
4. Kiểm tra logs để xem có lỗi không
5. Truy cập: `https://medicare.io.vn/assets/images/icon/logo_tròn.png`
   - Nếu thấy ảnh → ✅ Thành công
   - Nếu 404 → Kiểm tra lại Git và build logs

## Kiểm tra nhanh

### Local (sau khi build)
```bash
cd my_client
npm run build
# Kiểm tra xem ảnh có trong dist không
dir dist\my_client\browser\assets\images\icon\
```

### Production (sau khi deploy)
Truy cập các URL này trên browser:
- `https://medicare.io.vn/assets/images/icon/logo_tròn.png`
- `https://medicare.io.vn/assets/images/theme_banner/feature_banner1.webp`
- `https://medicare-seven-kappa.vercel.app/assets/images/icon/logo_tròn.png`

## Lưu ý quan trọng

1. **File ảnh PHẢI được commit vào Git**
   - Vercel build từ code trên GitHub
   - Nếu ảnh không có trong Git → Vercel không thể build được

2. **Kiểm tra .gitignore**
   - Đảm bảo không có rule nào ignore `public/assets/`
   - Hiện tại `.gitignore` không ignore folder này → OK

3. **Vercel tự động deploy**
   - Mỗi khi push lên `main` branch → Vercel tự động deploy
   - Không cần trigger manual

4. **Build logs**
   - Nếu vẫn lỗi, xem Build Logs trong Vercel
   - Tìm các dòng có "assets" hoặc "images"
   - Kiểm tra xem có lỗi copy file không

## Troubleshooting

### Vấn đề: Ảnh vẫn không hiển thị sau khi deploy

**Giải pháp:**
1. Kiểm tra Git: `git ls-files my_client/public/assets/images/icon/`
2. Nếu rỗng → Thêm vào Git: `git add my_client/public/assets/images/`
3. Commit và push lại
4. Đợi Vercel deploy xong
5. Hard refresh browser (Ctrl+F5)

### Vấn đề: Build thành công nhưng ảnh 404

**Giải pháp:**
1. Kiểm tra Build Logs trong Vercel
2. Tìm xem có copy assets không
3. Kiểm tra `vercel.json` có đúng không
4. Thử truy cập trực tiếp URL ảnh

### Vấn đề: Ảnh hiển thị local nhưng không hiển thị production

**Giải pháp:**
1. Đảm bảo đã commit ảnh vào Git
2. Kiểm tra `angular.json` có `"output": "/"` không
3. Rebuild và push lại

## Files đã thay đổi

- ✅ `my_client/angular.json` - Thêm `"output": "/"` vào assets
- ✅ `my_client/vercel.json` - Thêm headers cho static files
- ✅ `my_admin/angular.json` - Thêm `"output": "/"` vào assets  
- ✅ `my_admin/vercel.json` - Thêm headers cho static files
- ✅ `backend/server.js` - Cải thiện error handling và public image access

## Kết quả mong đợi

Sau khi hoàn thành các bước trên:
- ✅ Tất cả ảnh trong `public/assets/images/` hiển thị đúng trên production
- ✅ Ảnh có cache headers để tối ưu performance
- ✅ Ảnh có CORS headers để truy cập từ mọi domain
- ✅ Build logs không có lỗi về assets

