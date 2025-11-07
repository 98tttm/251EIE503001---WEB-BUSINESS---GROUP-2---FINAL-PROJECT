# 🔒 Hướng Dẫn Cấu Hình CORS cho Railway

## ✅ Thông tin hiện tại:
- **Backend URL**: `https://medicare-production-70ae.up.railway.app`
- **Client URL**: `https://medicare-seven-kappa.vercel.app`
- **Admin URL**: (Chưa deploy, sẽ cập nhật sau)

## 📋 Các bước cấu hình CORS trên Railway:

### Bước 1: Vào Railway Dashboard
1. Truy cập: https://railway.app
2. Đăng nhập vào tài khoản của bạn
3. Chọn project **medicare-production-70ae** (hoặc tên project backend của bạn)

### Bước 2: Thêm/Cập nhật biến môi trường ALLOWED_ORIGINS
1. Vào tab **Variables** (hoặc **Environment Variables**)
2. Tìm hoặc tạo biến mới với tên: `ALLOWED_ORIGINS`
3. Đặt giá trị:
   ```
   https://medicare-seven-kappa.vercel.app
   ```
   
   **Nếu có Admin URL, thêm vào như sau (phân cách bằng dấu phẩy, KHÔNG có khoảng trắng):**
   ```
   https://medicare-seven-kappa.vercel.app,https://your-admin-url.vercel.app
   ```

### Bước 3: Redeploy Backend
1. Sau khi cập nhật biến môi trường, Railway sẽ tự động redeploy
2. Hoặc vào tab **Deployments** → Chọn deployment mới nhất → **Redeploy**

### Bước 4: Kiểm tra
1. Mở website client: https://medicare-seven-kappa.vercel.app
2. Mở DevTools Console (F12)
3. Kiểm tra xem còn lỗi CORS không
4. Kiểm tra xem dữ liệu có load được không

## 🐛 Troubleshooting:

### Lỗi: "CORS blocked origin"
- **Nguyên nhân**: URL client chưa được thêm vào ALLOWED_ORIGINS
- **Giải pháp**: Kiểm tra lại biến ALLOWED_ORIGINS trên Railway, đảm bảo URL chính xác (có https://, không có dấu / ở cuối)

### Lỗi: "Failed to fetch"
- **Nguyên nhân 1**: Backend chưa khởi động
- **Giải pháp**: Kiểm tra logs trên Railway xem backend có đang chạy không

- **Nguyên nhân 2**: URL backend sai trong environment.prod.ts
- **Giải pháp**: Kiểm tra file `my_client/src/environments/environment.prod.ts` có đúng URL backend không

### Lỗi: "Network error"
- **Nguyên nhân**: CORS chưa được cấu hình đúng
- **Giải pháp**: Đảm bảo đã thêm đúng URL vào ALLOWED_ORIGINS và redeploy backend

## 📝 Lưu ý:
- **KHÔNG có khoảng trắng** giữa các URL trong ALLOWED_ORIGINS
- URL phải chính xác, bao gồm `https://` hoặc `http://`
- Sau khi cập nhật ALLOWED_ORIGINS, **bắt buộc phải redeploy** backend để áp dụng thay đổi
- Có thể kiểm tra logs trên Railway để xem CORS có block request nào không

## ✅ Checklist:
- [ ] Đã thêm biến ALLOWED_ORIGINS trên Railway
- [ ] Đã redeploy backend sau khi cập nhật
- [ ] Đã kiểm tra website client hoạt động
- [ ] Đã kiểm tra console không còn lỗi CORS
- [ ] Đã kiểm tra dữ liệu load được từ API

