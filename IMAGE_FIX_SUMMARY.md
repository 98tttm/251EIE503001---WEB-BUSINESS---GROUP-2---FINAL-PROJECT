# Tóm tắt sửa lỗi hiển thị ảnh

## Vấn đề
Các ảnh trong folder `my_client/public/assets/images/` và `my_admin/public/` không hiển thị được sau khi deploy lên production.

## Nguyên nhân
1. Cấu hình Angular không chỉ định rõ output path cho assets
2. Vercel không có headers phù hợp để serve static files
3. Có thể các file ảnh chưa được commit vào Git

## Giải pháp đã áp dụng

### 1. Cập nhật `my_client/angular.json`
- Thêm `"output": "/"` vào cấu hình assets (cả build và test)
- Đảm bảo file từ `public/` được copy vào root của dist folder

### 2. Cập nhật `my_admin/angular.json`
- Tương tự như my_client, thêm `"output": "/"` vào cấu hình assets

### 3. Cập nhật `my_client/vercel.json`
- Thêm headers cho `/assets/*` và các file ảnh
- Thêm CORS headers (`Access-Control-Allow-Origin: *`)
- Thêm cache headers để tối ưu (`Cache-Control: public, max-age=31536000, immutable`)

### 4. Cập nhật `my_admin/vercel.json`
- Tương tự như my_client

## Các bước tiếp theo

### 1. Đảm bảo ảnh được commit vào Git
```bash
# Kiểm tra xem ảnh có được track không
git status my_client/public/assets/
git status my_admin/public/

# Nếu chưa, thêm vào Git
git add my_client/public/assets/
git add my_admin/public/
git commit -m "Add image assets for production"
git push
```

### 2. Rebuild và redeploy
```bash
# Rebuild client
cd my_client
npm run build

# Kiểm tra xem ảnh có trong dist không
ls dist/my_client/browser/assets/images/

# Sau đó push code và Vercel sẽ tự động deploy
git push
```

### 3. Kiểm tra sau khi deploy
1. Truy cập: `https://your-domain.vercel.app/assets/images/icon/logo_tròn.png`
2. Nếu thấy ảnh → thành công
3. Nếu 404 → kiểm tra lại:
   - File có trong Git không?
   - Build có thành công không?
   - Vercel có serve đúng folder không?

## Cấu trúc đường dẫn

### Local development
- File: `my_client/public/assets/images/icon/logo.png`
- URL: `http://localhost:4200/assets/images/icon/logo.png`

### Production (sau build)
- File: `dist/my_client/browser/assets/images/icon/logo.png`
- URL: `https://your-domain.vercel.app/assets/images/icon/logo.png`

## Lưu ý quan trọng
1. **Phải commit ảnh vào Git**: Các file trong `public/` phải được commit, không được ignore
2. **Kiểm tra .gitignore**: Đảm bảo không có rule nào ignore `public/assets/`
3. **Rebuild sau khi thay đổi**: Mỗi khi thay đổi cấu hình, cần rebuild và redeploy
4. **Kiểm tra Vercel logs**: Nếu vẫn lỗi, xem logs trong Vercel dashboard

## Files đã thay đổi
- ✅ `my_client/angular.json` - Cập nhật assets config
- ✅ `my_client/vercel.json` - Thêm headers cho static files
- ✅ `my_admin/angular.json` - Cập nhật assets config
- ✅ `my_admin/vercel.json` - Thêm headers cho static files
- ✅ `my_client/verify-images.md` - Tài liệu hướng dẫn

