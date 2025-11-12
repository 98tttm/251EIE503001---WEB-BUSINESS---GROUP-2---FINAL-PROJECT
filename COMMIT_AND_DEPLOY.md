# Hướng dẫn Commit và Deploy lên Vercel

## Tình trạng hiện tại

✅ **Đã sửa xong:**
- `my_client/angular.json` - Cấu hình assets
- `my_client/vercel.json` - Headers cho static files
- `my_admin/angular.json` - Cấu hình assets
- `my_admin/vercel.json` - Headers cho static files
- `backend/server.js` - Cải thiện error handling

✅ **Ảnh đã có trong Git:**
- Các file trong `my_client/public/assets/images/` đã được track

## Các bước để deploy

### Bước 1: Kiểm tra các file đã thay đổi

```bash
git status
```

Bạn sẽ thấy các file:
- `M my_client/angular.json`
- `M my_client/vercel.json`
- `M my_admin/angular.json`
- `M my_admin/vercel.json`
- `M backend/server.js`
- `?? IMAGE_FIX_SUMMARY.md`
- `?? my_client/verify-images.md`
- `?? DEPLOY_IMAGES_GUIDE.md`

### Bước 2: Thêm tất cả các thay đổi vào staging

```bash
# Thêm các file cấu hình
git add my_client/angular.json
git add my_client/vercel.json
git add my_admin/angular.json
git add my_admin/vercel.json
git add backend/server.js

# Thêm các file tài liệu (optional)
git add IMAGE_FIX_SUMMARY.md
git add my_client/verify-images.md
git add DEPLOY_IMAGES_GUIDE.md
```

Hoặc thêm tất cả:
```bash
git add .
```

### Bước 3: Commit với message rõ ràng

```bash
git commit -m "Fix: Cấu hình hiển thị ảnh trên Vercel

- Update angular.json: Thêm output path cho assets
- Update vercel.json: Thêm headers cho static files (CORS, Cache)
- Cải thiện error handling trong backend
- Thêm tài liệu hướng dẫn deploy ảnh"
```

### Bước 4: Push lên GitHub

```bash
git push origin main
```

**Lưu ý:** 
- Nếu repo của bạn là `https://github.com/98tttm/MEDICARE.git` nhưng remote hiện tại trỏ đến repo khác, bạn có thể cần:
  ```bash
  # Kiểm tra remote hiện tại
  git remote -v
  
  # Nếu cần đổi remote
  git remote set-url origin https://github.com/98tttm/MEDICARE.git
  ```

### Bước 5: Kiểm tra Vercel tự động deploy

1. Vào https://vercel.com/dashboard
2. Chọn project "medicare"
3. Bạn sẽ thấy deployment mới đang chạy
4. Đợi khoảng 1-2 phút để build xong
5. Kiểm tra status:
   - ✅ "Ready" (màu xanh) = Thành công
   - ❌ "Error" (màu đỏ) = Có lỗi, xem logs

### Bước 6: Test trên production

Sau khi deploy xong, test các URL sau:

1. **Logo:**
   ```
   https://medicare.io.vn/assets/images/icon/logo_tròn.png
   ```

2. **Banner:**
   ```
   https://medicare.io.vn/assets/images/theme_banner/feature_banner1.webp
   ```

3. **Icon:**
   ```
   https://medicare.io.vn/assets/images/icon/user.png
   ```

4. **Bank logo:**
   ```
   https://medicare.io.vn/assets/images/bank/momo.png
   ```

Nếu các URL này hiển thị ảnh → ✅ **Thành công!**

## Kiểm tra Build Logs

Nếu vẫn có vấn đề, xem Build Logs trong Vercel:

1. Vào deployment mới nhất
2. Click "Build Logs"
3. Tìm các dòng có:
   - `assets` - Xem có copy assets không
   - `error` - Xem có lỗi gì không
   - `dist/my_client/browser/assets` - Xem có tạo folder assets không

## Troubleshooting

### Vấn đề: Push bị reject

**Giải pháp:**
```bash
# Pull code mới nhất trước
git pull origin main

# Resolve conflicts nếu có
# Sau đó push lại
git push origin main
```

### Vấn đề: Vercel không tự động deploy

**Giải pháp:**
1. Kiểm tra Vercel có connect với GitHub repo đúng không
2. Vào Vercel → Settings → Git
3. Đảm bảo repo là `98tttm/MEDICARE`
4. Nếu không, disconnect và reconnect lại

### Vấn đề: Build thành công nhưng ảnh vẫn 404

**Giải pháp:**
1. Kiểm tra Build Logs xem có copy assets không
2. Vào Vercel → Settings → General
3. Kiểm tra "Output Directory" là `dist/my_client/browser`
4. Thử hard refresh browser (Ctrl+F5)

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Code đã được push lên GitHub
- ✅ Vercel tự động deploy thành công
- ✅ Tất cả ảnh hiển thị đúng trên production
- ✅ Website chạy mượt mà không có lỗi 404 cho ảnh

## Liên kết hữu ích

- **GitHub Repo:** https://github.com/98tttm/MEDICARE
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Production URL:** https://medicare.io.vn
- **Vercel URL:** https://medicare-seven-kappa.vercel.app

