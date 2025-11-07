# 1️⃣ Dùng image Node 18 (nhẹ, ổn định trên Railway)
FROM node:18-alpine

# 2️⃣ Tạo thư mục làm việc chính
WORKDIR /app/backend

# 3️⃣ Copy trước file package.json để tận dụng cache khi cài npm
COPY backend/package*.json ./

# 4️⃣ Cài dependencies
RUN npm install --omit=dev || npm install

# 5️⃣ Copy toàn bộ code backend vào image
COPY backend .

# 6️⃣ Expose cổng 3000 (Railway tự map env PORT)
EXPOSE 3000

# 7️⃣ Lệnh khởi chạy server
CMD ["node", "server.js"]
