# ⚡ Kiểm Tra Nhanh Hiệu Suất Website

## 🎯 5 Phút Kiểm Tra Hàng Ngày

### 1. Vercel Analytics (1 phút)
```
1. Vào Vercel Dashboard → Chọn project
2. Vào tab "Analytics"
3. Kiểm tra:
   - Page Views (tăng/giảm?)
   - Load Time (bao nhiêu giây?)
   - Core Web Vitals (có màu đỏ không?)
```

### 2. Railway Metrics (1 phút)
```
1. Vào Railway Dashboard → Chọn backend project
2. Vào tab "Metrics"
3. Kiểm tra:
   - CPU Usage (< 80%?)
   - Memory Usage (< 80%?)
   - Response Time (< 200ms?)
   - Error Rate (< 1%?)
```

### 3. MongoDB Atlas (1 phút)
```
1. Vào MongoDB Atlas → Chọn cluster
2. Vào tab "Metrics"
3. Kiểm tra:
   - CPU Usage (< 80%?)
   - Memory Usage (< 80%?)
   - Connections (< 80%?)
   - Query Performance (có query chậm không?)
```

### 4. Browser DevTools (1 phút)
```
1. Mở website → F12
2. Vào tab "Network"
3. Reload trang
4. Kiểm tra:
   - Tổng thời gian load (< 3s?)
   - Số requests (< 100?)
   - Tổng kích thước (< 5MB?)
```

### 5. Test API (1 phút)
```
1. Mở: https://medicare-production-70ae.up.railway.app/api/health
2. Kiểm tra response time (< 200ms?)
3. Kiểm tra status: {"status": "OK"}
```

---

## 🔴 Red Flags (Cần Xử Lý Ngay)

- ❌ **CPU Usage > 90%** → Backend quá tải
- ❌ **Memory Usage > 90%** → Cần tối ưu memory
- ❌ **Response Time > 1s** → API chậm
- ❌ **Error Rate > 5%** → Có lỗi nghiêm trọng
- ❌ **Page Load Time > 5s** → Frontend chậm
- ❌ **LCP > 4s** → Nội dung load chậm
- ❌ **Database Query > 500ms** → Query chậm

---

## ✅ Green Flags (Hoạt động tốt)

- ✅ **CPU Usage < 50%** → Backend ổn định
- ✅ **Memory Usage < 50%** → Memory đủ
- ✅ **Response Time < 100ms** → API nhanh
- ✅ **Error Rate < 0.1%** → Ít lỗi
- ✅ **Page Load Time < 2s** → Frontend nhanh
- ✅ **LCP < 2s** → Nội dung load nhanh
- ✅ **Database Query < 50ms** → Query nhanh

---

## 📱 Quick Links

- **Client**: https://medicare-seven-kappa.vercel.app
- **Admin**: https://medicare-admin-mu.vercel.app
- **Backend Health**: https://medicare-production-70ae.up.railway.app/api/health
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com

