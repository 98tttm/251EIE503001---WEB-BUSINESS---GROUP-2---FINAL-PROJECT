# Hướng dẫn phát triển MediCare

## 1. Frontend

- **Tổ chức lại cấu trúc**: `src/components` chứa `header.html` và `footer.html` tái sử dụng; `src/html/index.html` giữ phần nội dung chính; `src/css` tách `global.css` (layout, component chung) và `home.css` (homepage); `src/js` có `componentLoader.js`, `slider.js`, `homepage.js`.
- **Cách nhúng component**: trong HTML đặt `<div data-component="header" data-src="../components/header.html"></div>` và script `homepage.js` sẽ tự tải component; cần chạy qua HTTP server (Express hoặc Vite preview) vì `fetch` không hoạt động với `file://`.
- **Tối ưu giao diện**:
  - Hero slider, USP, danh mục nổi bật, block sale, thiết bị y tế, góc sức khỏe và form newsletter đã được dựng sẵn, responsive đến mobile.
  - Các hình ảnh dùng `https://via.placeholder.com/...` để tránh lỗi hiển thị. Ghi chú `TODO` ngay trên từng phần để thay bằng banner/sản phẩm thực tế.
  - JS cung cấp mock data (`mockProducts`) và countdown mẫu. Thay bằng API thật bằng cách gọi `fetch('/api/products?...')` trong `hydrateProductSections`.
- **Build asset**: tạo script copy `src/css/*.css`, `src/js/*.js`, `src/html/*.html` sang `public/`; ví dụ dùng `npm-run-all` hoặc `gulp`. Trước mắt có thể dùng `npm scripts`:
  ```json
  "scripts": {
    "dev": "nodemon server/index.js",
    "copy:css": "cpx \"src/css/*.css\" public/css",
    "copy:js": "cpx \"src/js/*.js\" public/js",
    "copy:html": "cpx \"src/html/*.html\" public",
    "copy:components": "cpx \"src/components/*.html\" public/components",
    "build:static": "npm-run-all copy:*"
  }
  ```
  Khi deploy backend Express, cấu hình `app.use(express.static('public'))`.

- **Các bước tiếp theo**:
  1. Thay placeholder bằng banner thực tế (kích thước ghi chú trong file).
  2. Viết API thật cho danh sách sản phẩm, sale, bài viết và gọi từ `homepage.js`.
  3. Bổ sung animation nhẹ (Intersection Observer) nếu muốn tăng trải nghiệm.

## 2. Backend Node.js + MongoDB

### 2.1 Cấu trúc thư mục

```
server/
├─ app.js                # khởi tạo express app
├─ index.js              # điểm chạy (listen)
├─ config/
│  ├─ env.js             # đọc biến môi trường
│  ├─ database.js        # kết nối MongoDB (mongoose)
│  ├─ mailer.js          # cấu hình Nodemailer (Gmail OAuth2)
│  └─ redis.js           # kết nối Redis (lưu OTP)
├─ models/
│  └─ User.js
├─ routes/
│  ├─ index.js
│  └─ auth.routes.js
├─ controllers/
│  └─ auth.controller.js
├─ services/
│  ├─ otp.service.js
│  ├─ auth.service.js
│  └─ mail.service.js
├─ middlewares/
│  ├─ auth.js
│  ├─ validate.js
│  ├─ errorHandler.js
│  └─ rateLimiter.js
└─ utils/
   ├─ logger.js
   └─ response.js
```

### 2.2 Thư viện khuyến nghị

- `express`, `cors`, `helmet`, `compression`, `cookie-parser`.
- `mongoose` (models), `zod`/`joi` (validate), `jsonwebtoken` (JWT), `argon2` (hash).
- `nodemailer` + Gmail OAuth2 để gửi OTP (hoặc dịch vụ SendGrid, Mailgun).
- `express-rate-limit`, `express-mongo-sanitize`, `xss-clean` cho bảo mật.
- `redis` hoặc `ioredis` để lưu OTP, token tạm thời.
- `passport` + `passport-google-oauth20` cho đăng nhập Gmail (OAuth).
- `bull` hoặc `bullmq` nếu muốn queue gửi mail OTP.

