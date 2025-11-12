# Hướng dẫn kiểm tra và sửa lỗi ảnh không hiển thị

## Vấn đề
Khi deploy lên production, các ảnh trong folder `public/assets/images/` không hiển thị được.

## Nguyên nhân
1. Các file ảnh không được commit vào Git
2. Cấu hình Angular không copy đúng assets khi build
3. Vercel không serve static files đúng cách

## Giải pháp đã áp dụng

### 1. Cập nhật `angular.json`
- Thêm `"output": "/"` vào cấu hình assets để đảm bảo file được copy vào đúng vị trí
- File từ `public/assets/images/...` sẽ được copy thành `dist/my_client/browser/assets/images/...`

### 2. Cập nhật `vercel.json`
- Thêm headers cho static files (ảnh, fonts, etc.)
- Thêm CORS headers để cho phép truy cập từ mọi domain
- Thêm cache headers để tối ưu hiệu năng

### 3. Kiểm tra Git
Đảm bảo các file ảnh được commit vào Git:
```bash
git add my_client/public/assets/
git commit -m "Add image assets"
git push
```

## Cách kiểm tra

### 1. Kiểm tra local sau khi build
```bash
cd my_client
npm run build
# Kiểm tra xem file có trong dist/my_client/browser/assets/images/ không
ls -la dist/my_client/browser/assets/images/
```

### 2. Kiểm tra trên Vercel
1. Deploy lại project lên Vercel
2. Truy cập: `https://your-domain.vercel.app/assets/images/icon/logo_tròn.png`
3. Nếu thấy ảnh, cấu hình đã đúng

### 3. Kiểm tra trong browser console
- Mở Developer Tools (F12)
- Vào tab Network
- Reload trang
- Tìm các request đến `/assets/images/...`
- Kiểm tra status code:
  - 200: OK
  - 404: File không tồn tại
  - 500: Server error

## Các đường dẫn ảnh trong code

### Static assets (từ public folder)
- Icons: `/assets/images/icon/...`
- Banners: `/assets/images/theme_banner/...`
- Bank logos: `/assets/images/bank/...`
- Blog images: `/assets/images/blog/...`

### Dynamic images (từ database/API)
- Product images: Từ API `/api/products/:id`
- User avatars: Từ API hoặc `/uploads/...`

## Lưu ý
- Các ảnh trong `public/assets/images/` phải được commit vào Git
- Sau khi thay đổi cấu hình, cần rebuild và redeploy
- Kiểm tra `.gitignore` để đảm bảo không ignore các file ảnh

