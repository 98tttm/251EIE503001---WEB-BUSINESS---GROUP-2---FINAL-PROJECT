# 📊 Hướng Dẫn Kiểm Tra Metrics & Hiệu Suất Website

## 🎯 Tổng Quan

Bạn có thể kiểm tra hiệu suất website từ nhiều nguồn:
1. **Vercel Analytics** - Metrics cho Client & Admin (frontend)
2. **Railway Metrics** - Metrics cho Backend
3. **MongoDB Atlas** - Database performance
4. **Browser DevTools** - Performance analysis
5. **Google Analytics** - User analytics (nếu có)
6. **Lighthouse** - Performance audit

---

## 1. 📈 Vercel Analytics (Frontend)

### Truy cập:
1. Vào Vercel Dashboard: https://vercel.com
2. Chọn project (Client hoặc Admin)
3. Vào tab **Analytics**

### Metrics có sẵn:
- **Page Views**: Số lượt xem trang
- **Unique Visitors**: Số người dùng unique
- **Top Pages**: Trang được truy cập nhiều nhất
- **Top Referrers**: Nguồn traffic
- **Bounce Rate**: Tỷ lệ bounce
- **Load Time**: Thời gian load trang
- **Core Web Vitals**:
  - **LCP (Largest Contentful Paint)**: Thời gian load nội dung chính
  - **FID (First Input Delay)**: Độ trễ tương tác đầu tiên
  - **CLS (Cumulative Layout Shift)**: Độ ổn định layout

### Cách bật Vercel Analytics:
1. Vào project → **Settings** → **Analytics**
2. Bật **Web Analytics** (nếu chưa có)
3. Analytics sẽ tự động bắt đầu thu thập data

---

## 2. 🚂 Railway Metrics (Backend)

### Truy cập:
1. Vào Railway Dashboard: https://railway.app
2. Chọn backend project
3. Vào tab **Metrics**

### Metrics có sẵn:
- **CPU Usage**: % CPU sử dụng
- **Memory Usage**: RAM sử dụng
- **Network I/O**: Băng thông mạng
- **Request Rate**: Số request/giây
- **Response Time**: Thời gian phản hồi
- **Error Rate**: Tỷ lệ lỗi
- **Uptime**: Thời gian uptime

### Kiểm tra Logs:
1. Vào tab **Deployments**
2. Click vào deployment đang chạy
3. Vào tab **Logs**
4. Xem logs real-time:
   - Request logs
   - Error logs
   - CORS logs
   - Database connection logs

### Kiểm tra Deployment:
1. Vào tab **Deployments**
2. Xem lịch sử deployments
3. Kiểm tra:
   - Build time
   - Deploy time
   - Build logs
   - Deploy status

---

## 3. 🗄️ MongoDB Atlas Metrics

### Truy cập:
1. Vào MongoDB Atlas: https://cloud.mongodb.com
2. Chọn cluster của bạn
3. Vào tab **Metrics**

### Metrics có sẵn:
- **CPU Usage**: % CPU của cluster
- **Memory Usage**: RAM sử dụng
- **Disk I/O**: Tốc độ đọc/ghi disk
- **Network I/O**: Băng thông mạng
- **Connections**: Số kết nối hiện tại
- **Operations**: Số operations/giây
- **Query Performance**: Thời gian query
- **Index Usage**: Sử dụng indexes

### Kiểm tra Database Performance:
1. Vào tab **Performance Advisor**
2. Xem các đề xuất tối ưu:
   - Missing indexes
   - Slow queries
   - Unused indexes

### Kiểm tra Collections:
1. Vào tab **Collections**
2. Xem:
   - Số documents trong mỗi collection
   - Kích thước collection
   - Indexes trên mỗi collection

---

## 4. 🔍 Browser DevTools Performance

### Truy cập:
1. Mở website trong Chrome/Edge
2. Nhấn `F12` để mở DevTools
3. Vào tab **Performance**

### Cách sử dụng:
1. Click **Record** (nút tròn đỏ)
2. Thực hiện các thao tác trên website
3. Click **Stop** để dừng recording
4. Xem kết quả:
   - **FPS**: Frames per second
   - **Network**: Thời gian load resources
   - **Main Thread**: Thời gian xử lý JavaScript
   - **Scripting**: Thời gian chạy script
   - **Rendering**: Thời gian render
   - **Painting**: Thời gian vẽ

### Network Tab:
1. Vào tab **Network**
2. Reload trang
3. Xem:
   - **Request Time**: Thời gian request
   - **Response Time**: Thời gian response
   - **Waterfall**: Timeline của các requests
   - **Size**: Kích thước resources
   - **Status**: HTTP status codes

### Lighthouse (Performance Audit):
1. Vào tab **Lighthouse**
2. Chọn categories:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
3. Click **Analyze page load**
4. Xem kết quả:
   - **Performance Score**: Điểm hiệu suất (0-100)
   - **Core Web Vitals**
   - **Opportunities**: Cơ hội tối ưu
   - **Diagnostics**: Chẩn đoán vấn đề

---

## 5. 📱 Google Analytics (Nếu có)

### Truy cập:
1. Vào Google Analytics: https://analytics.google.com
2. Chọn property của bạn

### Metrics có sẵn:
- **Users**: Số người dùng
- **Sessions**: Số phiên
- **Page Views**: Số lượt xem trang
- **Bounce Rate**: Tỷ lệ bounce
- **Average Session Duration**: Thời gian phiên trung bình
- **Pages per Session**: Số trang/phiên
- **Traffic Sources**: Nguồn traffic
- **User Demographics**: Nhân khẩu học
- **Device Categories**: Loại thiết bị
- **Browser & OS**: Trình duyệt và OS