### 2.3 Quy trình đăng nhập Gmail + OTP

1. **OAuth login**:
   - Tạo Google Cloud Project → OAuth consent → lấy `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
   - Backend tạo route `/api/auth/google` (redirect Google), `/api/auth/google/callback` (nhận code, lấy profile).
   - Khi nhận profile, kiểm tra user trong MongoDB, nếu chưa có thì tạo mới (lưu `googleId`, email).
2. **OTP xác thực email**:
   - `POST /api/auth/request-otp`: nhận email, tạo 6 số random (`Math.random().toString().slice(-6)`), lưu vào Redis với TTL 5 phút, gửi email bằng `nodemailer`.
   - `POST /api/auth/verify-otp`: nhận email + otp, đối chiếu Redis. Hợp lệ → phát hành JWT + refresh token, xóa OTP.
   - Lưu lịch sử OTP để chống spam (limit 5 OTP/giờ).
3. **Bảo vệ route**:
   - Middleware `auth.js` đọc `Authorization: Bearer <token>`, verify JWT, attach `req.user`.
   - Refresh token lưu trong HttpOnly cookie (`/api/auth/refresh`).

### 2.4 API chính cần có

- `/api/products`: filter theo danh mục, tìm kiếm, phân trang.
- `/api/categories`: danh sách danh mục (thần kinh, vitamin, thiết bị y tế...).
- `/api/articles`: bài viết góc sức khỏe, slug, tag.
- `/api/cart`: thêm/xóa sản phẩm, cập nhật số lượng.
- `/api/orders`: tạo đơn, tính phí ship, trạng thái.
- `/api/profile`: thông tin cá nhân, địa chỉ, đơn hàng.

### 2.5 Mongoose schema gợi ý

- `User`: email, name, phone, role, oauthProvider, oauthId, password hash (nếu đăng nhập thường), addresses.
- `Product`: name, slug, description, category, price, salePrice, thumbnails, inventory, attributes.
- `Category`: name, slug, parent, icon.
- `Article`: title, slug, excerpt, content (Markdown/HTML), tags, coverImage, author, publishedAt.
- `Order`: userId, items (productId, quantity, price), address, status, payment info.

## 3. Hạ tầng & DevOps

- **Docker**: `docker-compose.yml` nên gồm `node`, `mongo`, `redis`, `mailhog` (kiểm tra email OTP), `nginx` (reverse proxy).
- **Env mẫu** (`.env`):
  ```
  NODE_ENV=development
  PORT=4000
  CLIENT_ORIGIN=http://localhost:5173
  DATABASE_URL=mongodb://root:password@mongo:27017/medicare?authSource=admin
  REDIS_URL=redis://redis:6379
  JWT_SECRET=change-me
  JWT_REFRESH_SECRET=change-me-too
  OTP_EXPIRATION_MINUTES=5
  GOOGLE_CLIENT_ID=your-google-client-id
  GOOGLE_CLIENT_SECRET=your-google-client-secret
  GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
  SMTP_FROM="MediCare Pharmacy <no-reply@medicare.vn>"
  ```
  Không commit giá trị thật lên repo.

- **Quy trình deploy**:
  1. Build static (copy sang `public/`).
  2. `docker compose up --build`.
  3. Cấu hình Nginx HTTPS, CDN cho ảnh lớn.

## 4. Checklist tiếp theo

- [ ] Thay banner, category, article thumbnails bằng hình thực (ghi chú trong HTML).
- [ ] Viết API thật và thay mock data tại `src/js/homepage.js`.
- [ ] Bổ sung trang con: danh sách sản phẩm, chi tiết, giỏ hàng, checkout, account, góc sức khỏe.
- [ ] Hoàn thiện middleware bảo mật (rate limit OTP, audit log).
- [ ] Viết test (Jest/Supertest cho backend; Playwright/Cypress cho flow chính).
- [ ] Thiết lập CI/CD (GitHub Actions: lint, test, build Docker).