---

## 6. 🛠️ Các Công Cụ Kiểm Tra Khác

### 1. PageSpeed Insights (Google)
- **URL**: https://pagespeed.web.dev
- **Chức năng**: Đánh giá hiệu suất website
- **Metrics**: Performance, Accessibility, Best Practices, SEO
- **Cách dùng**: Nhập URL và click "Analyze"

### 2. GTmetrix
- **URL**: https://gtmetrix.com
- **Chức năng**: Phân tích hiệu suất website
- **Metrics**: PageSpeed, YSlow scores, Load time, Total page size
- **Cách dùng**: Nhập URL và click "Test your site"

### 3. WebPageTest
- **URL**: https://www.webpagetest.org
- **Chức năng**: Test hiệu suất từ nhiều locations
- **Metrics**: Load time, Speed Index, Waterfall chart
- **Cách dùng**: Nhập URL, chọn location, click "Start Test"

### 4. UptimeRobot (Monitor Uptime)
- **URL**: https://uptimerobot.com
- **Chức năng**: Monitor uptime của website
- **Metrics**: Uptime %, Response time, Status
- **Cách dùng**: Tạo account, thêm monitor cho URL

---

## 7. 📊 Metrics Quan Trọng Cần Theo Dõi

### Frontend Metrics:
- ✅ **Page Load Time**: < 3 giây
- ✅ **First Contentful Paint (FCP)**: < 1.8 giây
- ✅ **Largest Contentful Paint (LCP)**: < 2.5 giây
- ✅ **Time to Interactive (TTI)**: < 3.8 giây
- ✅ **First Input Delay (FID)**: < 100ms
- ✅ **Cumulative Layout Shift (CLS)**: < 0.1
- ✅ **Total Blocking Time (TBT)**: < 200ms

### Backend Metrics:
- ✅ **Response Time**: < 200ms (API calls)
- ✅ **Error Rate**: < 1%
- ✅ **Uptime**: > 99.9%
- ✅ **CPU Usage**: < 80%
- ✅ **Memory Usage**: < 80%
- ✅ **Database Query Time**: < 100ms

### Database Metrics:
- ✅ **Connection Pool Usage**: < 80%
- ✅ **Query Performance**: < 100ms
- ✅ **Index Usage**: > 90%
- ✅ **Disk I/O**: Không bị bottleneck

---

## 8. 🔔 Cách Thiết Lập Alerts

### Vercel Alerts:
1. Vào project → **Settings** → **Notifications**
2. Bật email notifications cho:
   - Deployment failures
   - Build failures
   - Domain issues

### Railway Alerts:
1. Vào project → **Settings** → **Notifications**
2. Bật alerts cho:
   - Deployment failures
   - High resource usage
   - Service crashes

### MongoDB Atlas Alerts:
1. Vào **Alerts** tab
2. Tạo alerts cho:
   - High CPU usage
   - High memory usage
   - Slow queries
   - Connection pool exhaustion

---

## 9. 📈 Dashboard Tổng Hợp

### Tạo Custom Dashboard:
1. **Grafana** (nếu cần):
   - Kết nối với Railway metrics
   - Tạo dashboard tùy chỉnh
   - Thiết lập alerts

2. **Datadog** (nếu cần):
   - Monitor toàn bộ stack
   - Tạo dashboards
   - Thiết lập alerts

---

## 10. 🎯 Kiểm Tra Nhanh Hiệu Suất

### Checklist Hàng Ngày:
- [ ] Vercel Analytics - Xem traffic và performance
- [ ] Railway Metrics - Kiểm tra CPU, Memory, Response time
- [ ] MongoDB Atlas - Kiểm tra query performance
- [ ] Browser DevTools - Test performance trên thực tế
- [ ] Lighthouse - Chạy audit performance

### Checklist Hàng Tuần:
- [ ] PageSpeed Insights - Kiểm tra performance score
- [ ] GTmetrix - So sánh với tuần trước
- [ ] Google Analytics - Xem user behavior
- [ ] Error logs - Kiểm tra lỗi thường xuyên
- [ ] Database indexes - Kiểm tra và tối ưu

---

## 📝 Ghi Chú:

- **Performance Budget**: Đặt mục tiêu cho từng metric
- **Regular Monitoring**: Kiểm tra metrics thường xuyên
- **Alert Setup**: Thiết lập alerts để được thông báo khi có vấn đề
- **Optimization**: Tối ưu dựa trên metrics thực tế

---

## 🔗 Links Hữu Ích:

- **Vercel Analytics**: https://vercel.com/analytics
- **Railway Metrics**: https://railway.app (Dashboard)
- **MongoDB Atlas**: https://cloud.mongodb.com
- **PageSpeed Insights**: https://pagespeed.web.dev
- **GTmetrix**: https://gtmetrix.com
- **WebPageTest**: https://www.webpagetest.org
- **Lighthouse**: Built-in Chrome DevTools

---

## ✅ Sau Khi Kiểm Tra:

1. **Xác định bottlenecks**: Tìm điểm nghẽn hiệu suất
2. **Tối ưu**: Tối ưu các phần chậm
3. **Monitor**: Theo dõi liên tục
4. **Improve**: Cải thiện dựa trên data thực tế

